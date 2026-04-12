import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const LEAGUE_ID = Number(process.env.SEASON_SUMMARY_LEAGUE_ID || 1233);
const API_BASE = String(process.env.SEASON_SUMMARY_API_BASE || "http://127.0.0.1:8787").trim().replace(/\/+$/, "");
const REFRESH_TOKEN = String(process.env.SEASON_SUMMARY_REFRESH_TOKEN || "").trim();
const CONCURRENCY = Math.max(1, Math.min(4, Number(process.env.SEASON_SUMMARY_CONCURRENCY || 2) || 2));

async function fetchJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.success === false) {
    throw new Error(data?.error || `${response.status} ${response.statusText}`);
  }
  return data;
}

async function fetchOfficialJson(pathname) {
  const response = await fetch(`https://nbafantasy.nba.com/api${pathname}`, { cache: "no-store" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${pathname} failed: ${response.status}`);
  }
  return data;
}

async function mapLimit(list, limit, fn) {
  const results = new Array(list.length);
  let index = 0;
  async function worker() {
    while (true) {
      const current = index++;
      if (current >= list.length) break;
      results[current] = await fn(list[current], current);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, list.length) }, () => worker()));
  return results;
}

async function fetchLeagueUids(leagueId) {
  const rows = [];
  const seen = new Set();
  for (let page = 1; page <= 20; page += 1) {
    const data = await fetchOfficialJson(`/leagues-classic/${leagueId}/standings/?phase=1&page_standings=${page}`);
    const standings = data?.standings || {};
    const results = Array.isArray(standings.results) ? standings.results : [];
    if (!results.length) break;
    let added = 0;
    for (const row of results) {
      const uid = String(Number(row?.entry || 0) || "").trim();
      if (!uid || seen.has(uid)) continue;
      seen.add(uid);
      rows.push({ uid, entry_name: row?.entry_name || "", player_name: row?.player_name || "" });
      added += 1;
    }
    if (standings.has_next === false || added === 0 || results.length < 50) break;
  }
  return rows;
}

function buildSummaryUrl(uid) {
  const url = new URL(`${API_BASE}/api/season-summary`);
  url.searchParams.set("uid", uid);
  url.searchParams.set("refresh", "1");
  url.searchParams.set("moments", "1");
  if (REFRESH_TOKEN) url.searchParams.set("token", REFRESH_TOKEN);
  return url.toString();
}

function toGeneratedModule(snapshotByUid, generatedAt) {
  return `export const SEASON_SUMMARY_BUNDLED_SNAPSHOT_GENERATED_AT = ${JSON.stringify(generatedAt)};\n\nexport const SEASON_SUMMARY_BUNDLED_SNAPSHOT_BY_UID = ${JSON.stringify(snapshotByUid, null, 2)};\n`;
}

async function main() {
  console.log(`Using season summary API base: ${API_BASE}`);
  const members = await fetchLeagueUids(LEAGUE_ID);
  if (!members.length) {
    throw new Error(`No members found for league ${LEAGUE_ID}`);
  }

  console.log(`Found ${members.length} league members. Building bundled season summary snapshot...`);
  const results = await mapLimit(members, CONCURRENCY, async (member, index) => {
    const payload = await fetchJson(buildSummaryUrl(member.uid));
    console.log(`[${index + 1}/${members.length}] ${member.uid} ${member.player_name || member.entry_name}`);
    return [member.uid, payload];
  });

  const snapshotByUid = Object.fromEntries(results);
  const generatedAt = new Date().toISOString();
  const snapshotDir = path.join(repoRoot, "artifacts", "season-summary-snapshots");
  const jsonPath = path.join(snapshotDir, `league-${LEAGUE_ID}-season-summary.snapshot.json`);
  const moduleDir = path.join(repoRoot, "worker", "src", "generated");
  const modulePath = path.join(moduleDir, "season-summary-snapshot.generated.js");

  await fs.mkdir(snapshotDir, { recursive: true });
  await fs.mkdir(moduleDir, { recursive: true });

  await fs.writeFile(
    jsonPath,
    JSON.stringify({
      generated_at: generatedAt,
      league_id: LEAGUE_ID,
      total_members: members.length,
      members,
      profiles_by_uid: snapshotByUid,
    }, null, 2),
    "utf8"
  );

  await fs.writeFile(modulePath, toGeneratedModule(snapshotByUid, generatedAt), "utf8");

  console.log(`Snapshot JSON written to ${jsonPath}`);
  console.log(`Worker bundled snapshot written to ${modulePath}`);
}

main().catch((error) => {
  console.error(error);
  if (String(error?.message || error || "").includes("fetch failed")) {
    console.error("\nHint:");
    console.error(`- Current API base: ${API_BASE}`);
    console.error("- If you want to use local worker, start it first and clear SEASON_SUMMARY_API_BASE.");
    console.error("- PowerShell clear current session var: Remove-Item Env:SEASON_SUMMARY_API_BASE -ErrorAction SilentlyContinue");
    console.error("- Then run from repo root: node scripts\\build-season-summary-snapshot.mjs");
  }
  process.exit(1);
});
