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
const UID_SOURCE_MODE = String(process.env.SEASON_SUMMARY_UID_SOURCE || "auto").trim().toLowerCase();
const UIDS_ENV_TEXT = String(process.env.SEASON_SUMMARY_UIDS || "").trim();
const UIDS_FILE_INPUT = String(process.env.SEASON_SUMMARY_UIDS_FILE || "").trim();
const DEFAULT_UIDS_FILE = path.join(repoRoot, "uids.md");

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

function normalizeUid(value) {
  const numeric = Number(String(value || "").trim());
  return numeric ? String(numeric) : "";
}

function parseUidLines(text) {
  const seen = new Set();
  const uids = [];
  const lines = String(text || "").split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.replace(/^\uFEFF/, "").trim();
    if (!line) continue;
    const normalizedLine = line
      .replace(/^[-*+]\s+/, "")
      .replace(/^>\s+/, "")
      .replace(/^`(.+)`$/, "$1")
      .trim();
    if (!/^\d+$/.test(normalizedLine)) continue;
    const uid = normalizeUid(normalizedLine);
    if (!uid || seen.has(uid)) continue;
    seen.add(uid);
    uids.push(uid);
  }
  return uids;
}

function parseUidText(text) {
  if (!text) return [];
  const compact = String(text)
    .replace(/,/g, "\n")
    .replace(/\s+/g, "\n");
  return parseUidLines(compact);
}

async function fileExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function loadUidMembersFromFile(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  const uids = parseUidLines(raw);
  if (!uids.length) {
    throw new Error(`No numeric UIDs found in ${filePath}`);
  }
  return {
    members: uids.map((uid) => ({ uid, entry_name: "", player_name: "" })),
    source: "file",
    source_label: filePath,
  };
}

function loadUidMembersFromEnv(uidText) {
  const uids = parseUidText(uidText);
  if (!uids.length) {
    throw new Error("SEASON_SUMMARY_UIDS did not contain any numeric UIDs");
  }
  return {
    members: uids.map((uid) => ({ uid, entry_name: "", player_name: "" })),
    source: "env",
    source_label: "SEASON_SUMMARY_UIDS",
  };
}

async function resolveSnapshotMembers() {
  if (UID_SOURCE_MODE === "env" || (UID_SOURCE_MODE === "auto" && UIDS_ENV_TEXT)) {
    return loadUidMembersFromEnv(UIDS_ENV_TEXT);
  }

  const configuredFilePath = UIDS_FILE_INPUT
    ? path.resolve(repoRoot, UIDS_FILE_INPUT)
    : DEFAULT_UIDS_FILE;
  const hasConfiguredFile = await fileExists(configuredFilePath);
  if (UID_SOURCE_MODE === "file" || (UID_SOURCE_MODE === "auto" && hasConfiguredFile)) {
    if (!hasConfiguredFile) {
      throw new Error(`UID file not found: ${configuredFilePath}`);
    }
    return loadUidMembersFromFile(configuredFilePath);
  }

  if (UID_SOURCE_MODE !== "auto" && UID_SOURCE_MODE !== "league") {
    throw new Error(`Unsupported SEASON_SUMMARY_UID_SOURCE: ${UID_SOURCE_MODE}`);
  }

  return {
    members: await fetchLeagueUids(LEAGUE_ID),
    source: "league",
    source_label: `league:${LEAGUE_ID}`,
  };
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

async function loadProgressSnapshot(progressPath, memberUidSet) {
  try {
    const raw = await fs.readFile(progressPath, "utf8");
    const parsed = JSON.parse(raw);
    const input = parsed?.profiles_by_uid && typeof parsed.profiles_by_uid === "object"
      ? parsed.profiles_by_uid
      : {};
    const snapshot = Object.fromEntries(
      Object.entries(input).filter(([uid, payload]) => memberUidSet.has(uid) && payload && typeof payload === "object")
    );
    return {
      exists: true,
      snapshot,
      completedCount: Object.keys(snapshot).length,
    };
  } catch (error) {
    if (error?.code === "ENOENT") {
      return {
        exists: false,
        snapshot: {},
        completedCount: 0,
      };
    }
    throw error;
  }
}

function buildSnapshotPayload({ generatedAt, members, source, sourceLabel, snapshotByUid, progress = false }) {
  return {
    generated_at: generatedAt,
    league_id: LEAGUE_ID,
    uid_source: source,
    uid_source_label: sourceLabel,
    total_members: members.length,
    completed_members: Object.keys(snapshotByUid).length,
    progress,
    members,
    profiles_by_uid: snapshotByUid,
  };
}

function createProgressWriter(progressPath, members, source, sourceLabel) {
  let writeChain = Promise.resolve();
  return {
    persist(snapshotByUid) {
      writeChain = writeChain.then(() =>
        fs.writeFile(
          progressPath,
          JSON.stringify(
            buildSnapshotPayload({
              generatedAt: new Date().toISOString(),
              members,
              source,
              sourceLabel,
              snapshotByUid,
              progress: true,
            }),
            null,
            2
          ),
          "utf8"
        )
      );
      return writeChain;
    },
    async flush() {
      await writeChain;
    },
  };
}

async function main() {
  console.log(`Using season summary API base: ${API_BASE}`);
  const { members, source, source_label: sourceLabel } = await resolveSnapshotMembers();
  if (!members.length) {
    throw new Error("No members found for season summary snapshot build");
  }

  const snapshotDir = path.join(repoRoot, "artifacts", "season-summary-snapshots");
  const jsonPath = path.join(snapshotDir, `league-${LEAGUE_ID}-season-summary.snapshot.json`);
  const progressPath = path.join(snapshotDir, `league-${LEAGUE_ID}-season-summary.progress.json`);
  const moduleDir = path.join(repoRoot, "worker", "src", "generated");
  const modulePath = path.join(moduleDir, "season-summary-snapshot.generated.js");
  const memberUidSet = new Set(members.map((member) => member.uid));

  await fs.mkdir(snapshotDir, { recursive: true });
  await fs.mkdir(moduleDir, { recursive: true });

  const progress = await loadProgressSnapshot(progressPath, memberUidSet);
  const snapshotByUid = { ...progress.snapshot };
  const pendingMembers = members.filter((member) => !snapshotByUid[member.uid]);

  console.log(`Using UID source: ${source} (${sourceLabel})`);
  console.log(`Found ${members.length} target UIDs. ${progress.completedCount ? `Resuming with ${progress.completedCount} completed and ${pendingMembers.length} pending...` : "Building bundled season summary snapshot..."}`);

  if (pendingMembers.length) {
    const progressWriter = createProgressWriter(progressPath, members, source, sourceLabel);
    await mapLimit(pendingMembers, CONCURRENCY, async (member, index) => {
      const payload = await fetchJson(buildSummaryUrl(member.uid));
      snapshotByUid[member.uid] = payload;
      await progressWriter.persist(snapshotByUid);
      console.log(`[${progress.completedCount + index + 1}/${members.length}] ${member.uid} ${member.player_name || member.entry_name}`);
    });
    await progressWriter.flush();
  }

  const orderedSnapshotByUid = Object.fromEntries(
    members
      .map((member) => [member.uid, snapshotByUid[member.uid]])
      .filter(([, payload]) => payload && typeof payload === "object")
  );
  const generatedAt = new Date().toISOString();

  await fs.writeFile(
    jsonPath,
    JSON.stringify(
      buildSnapshotPayload({
        generatedAt,
        members,
        source,
        sourceLabel,
        snapshotByUid: orderedSnapshotByUid,
      }),
      null,
      2
    ),
    "utf8"
  );

  await fs.writeFile(modulePath, toGeneratedModule(orderedSnapshotByUid, generatedAt), "utf8");
  await fs.rm(progressPath, { force: true });

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
