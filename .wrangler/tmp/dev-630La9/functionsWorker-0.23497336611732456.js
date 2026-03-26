var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/pages-0mOz8M/functionsWorker-0.23497336611732456.mjs
var __defProp2 = Object.defineProperty;
var __name2 = /* @__PURE__ */ __name((target, value) => __defProp2(target, "name", { value, configurable: true }), "__name");
var BASE_URL = "https://nbafantasy.nba.com/api";
var LEAGUE_ID = 1653;
var CACHE_KEY = "latest_state";
var CACHE_CURSOR_KEY = "refresh_cursor";
var UID_CHUNK_SIZE = 6;
var UID_LIST = [
  "5410",
  "3455",
  "32",
  "4319",
  "17",
  "2",
  "10",
  "14",
  "6",
  "189",
  "9",
  "4224",
  "22761",
  "4",
  "16447",
  "6562",
  "23",
  "11",
  "5101",
  "6441",
  "15",
  "5095",
  "5467",
  "6412",
  "8580",
  "42"
];
var DEBUG_UIDS = /* @__PURE__ */ new Set(["5095", "6412", "8580", "16447", "5467", "5410", "6441", "6562", "22761", "5101", "4319", "11", "23", "42"]);
var FDR_TOTAL_WEIGHT = 0.7;
var FDR_H2H_WEIGHT = 0.3;
var FDR_H2H_RANK_BY_UID = {
  "2": 1,
  "15": 2,
  "3455": 3,
  "4319": 4,
  "5095": 5,
  "17": 6,
  "10": 7,
  "14": 8,
  "6": 9,
  "5410": 10,
  "9": 11,
  "189": 12,
  "4224": 13,
  "5101": 14,
  "32": 15,
  "16447": 16,
  "6441": 17,
  "23": 18,
  "4": 19,
  "11": 20,
  "6412": 21,
  "22761": 22,
  "42": 23,
  "5467": 24,
  "6562": 25,
  "8580": 26
};
var H2H_BASE_STATS_BY_UID = {
  "2": { points: 49, played: 22, won: 16, draw: 1, lost: 5, scored: 27342, conceded: 25056 },
  "15": { points: 48, played: 22, won: 16, draw: 0, lost: 6, scored: 24182, conceded: 25293 },
  "3455": { points: 45, played: 22, won: 15, draw: 0, lost: 7, scored: 27902, conceded: 26220 },
  "4319": { points: 45, played: 22, won: 15, draw: 0, lost: 7, scored: 27532, conceded: 25862 },
  "5095": { points: 45, played: 22, won: 15, draw: 0, lost: 7, scored: 24714, conceded: 26281 },
  "17": { points: 43, played: 22, won: 14, draw: 1, lost: 7, scored: 27604, conceded: 24807 },
  "10": { points: 42, played: 22, won: 14, draw: 0, lost: 8, scored: 27218, conceded: 26355 },
  "14": { points: 42, played: 22, won: 14, draw: 0, lost: 8, scored: 27241, conceded: 26827 },
  "6": { points: 39, played: 22, won: 13, draw: 0, lost: 9, scored: 27e3, conceded: 26012 },
  "5410": { points: 36, played: 22, won: 12, draw: 0, lost: 10, scored: 27946, conceded: 26516 },
  "9": { points: 36, played: 22, won: 12, draw: 0, lost: 10, scored: 26668, conceded: 26116 },
  "189": { points: 36, played: 22, won: 12, draw: 0, lost: 10, scored: 26303, conceded: 26292 },
  "4224": { points: 33, played: 22, won: 11, draw: 0, lost: 11, scored: 26720, conceded: 26570 },
  "5101": { points: 33, played: 22, won: 11, draw: 0, lost: 11, scored: 25445, conceded: 25823 },
  "32": { points: 30, played: 22, won: 10, draw: 0, lost: 12, scored: 27902, conceded: 25879 },
  "16447": { points: 30, played: 22, won: 10, draw: 0, lost: 12, scored: 26362, conceded: 26585 },
  "6441": { points: 30, played: 22, won: 10, draw: 0, lost: 12, scored: 25028, conceded: 25519 },
  "23": { points: 27, played: 22, won: 9, draw: 0, lost: 13, scored: 26194, conceded: 26417 },
  "4": { points: 27, played: 22, won: 9, draw: 0, lost: 13, scored: 26513, conceded: 26939 },
  "11": { points: 24, played: 22, won: 8, draw: 0, lost: 14, scored: 26123, conceded: 27251 },
  "6412": { points: 24, played: 22, won: 8, draw: 0, lost: 14, scored: 24187, conceded: 25598 },
  "22761": { points: 21, played: 22, won: 7, draw: 0, lost: 15, scored: 26483, conceded: 26700 },
  "42": { points: 21, played: 22, won: 7, draw: 0, lost: 15, scored: 23754, conceded: 26087 },
  "5467": { points: 21, played: 22, won: 7, draw: 0, lost: 15, scored: 24690, conceded: 27188 },
  "6562": { points: 15, played: 22, won: 5, draw: 0, lost: 17, scored: 26210, conceded: 26321 },
  "8580": { points: 15, played: 22, won: 5, draw: 0, lost: 17, scored: 23798, conceded: 26547 }
};
var UID_MAP = {
  5410: "kusuri",
  3455: "Paul",
  32: "\u4F0D\u5BB6\u8F89",
  4319: "Kimi",
  17: "\u5821",
  2: "\u5927\u5409\u9C81",
  10: "\u5F17\u8001\u5927",
  14: "\u9178\u7537",
  6: "\u7D2B\u8471\u9171",
  189: "\u51EF\u6587",
  9: "\u96D5\u54E5",
  4224: "\u73ED\u73ED",
  22761: "\u7EAA\u5BFC",
  4: "\u5C3C\u5F1F",
  16447: "\u6587\u53F2\u54F2",
  6562: "\u67EF\u5357",
  23: "\u6A58\u961F",
  11: "\u8239\u54E5",
  5101: "\u9B3C\u55E8",
  6441: "\u9A6C\u54E5",
  15: "\u7B28\u7B28",
  5095: "AI",
  5467: "\u8001\u59DC",
  6412: "\u963F\u7518",
  8580: "\u5C0F\u706B\u9F99",
  42: "\u6851\u8FEA"
};
var ALL_FIXTURES = [
  [22, "5095", "22761"],
  [22, "10", "6562"],
  [22, "189", "2"],
  [22, "4319", "14"],
  [22, "5410", "5101"],
  [22, "6441", "6412"],
  [22, "3455", "5467"],
  [22, "42", "6"],
  [22, "32", "15"],
  [22, "17", "4224"],
  [22, "8580", "23"],
  [22, "4", "16447"],
  [22, "9", "11"],
  [23, "4", "9"],
  [23, "17", "16447"],
  [23, "3455", "15"],
  [23, "8580", "11"],
  [23, "10", "14"],
  [23, "5410", "5467"],
  [23, "6441", "6"],
  [23, "32", "23"],
  [23, "2", "22761"],
  [23, "5095", "6562"],
  [23, "42", "4224"],
  [23, "4319", "6412"],
  [23, "5101", "189"],
  [24, "4", "8580"],
  [24, "17", "9"],
  [24, "3455", "23"],
  [24, "16447", "42"],
  [24, "10", "6412"],
  [24, "5410", "15"],
  [24, "6441", "4224"],
  [24, "32", "11"],
  [24, "2", "5095"],
  [24, "4319", "6"],
  [24, "5101", "22761"],
  [24, "5467", "189"],
  [24, "14", "6562"],
  [25, "4", "32"],
  [25, "17", "8580"],
  [25, "9", "42"],
  [25, "3455", "11"],
  [25, "16447", "6441"],
  [25, "10", "6"],
  [25, "5410", "23"],
  [25, "2", "5101"],
  [25, "5095", "14"],
  [25, "15", "189"],
  [25, "4319", "4224"],
  [25, "22761", "5467"],
  [25, "6412", "6562"]
];
function normalizeUid(uid) {
  if (uid === null || uid === void 0) return "";
  return String(uid).trim();
}
__name(normalizeUid, "normalizeUid");
__name2(normalizeUid, "normalizeUid");
function uidToNumber(uid) {
  const normalized = normalizeUid(uid);
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}
__name(uidToNumber, "uidToNumber");
__name2(uidToNumber, "uidToNumber");
function getMapValueByUid(source, uid) {
  if (!source || typeof source !== "object") return null;
  const normalized = normalizeUid(uid);
  if (normalized in source) return source[normalized];
  const numeric = uidToNumber(normalized);
  if (numeric !== null && numeric in source) return source[numeric];
  return null;
}
__name(getMapValueByUid, "getMapValueByUid");
__name2(getMapValueByUid, "getMapValueByUid");
function isDebugUid(uid) {
  return DEBUG_UIDS.has(normalizeUid(uid));
}
__name(isDebugUid, "isDebugUid");
__name2(isDebugUid, "isDebugUid");
function summarizePlayersForDebug(players) {
  return (players || []).map((player) => ({
    element_id: player?.element_id ?? player?.id ?? null,
    name: player?.name || "",
    lineup_position: player?.lineup_position ?? null,
    position_name: player?.position_name || "",
    final_points: Number(player?.final_points || 0),
    is_effective: !!player?.is_effective
  }));
}
__name(summarizePlayersForDebug, "summarizePlayersForDebug");
__name2(summarizePlayersForDebug, "summarizePlayersForDebug");
function debugUid(stage, uid, payload) {
  if (!isDebugUid(uid)) return;
  let serialized = "";
  try {
    serialized = JSON.stringify(payload);
  } catch {
    serialized = String(payload);
  }
  console.log(`[uid-debug][${normalizeUid(uid)}][${stage}] ${serialized}`);
}
__name(debugUid, "debugUid");
__name2(debugUid, "debugUid");
function buildPreviousPicksByUid(previousState) {
  const currentShape = previousState?.picks_by_uid;
  if (currentShape && typeof currentShape === "object") {
    const normalized = {};
    for (const [uid, payload] of Object.entries(currentShape)) {
      normalized[normalizeUid(uid)] = payload;
    }
    return normalized;
  }
  const legacyUserPicks = previousState?.user_picks;
  const legacyStandings = previousState?.standings;
  const migrated = {};
  for (const uid of UID_LIST) {
    const standing = getMapValueByUid(legacyStandings, uid) || {};
    const players = getMapValueByUid(legacyUserPicks, uid) || standing?.picks || [];
    if (!standing || Object.keys(standing).length === 0 && (!Array.isArray(players) || players.length === 0)) {
      continue;
    }
    migrated[uid] = {
      uid: uidToNumber(uid),
      team_name: UID_MAP[uidToNumber(uid)],
      total_live: Number(standing?.today_live || 0),
      raw_total_live: Number(standing?.raw_today_live ?? standing?.today_live ?? 0),
      penalty_score: Number(standing?.penalty_score || 0),
      transfer_count: Number(standing?.transfer_count || 0),
      gd1_transfer_count: Number(standing?.gd1_transfer_count || 0),
      gd1_missing_penalty: Number(standing?.gd1_missing_penalty || 0),
      wildcard_active: !!standing?.wildcard_active,
      event_total: Number(standing?.total || 0),
      players: Array.isArray(players) ? players : []
    };
  }
  return migrated;
}
__name(buildPreviousPicksByUid, "buildPreviousPicksByUid");
__name2(buildPreviousPicksByUid, "buildPreviousPicksByUid");
function getFutureFixtureWeeks(currentWeek) {
  const availableWeeks = [...new Set(ALL_FIXTURES.map(([gw]) => Number(gw)))].sort((a, b) => a - b);
  const futureWeeks = availableWeeks.filter((week) => week >= Number(currentWeek || 0)).slice(0, 3);
  if (futureWeeks.length > 0) return futureWeeks;
  return availableWeeks.slice(-3);
}
__name(getFutureFixtureWeeks, "getFutureFixtureWeeks");
__name2(getFutureFixtureWeeks, "getFutureFixtureWeeks");
function buildFdrPayload({ standingsByUid = {}, currentWeek }) {
  const weeks = getFutureFixtureWeeks(currentWeek);
  const byUid = {};
  for (const [gw, uid1Raw, uid2Raw] of ALL_FIXTURES) {
    const uid1 = normalizeUid(uid1Raw);
    const uid2 = normalizeUid(uid2Raw);
    if (!byUid[uid1]) byUid[uid1] = {};
    if (!byUid[uid2]) byUid[uid2] = {};
    byUid[uid1][gw] = uid2;
    byUid[uid2][gw] = uid1;
  }
  const teams = UID_LIST.filter((uid) => byUid[uid]);
  const rankedByClassic = UID_LIST.filter((uid) => byUid[uid]).map((uid) => ({
    uid,
    name: UID_MAP[uidToNumber(uid)] || uid,
    classic_rank: Number(getMapValueByUid(standingsByUid, uid)?.classic_rank || 0),
    overall_total: Number(getMapValueByUid(standingsByUid, uid)?.overall_total || 0)
  })).sort((a, b) => {
    const aHasRank = a.classic_rank > 0;
    const bHasRank = b.classic_rank > 0;
    if (aHasRank && bHasRank) return a.classic_rank - b.classic_rank;
    if (aHasRank) return -1;
    if (bHasRank) return 1;
    return b.overall_total - a.overall_total;
  });
  const classicStrengthByUid = {};
  const classicDenom = Math.max(1, rankedByClassic.length - 1);
  rankedByClassic.forEach((item, idx) => {
    classicStrengthByUid[item.uid] = 1 - idx / classicDenom;
  });
  const rankedByH2h = Object.entries(FDR_H2H_RANK_BY_UID).map(([uid, rank]) => ({ uid: normalizeUid(uid), rank: Number(rank) })).filter((item) => item.uid && Number.isFinite(item.rank)).sort((a, b) => a.rank - b.rank);
  const h2hStrengthByUid = {};
  const h2hDenom = Math.max(1, rankedByH2h.length - 1);
  rankedByH2h.forEach((item, idx) => {
    h2hStrengthByUid[item.uid] = 1 - idx / h2hDenom;
  });
  const difficultyClass = /* @__PURE__ */ __name2((opponentUid) => {
    if (!opponentUid) return 3;
    const classicStrength = classicStrengthByUid[opponentUid] ?? 0.5;
    const h2hStrength = h2hStrengthByUid[opponentUid] ?? classicStrength;
    const weightedStrength = classicStrength * FDR_TOTAL_WEIGHT + h2hStrength * FDR_H2H_WEIGHT;
    if (weightedStrength < 0.2) return 1;
    if (weightedStrength < 0.4) return 2;
    if (weightedStrength < 0.6) return 3;
    if (weightedStrength < 0.8) return 4;
    return 5;
  }, "difficultyClass");
  const rows = teams.map((uid) => {
    const team = UID_MAP[uidToNumber(uid)] || uid;
    let sum = 0;
    let count = 0;
    const cells = weeks.map((gw) => {
      const opponentUid = byUid[uid]?.[gw] || "";
      const opponent = opponentUid ? UID_MAP[uidToNumber(opponentUid)] || opponentUid : "-";
      const cls = opponentUid ? difficultyClass(opponentUid) : 3;
      sum += cls;
      count += 1;
      return `<td><div class='box fdr-${cls}'>${opponent}</div></td>`;
    });
    const avgValue = Number((sum / Math.max(1, count)).toFixed(2));
    const avg = String(avgValue).replace(/\.00$/, "");
    return {
      uid,
      avgValue,
      html: `<tr><td class='t-name'>${team}</td>${cells.join("")}<td class='avg-col'>${avg}</td></tr>`
    };
  }).sort((a, b) => b.avgValue - a.avgValue || (UID_MAP[uidToNumber(a.uid)] || "").localeCompare(UID_MAP[uidToNumber(b.uid)] || ""));
  const html = rows.map((row) => row.html).join("");
  return {
    weeks,
    html,
    uses_h2h: rankedByH2h.length > 0,
    ranking_source: "entry_league_rank",
    weights: {
      total: FDR_TOTAL_WEIGHT,
      h2h: FDR_H2H_WEIGHT
    }
  };
}
__name(buildFdrPayload, "buildFdrPayload");
__name2(buildFdrPayload, "buildFdrPayload");
function formatKickoffBj(isoTime) {
  if (!isoTime) return "--:--";
  const dt = new Date(isoTime);
  if (Number.isNaN(dt.getTime())) return "--:--";
  return dt.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Shanghai"
  });
}
__name(formatKickoffBj, "formatKickoffBj");
__name2(formatKickoffBj, "formatKickoffBj");
function resolveFixtureStatus(fixture) {
  const kickoffMs = fixture?.kickoff_time ? new Date(fixture.kickoff_time).getTime() : null;
  const nowMs = Date.now();
  const finished = !!(fixture?.finished || fixture?.finished_provisional);
  if (finished) {
    return { code: "finished", label: "\u5DF2\u7ED3\u675F" };
  }
  if (fixture?.started) {
    if (Number.isFinite(kickoffMs) && nowMs - kickoffMs >= 5 * 60 * 60 * 1e3) {
      return { code: "finished", label: "\u5DF2\u7ED3\u675F" };
    }
    const minutes = Number(fixture?.minutes || 0);
    if (minutes > 0) {
      return { code: "live", label: `\u8FDB\u884C\u4E2D ${minutes}'` };
    }
    return { code: "live", label: "\u8FDB\u884C\u4E2D" };
  }
  return { code: "upcoming", label: "\u672A\u5F00\u59CB" };
}
__name(resolveFixtureStatus, "resolveFixtureStatus");
__name2(resolveFixtureStatus, "resolveFixtureStatus");
function topListFromMap(counter, limit = 10) {
  return [...counter.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([name, count]) => ({ name, count }));
}
__name(topListFromMap, "topListFromMap");
__name2(topListFromMap, "topListFromMap");
function buildTransferTrends({
  transfersByUid,
  leagueUids,
  currentWeek,
  eventMetaById,
  elements
}) {
  const pairCounter = /* @__PURE__ */ new Map();
  const inCounter = /* @__PURE__ */ new Map();
  const outCounter = /* @__PURE__ */ new Map();
  const managerCounter = /* @__PURE__ */ new Map();
  for (const uid of leagueUids || []) {
    const transfers = transfersByUid?.[uid] || [];
    let managerTransfers = 0;
    for (const transfer of transfers) {
      const { gw } = resolveTransferGwDay(transfer, eventMetaById);
      if (gw !== currentWeek) continue;
      managerTransfers += 1;
      const inId = Number(transfer?.element_in || 0);
      const outId = Number(transfer?.element_out || 0);
      const inName = elements[inId]?.name || `#${inId}`;
      const outName = elements[outId]?.name || `#${outId}`;
      const pair = `${outName} -> ${inName}`;
      pairCounter.set(pair, (pairCounter.get(pair) || 0) + 1);
      inCounter.set(inName, (inCounter.get(inName) || 0) + 1);
      outCounter.set(outName, (outCounter.get(outName) || 0) + 1);
    }
    if (managerTransfers > 0) {
      managerCounter.set(UID_MAP[uid] || String(uid), managerTransfers);
    }
  }
  const globalInCounter = /* @__PURE__ */ new Map();
  const globalOutCounter = /* @__PURE__ */ new Map();
  for (const elem of Object.values(elements)) {
    if (!elem) continue;
    const name = elem.name || "";
    const inCount = Number(elem.transfers_in_event || 0);
    const outCount = Number(elem.transfers_out_event || 0);
    if (inCount > 0) globalInCounter.set(name, inCount);
    if (outCount > 0) globalOutCounter.set(name, outCount);
  }
  const global = {
    // 全服目前无法获得逐笔“谁换谁”数据，这里展示当前 Event 的全服热门转入/转出。
    top_in: topListFromMap(globalInCounter, 10),
    top_out: topListFromMap(globalOutCounter, 10)
  };
  return {
    league: {
      top_pairs: topListFromMap(pairCounter, 10),
      top_in: topListFromMap(inCounter, 10),
      top_out: topListFromMap(outCounter, 10),
      top_managers: topListFromMap(managerCounter, 10)
    },
    global,
    overall: global
  };
}
__name(buildTransferTrends, "buildTransferTrends");
__name2(buildTransferTrends, "buildTransferTrends");
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "content-type,authorization"
    }
  });
}
__name(jsonResponse, "jsonResponse");
__name2(jsonResponse, "jsonResponse");
async function fetchJson(path, retries = 3) {
  let lastError = null;
  for (let i = 0; i <= retries; i += 1) {
    try {
      const res = await fetch(`${BASE_URL}${path}`, {
        headers: { "user-agent": "Mozilla/5.0" }
      });
      if (!res.ok) throw new Error(`fetch failed ${path}: ${res.status}`);
      return res.json();
    } catch (error) {
      lastError = error;
      if (i < retries) {
        await new Promise((resolve) => setTimeout(resolve, 250 * (i + 1)));
      }
    }
  }
  throw lastError || new Error(`fetch failed ${path}`);
}
__name(fetchJson, "fetchJson");
__name2(fetchJson, "fetchJson");
async function fetchJsonSafe(path, retries = 3) {
  try {
    const data = await fetchJson(path, retries);
    return { ok: true, data };
  } catch (error) {
    return { ok: false, data: null, error: String(error?.message || error || "fetch failed") };
  }
}
__name(fetchJsonSafe, "fetchJsonSafe");
__name2(fetchJsonSafe, "fetchJsonSafe");
async function fetchAllStandings(phase) {
  const rows = [];
  const seenEntries = /* @__PURE__ */ new Set();
  const targetPhase = Number(phase || 0) || 1;
  for (let page = 1; page <= 20; page += 1) {
    const data = await fetchJsonSafe(
      `/leagues-classic/${LEAGUE_ID}/standings/?phase=${targetPhase}&page_standings=${page}`,
      4
    );
    if (!data.ok) break;
    const standings = data.data?.standings || {};
    const results = Array.isArray(standings.results) ? standings.results : [];
    if (results.length === 0) break;
    let newRows = 0;
    for (const row of results) {
      const entry = Number(row?.entry);
      if (!entry || seenEntries.has(entry)) continue;
      seenEntries.add(entry);
      rows.push(row);
      newRows += 1;
    }
    if (standings.has_next === false || newRows === 0 || results.length < 50) {
      break;
    }
  }
  if (rows.length > 0) return rows;
  const fallback = await fetchJsonSafe(`/leagues-classic/${LEAGUE_ID}/standings/?phase=${targetPhase}`, 4);
  return Array.isArray(fallback.data?.standings?.results) ? fallback.data.standings.results : [];
}
__name(fetchAllStandings, "fetchAllStandings");
__name2(fetchAllStandings, "fetchAllStandings");
function extractGwNumber(value) {
  if (value === null || value === void 0) return null;
  const text = String(value);
  const match2 = text.match(/(\d+)/);
  return match2 ? Number(match2[1]) : null;
}
__name(extractGwNumber, "extractGwNumber");
__name2(extractGwNumber, "extractGwNumber");
function getCurrentEvent(events) {
  const current = events.find((e) => e.is_current);
  if (current) return [current.id, current.name || `GW${current.id}`];
  const firstUnfinished = events.find((e) => !e.finished);
  if (firstUnfinished) return [firstUnfinished.id, firstUnfinished.name || `GW${firstUnfinished.id}`];
  const last = events[events.length - 1];
  return [last?.id || 1, last?.name || "GW1"];
}
__name(getCurrentEvent, "getCurrentEvent");
__name2(getCurrentEvent, "getCurrentEvent");
function fantasyScore(stats) {
  return Math.floor(
    (stats?.points_scored || 0) * 1 + (stats?.rebounds || 0) * 1 + (stats?.assists || 0) * 2 + (stats?.steals || 0) * 3 + (stats?.blocks || 0) * 3
  );
}
__name(fantasyScore, "fantasyScore");
__name2(fantasyScore, "fantasyScore");
function parseInjuryStatus(elem) {
  if (!elem) return null;
  const status = String(elem.status || "").toLowerCase();
  if (!status || status === "a") return null;
  const news = String(elem.news || "").trim();
  if (news) {
    const lower = news.toLowerCase();
    if (lower.includes("expected")) {
      return news.slice(0, lower.indexOf("expected")).trim() || "OUT";
    }
    return news;
  }
  if (status === "u") return "Unavailable";
  if (status === "s") return "Suspended";
  return "OUT";
}
__name(parseInjuryStatus, "parseInjuryStatus");
__name2(parseInjuryStatus, "parseInjuryStatus");
function extractHistoryRecords(historyData) {
  if (!historyData || typeof historyData !== "object") return [];
  for (const key of ["history", "chips", "card_history", "cards", "events", "results"]) {
    if (Array.isArray(historyData[key])) return historyData[key];
  }
  return [];
}
__name(extractHistoryRecords, "extractHistoryRecords");
__name2(extractHistoryRecords, "extractHistoryRecords");
function parseEventMetaFromName(eventName) {
  const text = String(eventName || "");
  let match2 = text.match(/gameweek\s*(\d+)\s*-\s*day\s*(\d+)/i);
  if (match2) {
    return { gw: Number(match2[1]), day: Number(match2[2]) };
  }
  match2 = text.match(/(?:GW)?(\d+)\.(\d+)/i);
  if (match2) {
    return { gw: Number(match2[1]), day: Number(match2[2]) };
  }
  match2 = text.match(/(?:GW)?(\d+)[\s-]+day\s*(\d+)/i);
  if (match2) {
    return { gw: Number(match2[1]), day: Number(match2[2]) };
  }
  return { gw: extractGwNumber(text), day: null };
}
__name(parseEventMetaFromName, "parseEventMetaFromName");
__name2(parseEventMetaFromName, "parseEventMetaFromName");
function buildEventMetaById(events) {
  const map = {};
  for (const item of events || []) {
    const id = Number(item?.id);
    if (!id) continue;
    const meta = parseEventMetaFromName(item?.name || "");
    map[id] = {
      gw: meta.gw,
      day: meta.day,
      name: item?.name || ""
    };
  }
  return map;
}
__name(buildEventMetaById, "buildEventMetaById");
__name2(buildEventMetaById, "buildEventMetaById");
function resolveTransferGwDay(transfer, eventMetaById) {
  const eventId = Number(transfer?.event);
  const eventMeta = eventMetaById?.[eventId] || {};
  const gw = Number(transfer?.gw || transfer?.gameweek || eventMeta.gw || extractGwNumber(transfer?.event)) || null;
  let day = null;
  for (const key of ["day", "game_day", "gameday"]) {
    const value = transfer?.[key];
    if (value !== void 0 && value !== null) {
      day = Number(value);
      if (!Number.isNaN(day)) break;
    }
  }
  if (!day && eventMeta.day) day = Number(eventMeta.day);
  if (!day) {
    const ev = transfer?.event;
    if (typeof ev === "number") {
      const frac = ev - Math.trunc(ev);
      const parsed = Math.round(frac * 10);
      if (parsed > 0) day = parsed;
    } else if (typeof ev === "string" && ev.includes(".")) {
      const part = ev.split(".", 2)[1];
      const m = part.match(/(\d+)/);
      if (m) day = Number(m[1]);
    }
  }
  return { gw, day };
}
__name(resolveTransferGwDay, "resolveTransferGwDay");
__name2(resolveTransferGwDay, "resolveTransferGwDay");
function getWildcardDayFromHistory(historyData, currentGw, currentEvent, eventMetaById) {
  for (const item of extractHistoryRecords(historyData)) {
    const name = String(item?.name || "").toLowerCase();
    if (name !== "wildcard" && name !== "wild_card") continue;
    const itemEvent = item?.event;
    const eventMeta = eventMetaById?.[Number(itemEvent)] || {};
    const itemGw = item?.gw || item?.gameweek || eventMeta.gw || extractGwNumber(itemEvent);
    if (itemGw !== currentGw && itemEvent !== currentEvent) continue;
    const day = Number(eventMeta.day || item?.day || 0) || null;
    if (day) return day;
    if (Number(itemEvent) === Number(currentEvent)) {
      return Number(eventMetaById?.[Number(currentEvent)]?.day || 0) || null;
    }
  }
  return null;
}
__name(getWildcardDayFromHistory, "getWildcardDayFromHistory");
__name2(getWildcardDayFromHistory, "getWildcardDayFromHistory");
function getChipDayMapFromHistory(historyData, currentGw, currentEvent, eventMetaById) {
  const chipDayMap = {};
  for (const item of extractHistoryRecords(historyData)) {
    const rawName = String(item?.name || "").toLowerCase();
    if (!rawName) continue;
    const itemEvent = item?.event;
    const eventMeta = eventMetaById?.[Number(itemEvent)] || {};
    const itemGw = item?.gw || item?.gameweek || eventMeta.gw || extractGwNumber(itemEvent);
    if (itemGw !== currentGw && itemEvent !== currentEvent) continue;
    const day = Number(eventMeta.day || item?.day || 0) || null;
    if (!day) continue;
    chipDayMap[day] = rawName;
  }
  return chipDayMap;
}
__name(getChipDayMapFromHistory, "getChipDayMapFromHistory");
__name2(getChipDayMapFromHistory, "getChipDayMapFromHistory");
function calculateTransferPenalty(transferCount) {
  return Math.max(0, transferCount - 2) * 100;
}
__name(calculateTransferPenalty, "calculateTransferPenalty");
__name2(calculateTransferPenalty, "calculateTransferPenalty");
function calculateWeekScoresFromHistory(historyData, currentWeek, currentEvent, eventMetaById) {
  const rows = Array.isArray(historyData?.current) ? historyData.current : [];
  let weeklyPoints = 0;
  let todayPoints = null;
  let hasWeekRows = false;
  const pointsByDay = {};
  const transferCostByDay = {};
  const pointsByEvent = {};
  const transferCostByEvent = {};
  let currentEventTransferCost = 0;
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const eventId = Number(row.event);
    if (!eventId) continue;
    const points = Number(row.points || 0) / 10;
    const transferCost = Number(row.event_transfers_cost || 0) / 10;
    if (eventId === currentEvent) {
      todayPoints = Math.round(points);
      currentEventTransferCost = Math.round(transferCost);
    }
    const meta = eventMetaById?.[eventId];
    if (!meta || meta.gw !== currentWeek) continue;
    hasWeekRows = true;
    weeklyPoints += points;
    pointsByEvent[eventId] = Number((pointsByEvent[eventId] || 0) + points);
    transferCostByEvent[eventId] = Number((transferCostByEvent[eventId] || 0) + transferCost);
    const day = meta.day || 1;
    if (!pointsByDay[day]) pointsByDay[day] = 0;
    pointsByDay[day] += points;
    if (!transferCostByDay[day]) transferCostByDay[day] = 0;
    transferCostByDay[day] += transferCost;
  }
  return {
    has_week_rows: hasWeekRows,
    weekly_points: Math.round(weeklyPoints),
    today_points: todayPoints,
    points_by_day: pointsByDay,
    transfer_cost_by_day: transferCostByDay,
    points_by_event: pointsByEvent,
    transfer_cost_by_event: transferCostByEvent,
    current_event_transfer_cost: currentEventTransferCost
  };
}
__name(calculateWeekScoresFromHistory, "calculateWeekScoresFromHistory");
__name2(calculateWeekScoresFromHistory, "calculateWeekScoresFromHistory");
function getPlayerStats(elementId, liveElements, elements) {
  const live = liveElements[elementId];
  const elem = elements[elementId] || {};
  const stats = live?.stats || null;
  if (!stats) {
    const fallbackFantasy = Math.round(Number(elem.event_points || 0) / 10);
    return {
      points: 0,
      rebounds: 0,
      assists: 0,
      steals: 0,
      blocks: 0,
      minutes: 0,
      fantasy: fallbackFantasy
    };
  }
  return {
    points: Number(stats.points_scored || 0),
    rebounds: Number(stats.rebounds || 0),
    assists: Number(stats.assists || 0),
    steals: Number(stats.steals || 0),
    blocks: Number(stats.blocks || 0),
    minutes: Number(stats.minutes || 0),
    fantasy: fantasyScore(stats)
  };
}
__name(getPlayerStats, "getPlayerStats");
__name2(getPlayerStats, "getPlayerStats");
function buildTeamsPlayingToday(fixtures) {
  const teamIds = /* @__PURE__ */ new Set();
  for (const fixture of fixtures || []) {
    if (fixture?.team_h) teamIds.add(Number(fixture.team_h));
    if (fixture?.team_a) teamIds.add(Number(fixture.team_a));
  }
  return teamIds;
}
__name(buildTeamsPlayingToday, "buildTeamsPlayingToday");
__name2(buildTeamsPlayingToday, "buildTeamsPlayingToday");
function isPlayerAvailable(pick, teamsPlayingToday) {
  if (pick.injury) return false;
  if (pick.team_id && !teamsPlayingToday.has(Number(pick.team_id))) return false;
  return true;
}
__name(isPlayerAvailable, "isPlayerAvailable");
__name2(isPlayerAvailable, "isPlayerAvailable");
function calculateEffectiveScore(picks, teamsPlayingToday) {
  for (const p of picks) p.is_effective = false;
  const starters = picks.filter((p) => p.lineup_position <= 5).sort((a, b) => a.lineup_position - b.lineup_position);
  const bench = picks.filter((p) => p.lineup_position > 5).sort((a, b) => a.lineup_position - b.lineup_position);
  const selected = [];
  let bcCount = 0;
  let fcCount = 0;
  const addSelected = /* @__PURE__ */ __name2((pick) => {
    selected.push(pick);
    if (pick.position_type === 1) bcCount += 1;
    if (pick.position_type === 2) fcCount += 1;
  }, "addSelected");
  const allStartersAvailable = starters.length === 5 && starters.every((pick) => isPlayerAvailable(pick, teamsPlayingToday));
  if (allStartersAvailable) {
    for (const starter of starters) addSelected(starter);
  } else {
    for (const starter of starters) {
      if (!isPlayerAvailable(starter, teamsPlayingToday)) continue;
      addSelected(starter);
    }
    for (const reserve of bench) {
      if (selected.length >= 5) break;
      if (!isPlayerAvailable(reserve, teamsPlayingToday)) continue;
      if (reserve.position_type === 1 && bcCount >= 3) continue;
      if (reserve.position_type === 2 && fcCount >= 3) continue;
      addSelected(reserve);
    }
  }
  for (const pick of selected) pick.is_effective = true;
  const score = selected.reduce((sum, pick) => sum + Number(pick.final_points || 0), 0);
  const formation = `${bcCount}BC+${fcCount}FC`;
  return [Math.floor(score), selected, formation];
}
__name(calculateEffectiveScore, "calculateEffectiveScore");
__name2(calculateEffectiveScore, "calculateEffectiveScore");
function buildLeagueDailyAverages(picksByUid, teamsPlayingToday) {
  let totalTodayPlayers = 0;
  let totalAvailablePlayers = 0;
  for (const uid of UID_LIST) {
    const payload = picksByUid?.[uid];
    const players = Array.isArray(payload?.players) ? payload.players : [];
    totalTodayPlayers += players.filter((player) => Number(player?.team_id) && teamsPlayingToday.has(Number(player.team_id))).length;
    const projectedPlayers = players.map((player) => ({ ...player, is_effective: false }));
    const [, selected] = calculateEffectiveScore(projectedPlayers, teamsPlayingToday);
    totalAvailablePlayers += selected.length;
  }
  const managerCount = UID_LIST.length;
  const divisor = Math.max(1, managerCount);
  return {
    manager_count: managerCount,
    today_average_count: Number((totalTodayPlayers / divisor).toFixed(2)),
    effective_average_count: Number((totalAvailablePlayers / divisor).toFixed(2))
  };
}
__name(buildLeagueDailyAverages, "buildLeagueDailyAverages");
__name2(buildLeagueDailyAverages, "buildLeagueDailyAverages");
function buildWeeklyTransferSummary(transfers, currentGw, eventMetaById, elements, chipDayMap = {}) {
  const weeklyTransfers = [];
  for (const [index, transfer] of (transfers || []).entries()) {
    const { gw, day } = resolveTransferGwDay(transfer, eventMetaById);
    if (gw !== currentGw) continue;
    const inId = Number(transfer?.element_in || 0);
    const outId = Number(transfer?.element_out || 0);
    weeklyTransfers.push({
      index,
      day: Number(day || 0),
      event: Number(transfer?.event || 0),
      in_id: inId,
      out_id: outId,
      in_name: elements[inId]?.name || `#${inId}`,
      out_name: elements[outId]?.name || `#${outId}`
    });
  }
  weeklyTransfers.sort((a, b) => a.day - b.day || a.event - b.event || a.index - b.index);
  let nonWildcardTransferCount = 0;
  let gd1TransferCount = 0;
  let gd1MissingPenalty = 0;
  const records = weeklyTransfers.map((item) => {
    const chipName = chipDayMap[Number(item.day || 0)] || "";
    const isWildcardTransfer = chipName === "wildcard" || chipName === "wild_card";
    const isRichTransfer = chipName === "rich";
    const isChipTransfer = !!chipName;
    let costType = "FT";
    let isFree = true;
    if (isWildcardTransfer) {
      costType = "WC";
    } else if (isRichTransfer) {
      costType = "AS";
    } else {
      nonWildcardTransferCount += 1;
      if (Number(item.day || 0) === 1) gd1TransferCount += 1;
      isFree = nonWildcardTransferCount <= 2;
      costType = isFree ? "FT" : "-100";
    }
    return {
      day: item.day || null,
      day_label: item.day ? `DAY${item.day}` : "DAY?",
      move: `${item.out_name} -> ${item.in_name}`,
      out_name: item.out_name,
      in_name: item.in_name,
      cost_type: costType,
      is_free: isFree,
      is_wildcard: isWildcardTransfer,
      is_rich: isRichTransfer,
      is_chip: isChipTransfer
    };
  });
  gd1MissingPenalty = Math.max(0, gd1TransferCount - 2) * 100;
  return {
    records,
    total_transfer_count: weeklyTransfers.length,
    penalty_transfer_count: nonWildcardTransferCount,
    gd1_transfer_count: gd1TransferCount,
    gd1_missing_penalty: gd1MissingPenalty,
    penalty_score: calculateTransferPenalty(nonWildcardTransferCount)
  };
}
__name(buildWeeklyTransferSummary, "buildWeeklyTransferSummary");
__name2(buildWeeklyTransferSummary, "buildWeeklyTransferSummary");
function buildLineupEconomySummary(players) {
  const effectivePlayers = (players || []).filter((player) => player?.is_effective);
  const totalCost = effectivePlayers.reduce((sum, player) => {
    const multiplier = player?.is_captain && Number(player?.multiplier || 1) > 1 ? Number(player.multiplier || 1) : 1;
    return sum + Number(player?.now_cost || 0) * multiplier;
  }, 0) / 10;
  const totalPoints = effectivePlayers.reduce((sum, player) => sum + Number(player?.final_points || 0), 0);
  const breakeven = totalCost * 3;
  let status = "\u52C9\u5F3A\u56DE\u672C";
  if (totalPoints < breakeven - 20) {
    status = "\u8840\u672C\u65E0\u5F52\uFF01";
  } else if (totalPoints > breakeven + 20) {
    status = "\u5927\u7206\u7EAF\u8D5A";
  }
  return {
    effective_total_cost: Number(totalCost.toFixed(1)),
    breakeven_line: Number(breakeven.toFixed(1)),
    effective_total_points: Number(totalPoints.toFixed(1)),
    status
  };
}
__name(buildLineupEconomySummary, "buildLineupEconomySummary");
__name2(buildLineupEconomySummary, "buildLineupEconomySummary");
function getCaptainChipEvent(historyData, currentGw, currentEvent, eventMetaById) {
  for (const item of extractHistoryRecords(historyData)) {
    const name = String(item?.name || "").toLowerCase();
    if (name !== "phcapt") continue;
    const itemEvent = Number(item?.event || 0);
    const eventMeta = eventMetaById?.[itemEvent] || {};
    const itemGw = item?.gw || item?.gameweek || eventMeta.gw || extractGwNumber(itemEvent);
    if (itemGw !== currentGw && itemEvent !== currentEvent) continue;
    return {
      event: itemEvent,
      day: Number(eventMeta.day || item?.day || 0) || null
    };
  }
  return null;
}
__name(getCaptainChipEvent, "getCaptainChipEvent");
__name2(getCaptainChipEvent, "getCaptainChipEvent");
async function buildCaptainUsageSummary(uidNumber, historyData, currentGw, currentEvent, eventMetaById, elements, eventLiveCache) {
  const chipEvent = getCaptainChipEvent(historyData, currentGw, currentEvent, eventMetaById);
  if (!chipEvent?.event) {
    return {
      used: false,
      label: "None",
      day: null,
      captain_name: null,
      captain_points: null
    };
  }
  const picksRes = await fetchJsonSafe(`/entry/${uidNumber}/event/${chipEvent.event}/picks/`, 4);
  const picks = Array.isArray(picksRes.data?.picks) ? picksRes.data.picks : [];
  const captainPick = picks.find((pick) => pick?.is_captain);
  if (!captainPick) {
    return {
      used: true,
      label: chipEvent.day ? `DAY${chipEvent.day}: None` : "Used",
      day: chipEvent.day,
      captain_name: null,
      captain_points: null
    };
  }
  if (!eventLiveCache[chipEvent.event]) {
    const liveRes = await fetchJsonSafe(`/event/${chipEvent.event}/live/`, 4);
    const rawElements = liveRes.ok ? liveRes.data?.elements : null;
    const liveElements = {};
    if (Array.isArray(rawElements)) {
      for (const item of rawElements) liveElements[item.id] = item;
    } else if (rawElements && typeof rawElements === "object") {
      for (const [k, v] of Object.entries(rawElements)) liveElements[Number(k)] = v;
    }
    eventLiveCache[chipEvent.event] = liveElements;
  }
  const elementId = Number(captainPick.element || 0);
  const elem = elements[elementId] || {};
  const stats = getPlayerStats(elementId, eventLiveCache[chipEvent.event] || {}, elements);
  const finalPoints = Number(stats.fantasy || 0) * Number(captainPick.multiplier || 1);
  const dayLabel = chipEvent.day ? `DAY${chipEvent.day}` : "DAY?";
  return {
    used: true,
    label: `${dayLabel}: ${elem.name || `#${elementId}`} ${finalPoints}`,
    day: chipEvent.day,
    captain_name: elem.name || `#${elementId}`,
    captain_points: finalPoints
  };
}
__name(buildCaptainUsageSummary, "buildCaptainUsageSummary");
__name2(buildCaptainUsageSummary, "buildCaptainUsageSummary");
function buildWeekEventIds(events, currentWeek, currentEvent) {
  return (events || []).filter((event) => {
    const meta = parseEventMetaFromName(event?.name || "");
    return Number(meta.gw || 0) === Number(currentWeek || 0);
  }).map((event) => Number(event.id)).filter((eventId) => eventId > Number(currentEvent || 0)).sort((a, b) => a - b);
}
__name(buildWeekEventIds, "buildWeekEventIds");
__name2(buildWeekEventIds, "buildWeekEventIds");
function getProjectedPlayerScore(player) {
  const formValue = Number(player?.form || 0) / 10;
  const ppgValue = Number(player?.points_per_game || 0) / 10;
  const nextValue = Number(player?.ep_next || 0) / 10;
  const projected = formValue > 0 ? formValue : ppgValue > 0 ? ppgValue : nextValue;
  return Number(projected.toFixed(1));
}
__name(getProjectedPlayerScore, "getProjectedPlayerScore");
__name2(getProjectedPlayerScore, "getProjectedPlayerScore");
function computeWeekTotalFromHistory(historyWeek, currentEvent, todayScore, gd1MissingPenalty) {
  if (!historyWeek?.has_week_rows) return null;
  const currentEventId = Number(currentEvent || 0);
  const currentEventPoints = Number(historyWeek.points_by_event?.[currentEventId] || 0);
  const settledPoints = Number(historyWeek.weekly_points || 0) - currentEventPoints;
  let settledTransferCost = 0;
  for (const [rawEventId, rawCost] of Object.entries(historyWeek.transfer_cost_by_event || {})) {
    const eventId = Number(rawEventId || 0);
    if (!eventId || eventId === currentEventId) continue;
    settledTransferCost += Number(rawCost || 0);
  }
  const todayTransferCost = Number(historyWeek.current_event_transfer_cost || historyWeek.transfer_cost_by_event?.[currentEventId] || 0);
  const recordedDay1Cost = Number(historyWeek.transfer_cost_by_day?.[1] || 0);
  const manualDay1Penalty = recordedDay1Cost > 0 ? 0 : Number(gd1MissingPenalty || 0);
  const total = settledPoints + Number(todayScore || 0) - settledTransferCost - todayTransferCost - manualDay1Penalty;
  return Math.max(0, Math.round(total));
}
__name(computeWeekTotalFromHistory, "computeWeekTotalFromHistory");
__name2(computeWeekTotalFromHistory, "computeWeekTotalFromHistory");
function calculateProjectedFutureScore(players, futureTeamsByEvent) {
  let total = 0;
  let bestCaptainCandidate = 0;
  let projectedSlots = 0;
  for (const teamSet of futureTeamsByEvent) {
    const simulated = (players || []).map((player) => ({
      ...player,
      final_points: Number(player?.projected_points || 0),
      is_effective: false
    }));
    const [score, selected] = calculateEffectiveScore(simulated, teamSet);
    total += Number(score || 0);
    projectedSlots += selected.length;
    for (const player of selected) {
      bestCaptainCandidate = Math.max(bestCaptainCandidate, Number(player.final_points || 0));
    }
  }
  return {
    projected_future_score: Number(total.toFixed(1)),
    projected_slots: projectedSlots,
    best_captain_candidate: Number(bestCaptainCandidate.toFixed(1))
  };
}
__name(calculateProjectedFutureScore, "calculateProjectedFutureScore");
__name2(calculateProjectedFutureScore, "calculateProjectedFutureScore");
function buildManagerProjectionSummary(payload, futureTeamsByEvent) {
  const players = Array.isArray(payload?.players) ? payload.players : [];
  const projectedPlayers = players.map((player) => ({
    ...player,
    projected_points: getProjectedPlayerScore(player)
  }));
  const futureSummary = calculateProjectedFutureScore(projectedPlayers, futureTeamsByEvent);
  const captainUsed = payload?.captain_used || {};
  const captainBonus = !captainUsed.used && futureSummary.best_captain_candidate > 0 ? futureSummary.best_captain_candidate : 0;
  const remainingFt = Math.max(0, 2 - Number(payload?.penalty_transfer_count || 0));
  const ftBonus = Number((remainingFt * 4).toFixed(1));
  const expectedTotal = Number((Number(payload?.event_total || 0) + Number(futureSummary.projected_future_score || 0) + captainBonus + ftBonus).toFixed(1));
  return {
    projected_future_score: Number(futureSummary.projected_future_score || 0),
    projected_slots: Number(futureSummary.projected_slots || 0),
    best_captain_candidate: Number(futureSummary.best_captain_candidate || 0),
    captain_bonus: captainBonus,
    remaining_ft: remainingFt,
    ft_bonus: ftBonus,
    expected_total: expectedTotal
  };
}
__name(buildManagerProjectionSummary, "buildManagerProjectionSummary");
__name2(buildManagerProjectionSummary, "buildManagerProjectionSummary");
function buildWinProbabilitySummary(left, right) {
  const diff = Number(left.expected_total || 0) - Number(right.expected_total || 0);
  const scale = 18;
  const leftProb = 1 / (1 + Math.exp(-diff / scale));
  const leftPct = Math.max(1, Math.min(99, Math.round(leftProb * 100)));
  const rightPct = 100 - leftPct;
  return {
    left: leftPct,
    right: rightPct
  };
}
__name(buildWinProbabilitySummary, "buildWinProbabilitySummary");
__name2(buildWinProbabilitySummary, "buildWinProbabilitySummary");
function buildOwnershipSummary(picksByUid) {
  const holderMap = {};
  const managerCount = UID_LIST.length;
  for (const uid of UID_LIST) {
    const players = Array.isArray(picksByUid?.[uid]?.players) ? picksByUid[uid].players : [];
    const seen = /* @__PURE__ */ new Set();
    for (const player of players) {
      const elementId = Number(player?.element_id || 0);
      if (!elementId || seen.has(elementId)) continue;
      seen.add(elementId);
      if (!holderMap[elementId]) {
        holderMap[elementId] = {
          element_id: elementId,
          name: player?.name || `#${elementId}`,
          holder_count: 0
        };
      }
      holderMap[elementId].holder_count += 1;
    }
  }
  const top20 = Object.values(holderMap).map((item) => ({
    ...item,
    ownership_percent: Number((item.holder_count / Math.max(1, managerCount) * 100).toFixed(1))
  })).sort((a, b) => b.ownership_percent - a.ownership_percent || b.holder_count - a.holder_count || a.name.localeCompare(b.name)).slice(0, 20);
  return {
    by_element: holderMap,
    top20,
    manager_count: managerCount
  };
}
__name(buildOwnershipSummary, "buildOwnershipSummary");
__name2(buildOwnershipSummary, "buildOwnershipSummary");
function buildClassicRankingsPayload(overallRows, weeklyRows, currentWeek, weeklyPhase) {
  const overallByUid = {};
  const weeklyByUid = {};
  for (const row of overallRows || []) {
    const uid = normalizeUid(row?.entry);
    if (!uid) continue;
    overallByUid[uid] = row;
  }
  for (const row of weeklyRows || []) {
    const uid = normalizeUid(row?.entry);
    if (!uid) continue;
    weeklyByUid[uid] = row;
  }
  return UID_LIST.map((uid) => {
    const overall = overallByUid[uid] || {};
    const weekly = weeklyByUid[uid] || {};
    return {
      uid: uidToNumber(uid),
      team_name: UID_MAP[uidToNumber(uid)] || uid,
      overall_rank: Number(overall.rank || 0) || null,
      overall_score: overall.entry ? Math.round(Number(overall.total || 0) / 10) : null,
      weekly_rank: Number(weekly.rank || 0) || null,
      weekly_score: weekly.entry ? Math.round(Number(weekly.total || 0) / 10) : null,
      current_week: Number(currentWeek || 0) || null,
      weekly_phase: Number(weeklyPhase || 0) || null
    };
  }).sort((a, b) => {
    const aRank = Number.isFinite(Number(a.overall_rank)) && Number(a.overall_rank) > 0 ? Number(a.overall_rank) : Number.MAX_SAFE_INTEGER;
    const bRank = Number.isFinite(Number(b.overall_rank)) && Number(b.overall_rank) > 0 ? Number(b.overall_rank) : Number.MAX_SAFE_INTEGER;
    return aRank - bRank || a.team_name.localeCompare(b.team_name);
  });
}
__name(buildClassicRankingsPayload, "buildClassicRankingsPayload");
__name2(buildClassicRankingsPayload, "buildClassicRankingsPayload");
function buildLiveH2HStandings(baseStatsByUid, liveMatches) {
  const table = {};
  for (const uid of UID_LIST) {
    const base = baseStatsByUid[uid] || { points: 0, played: 0, won: 0, draw: 0, lost: 0, scored: 0, conceded: 0 };
    table[uid] = {
      uid: uidToNumber(uid),
      team_name: UID_MAP[uidToNumber(uid)] || uid,
      points: Number(base.points || 0),
      played: Number(base.played || 0),
      won: Number(base.won || 0),
      draw: Number(base.draw || 0),
      lost: Number(base.lost || 0),
      scored: Number(base.scored || 0),
      conceded: Number(base.conceded || 0),
      live_applied: false
    };
  }
  for (const match2 of liveMatches || []) {
    const left = table[normalizeUid(match2.uid1)];
    const right = table[normalizeUid(match2.uid2)];
    if (!left || !right) continue;
    left.played += 1;
    right.played += 1;
    left.scored += Number(match2.total1 || 0);
    left.conceded += Number(match2.total2 || 0);
    right.scored += Number(match2.total2 || 0);
    right.conceded += Number(match2.total1 || 0);
    left.live_applied = true;
    right.live_applied = true;
    if (Number(match2.total1 || 0) > Number(match2.total2 || 0)) {
      left.won += 1;
      right.lost += 1;
      left.points += 3;
    } else if (Number(match2.total2 || 0) > Number(match2.total1 || 0)) {
      right.won += 1;
      left.lost += 1;
      right.points += 3;
    } else {
      left.draw += 1;
      right.draw += 1;
      left.points += 1;
      right.points += 1;
    }
  }
  return Object.values(table).map((row) => ({
    ...row,
    diff: row.scored - row.conceded,
    win_rate: row.played > 0 ? Number(((row.won + row.draw / 2) / row.played * 100).toFixed(1)) : 0
  })).sort(
    (a, b) => b.points - a.points || b.won - a.won || b.scored - b.conceded - (a.scored - a.conceded) || b.scored - a.scored || a.team_name.localeCompare(b.team_name)
  ).map((row, index) => ({
    ...row,
    rank: index + 1
  }));
}
__name(buildLiveH2HStandings, "buildLiveH2HStandings");
__name2(buildLiveH2HStandings, "buildLiveH2HStandings");
async function mapLimit(list, limit, fn) {
  const results = new Array(list.length);
  let index = 0;
  const workers = Array.from({ length: Math.min(limit, list.length) }, async () => {
    while (true) {
      const i = index++;
      if (i >= list.length) break;
      results[i] = await fn(list[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}
__name(mapLimit, "mapLimit");
__name2(mapLimit, "mapLimit");
async function buildState(previousState = null, targetUids = UID_LIST) {
  const bootstrap = await fetchJson("/bootstrap-static/");
  const events = bootstrap.events || [];
  const [currentEvent, currentEventName] = getCurrentEvent(events);
  const eventMetaById = buildEventMetaById(events);
  const currentMeta = eventMetaById[currentEvent] || parseEventMetaFromName(currentEventName);
  const currentWeek = currentMeta.gw || extractGwNumber(currentEventName) || extractGwNumber(currentEvent) || 22;
  const currentDay = Number(currentMeta.day || 0) || 1;
  const weeklyStandingsPhase = currentWeek >= 1 && currentWeek <= 25 ? currentWeek + 1 : null;
  const futureWeekEventIds = buildWeekEventIds(events, currentWeek, currentEvent);
  const previousPicksByUid = buildPreviousPicksByUid(previousState);
  const teams = {};
  for (const t of bootstrap.teams || []) teams[t.id] = t.name;
  const elements = {};
  for (const e of bootstrap.elements || []) {
    elements[e.id] = {
      name: e.web_name || `#${e.id}`,
      team: e.team,
      position: e.element_type,
      position_name: e.element_type === 1 ? "BC" : e.element_type === 2 ? "FC" : "UNK",
      now_cost: Number(e.now_cost || 0),
      form: Number(e.form || 0),
      points_per_game: Number(e.points_per_game || 0),
      ep_next: Number(e.ep_next || 0),
      event_points: e.event_points || 0,
      points_scored: e.points_scored || 0,
      total_points: e.total_points || 0,
      status: e.status || "",
      news: e.news || "",
      transfers_in_event: e.transfers_in_event || 0,
      transfers_out_event: e.transfers_out_event || 0
    };
  }
  const [liveRaw, fixturesRaw, overallStandingsRows, weeklyStandingsRows] = await Promise.all([
    fetchJson(`/event/${currentEvent}/live/`),
    fetchJson(`/fixtures/?event=${currentEvent}`),
    fetchAllStandings(1),
    weeklyStandingsPhase ? fetchAllStandings(weeklyStandingsPhase) : Promise.resolve([])
  ]);
  const futureFixturesByEvent = {};
  for (const eventId of futureWeekEventIds) {
    futureFixturesByEvent[eventId] = await fetchJson(`/fixtures/?event=${eventId}`);
  }
  const liveElements = {};
  const rawElements = liveRaw?.elements;
  if (Array.isArray(rawElements)) {
    for (const item of rawElements) liveElements[item.id] = item;
  } else if (rawElements && typeof rawElements === "object") {
    for (const [k, v] of Object.entries(rawElements)) liveElements[Number(k)] = v;
  }
  const games = (fixturesRaw || []).map((f) => {
    const status = resolveFixtureStatus(f);
    return {
      id: f.id,
      team_h: f.team_h,
      team_a: f.team_a,
      home_team: teams[f.team_h] || `Team #${f.team_h}`,
      away_team: teams[f.team_a] || `Team #${f.team_a}`,
      home_score: f.team_h_score || 0,
      away_score: f.team_a_score || 0,
      started: !!f.started,
      finished: status.code === "finished",
      status_code: status.code,
      status_label: status.label,
      kickoff: formatKickoffBj(f.kickoff_time),
      kickoff_time: f.kickoff_time || null
    };
  });
  const teamsPlayingToday = buildTeamsPlayingToday(games);
  const futureTeamsByEvent = futureWeekEventIds.map((eventId) => buildTeamsPlayingToday(futureFixturesByEvent[eventId] || []));
  const eventLiveCache = {
    [currentEvent]: liveElements
  };
  const fixtureDetails = {};
  for (const fixture of fixturesRaw || []) {
    const homePlayers = [];
    const awayPlayers = [];
    for (const [idText, liveData] of Object.entries(liveElements)) {
      const elementId = Number(idText);
      const elem = elements[elementId] || {};
      const stats = liveData?.stats;
      if (!stats) continue;
      const player = {
        id: elementId,
        name: elem.name || `#${elementId}`,
        position: elem.position || 0,
        position_name: elem.position_name || "UNK",
        ...getPlayerStats(elementId, liveElements, elements)
      };
      if (elem.team === fixture.team_h) homePlayers.push(player);
      if (elem.team === fixture.team_a) awayPlayers.push(player);
    }
    homePlayers.sort((a, b) => b.fantasy - a.fantasy);
    awayPlayers.sort((a, b) => b.fantasy - a.fantasy);
    fixtureDetails[fixture.id] = {
      home_team: teams[fixture.team_h] || `Team #${fixture.team_h}`,
      away_team: teams[fixture.team_a] || `Team #${fixture.team_a}`,
      home_players: homePlayers,
      away_players: awayPlayers
    };
  }
  const overallStandingsByUid = {};
  for (const row of overallStandingsRows || []) {
    const uid = normalizeUid(row?.entry);
    if (!uid || !UID_MAP[uidToNumber(uid)]) continue;
    overallStandingsByUid[uid] = row;
  }
  const weeklyStandingsByUid = {};
  for (const row of weeklyStandingsRows || []) {
    const uid = normalizeUid(row?.entry);
    if (!uid || !UID_MAP[uidToNumber(uid)]) continue;
    weeklyStandingsByUid[uid] = row;
  }
  const standingsByUid = {};
  for (const uid of UID_LIST) {
    const overallRow = overallStandingsByUid[uid] || {};
    const weeklyRow = weeklyStandingsByUid[uid] || {};
    const previous = previousPicksByUid[uid] || {};
    standingsByUid[uid] = {
      week_total: weeklyRow.entry ? Math.round(Number(weeklyRow.total || 0) / 10) : Number(previous.event_total || 0),
      overall_total: overallRow.entry ? Math.round(Number(overallRow.total || 0) / 10) : Number(previous.overall_total || previous.event_total || 0),
      classic_rank: Number(overallRow.rank || previous.classic_rank || 0),
      classic_week_rank: Number(weeklyRow.rank || previous.classic_week_rank || 0),
      classic_week_total: weeklyRow.entry ? Math.round(Number(weeklyRow.total || 0) / 10) : Number(previous.classic_week_total || 0),
      today_live: Number(previous.total_live || 0),
      raw_today_live: Number(previous.raw_total_live || previous.total_live || 0),
      penalty_score: Number(previous.penalty_score || 0),
      transfer_count: Number(previous.transfer_count || 0),
      penalty_transfer_count: Number(previous.penalty_transfer_count || previous.transfer_count || 0),
      gd1_transfer_count: Number(previous.gd1_transfer_count || 0),
      gd1_missing_penalty: Number(previous.gd1_missing_penalty || 0),
      wildcard_active: !!previous.wildcard_active,
      wildcard_day: Number(previous.wildcard_day || 0) || null,
      rich_day: Number(previous.rich_day || 0) || null,
      transfer_records: Array.isArray(previous.transfer_records) ? previous.transfer_records : [],
      lineup_economy: previous.lineup_economy || null,
      picks: Array.isArray(previous.players) ? previous.players : []
    };
    debugUid("base_data", uid, {
      overall_total: overallRow.entry ? Math.round(Number(overallRow.total || 0) / 10) : null,
      overall_rank: Number(overallRow.rank || 0),
      weekly_total: weeklyRow.entry ? Math.round(Number(weeklyRow.total || 0) / 10) : null,
      weekly_rank: Number(weeklyRow.rank || 0),
      previous_event_total: Number(previous.event_total || 0),
      previous_total_live: Number(previous.total_live || 0),
      previous_players: Array.isArray(previous.players) ? previous.players.length : 0
    });
  }
  const uids = [...new Set((targetUids || UID_LIST).map((uid) => normalizeUid(uid)).filter(Boolean))];
  const transfersByUid = {};
  await mapLimit(uids, 1, async (uid) => {
    const uidNumber = uidToNumber(uid);
    const previous = previousPicksByUid[uid] || {};
    debugUid("input_uid", uid, { uid, uid_number: uidNumber });
    let [picksRes, transfersRes, historyRes] = await Promise.all([
      fetchJsonSafe(`/entry/${uidNumber}/event/${currentEvent}/picks/`, 4),
      fetchJsonSafe(`/entry/${uidNumber}/transfers/`, 4),
      fetchJsonSafe(`/entry/${uidNumber}/history/`, 4)
    ]);
    if (!picksRes.ok) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      picksRes = await fetchJsonSafe(`/entry/${uidNumber}/event/${currentEvent}/picks/`, 4);
    }
    if (!historyRes.ok) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      historyRes = await fetchJsonSafe(`/entry/${uidNumber}/history/`, 4);
    }
    if (!transfersRes.ok) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      transfersRes = await fetchJsonSafe(`/entry/${uidNumber}/transfers/`, 4);
    }
    const picksData = picksRes.ok ? picksRes.data : null;
    const transfersData = transfersRes.ok && Array.isArray(transfersRes.data) ? transfersRes.data : [];
    const historyData = historyRes.ok && typeof historyRes.data === "object" && historyRes.data ? historyRes.data : {};
    transfersByUid[uid] = transfersData;
    const classicRank = Number(standingsByUid[uid].classic_rank || 0);
    standingsByUid[uid].classic_rank = classicRank;
    debugUid("fetch_status", uid, {
      profile_ok: classicRank > 0,
      picks_ok: !!picksRes.ok,
      transfers_ok: !!transfersRes.ok,
      history_ok: !!historyRes.ok,
      classic_rank: classicRank,
      picks_count: Array.isArray(picksData?.picks) ? picksData.picks.length : 0,
      transfer_count_raw: transfersData.length,
      history_rows: Array.isArray(historyData?.current) ? historyData.current.length : 0
    });
    debugUid("trend_data", uid, null);
    debugUid("avatar_data", uid, null);
    const canRecomputePenalty = !!transfersRes.ok && !!historyRes.ok;
    const chipDayMap = canRecomputePenalty ? getChipDayMapFromHistory(historyData, currentWeek, currentEvent, eventMetaById) : {};
    const wildcardDay = canRecomputePenalty ? getWildcardDayFromHistory(historyData, currentWeek, currentEvent, eventMetaById) : Number(previous.wildcard_day || 0) || null;
    const richDay = canRecomputePenalty ? Object.entries(chipDayMap).find(([, value]) => value === "rich")?.[0] || null : Number(previous.rich_day || 0) || null;
    const transferSummary = canRecomputePenalty ? buildWeeklyTransferSummary(transfersData, currentWeek, eventMetaById, elements, chipDayMap) : {
      records: Array.isArray(previous.transfer_records) ? previous.transfer_records : [],
      total_transfer_count: Number(previous.transfer_count || 0),
      penalty_transfer_count: Number(previous.penalty_transfer_count || previous.transfer_count || 0),
      gd1_transfer_count: Number(previous.gd1_transfer_count || 0),
      gd1_missing_penalty: Number(previous.gd1_missing_penalty || 0),
      penalty_score: Number(previous.penalty_score || 0)
    };
    const transferCount = Number(transferSummary.total_transfer_count || 0);
    const gd1TransferCount = Number(transferSummary.gd1_transfer_count || 0);
    const gd1MissingPenalty = Number(transferSummary.gd1_missing_penalty || 0);
    const wildcardActive = wildcardDay !== null;
    const penaltyScore = Number(transferSummary.penalty_score || 0);
    const historyWeek = calculateWeekScoresFromHistory(historyData, currentWeek, currentEvent, eventMetaById);
    const captainUsed = canRecomputePenalty ? await buildCaptainUsageSummary(uidNumber, historyData, currentWeek, currentEvent, eventMetaById, elements, eventLiveCache) : previous.captain_used || { used: false, label: "None", day: null, captain_name: null, captain_points: null };
    standingsByUid[uid].penalty_score = penaltyScore;
    standingsByUid[uid].transfer_count = transferCount;
    standingsByUid[uid].penalty_transfer_count = Number(transferSummary.penalty_transfer_count || 0);
    standingsByUid[uid].gd1_transfer_count = gd1TransferCount;
    standingsByUid[uid].gd1_missing_penalty = gd1MissingPenalty;
    standingsByUid[uid].wildcard_active = wildcardActive;
    standingsByUid[uid].wildcard_day = wildcardDay;
    standingsByUid[uid].rich_day = richDay ? Number(richDay) : null;
    standingsByUid[uid].transfer_records = transferSummary.records;
    standingsByUid[uid].captain_used = captainUsed;
    if (historyWeek.has_week_rows) {
      const previewTodayScore = historyWeek.today_points !== null ? Number(historyWeek.today_points || 0) : Number(previous.total_live || standingsByUid[uid].today_live || 0);
      standingsByUid[uid].week_total = computeWeekTotalFromHistory(
        historyWeek,
        currentEvent,
        previewTodayScore,
        gd1MissingPenalty
      );
    }
    if (!picksData?.picks) {
      if (Array.isArray(previous.players) && previous.players.length > 0 && Number(previous.current_event || currentEvent) === Number(currentEvent) && previous.fetch_status?.picks_ok === true) {
        standingsByUid[uid].picks = previous.players;
      }
      let todayFallback = 0;
      if (historyWeek.today_points !== null) {
        todayFallback = Number(historyWeek.today_points);
      } else if (Number.isFinite(Number(previous.total_live))) {
        todayFallback = Number(previous.total_live);
      } else {
        todayFallback = Number(standingsByUid[uid].today_live || 0);
      }
      standingsByUid[uid].raw_today_live = todayFallback;
      standingsByUid[uid].today_live = todayFallback;
      if (historyWeek.has_week_rows) {
        standingsByUid[uid].week_total = computeWeekTotalFromHistory(
          historyWeek,
          currentEvent,
          todayFallback,
          gd1MissingPenalty
        );
      }
      standingsByUid[uid].fetch_status = {
        profile_ok: classicRank > 0,
        picks_ok: !!picksRes.ok,
        history_ok: !!historyRes.ok,
        transfers_ok: !!transfersRes.ok
      };
      standingsByUid[uid].lineup_economy = previous.lineup_economy || standingsByUid[uid].lineup_economy || {
        effective_total_cost: 0,
        breakeven_line: 0,
        effective_total_points: Number(todayFallback || 0),
        status: "\u52C9\u5F3A\u56DE\u672C"
      };
      debugUid("final_payload", uid, {
        fallback: true,
        total_live: standingsByUid[uid].today_live,
        event_total: standingsByUid[uid].week_total,
        players: summarizePlayersForDebug(standingsByUid[uid].picks),
        lineup_economy: standingsByUid[uid].lineup_economy,
        captain_used: captainUsed
      });
      return;
    }
    const picks = (picksData.picks || []).map((pick) => {
      const elementId = pick.element;
      const elem = elements[elementId] || {};
      const stats = getPlayerStats(elementId, liveElements, elements);
      const base = stats.fantasy || 0;
      const isCaptain = !!pick.is_captain;
      const finalPoints = isCaptain ? base * (pick.multiplier || 1) : base;
      return {
        element_id: elementId,
        name: elem.name || `#${elementId}`,
        position_type: elem.position || 0,
        position_name: elem.position_name || "UNK",
        now_cost: Number(elem.now_cost || 0),
        form: Number(elem.form || 0),
        points_per_game: Number(elem.points_per_game || 0),
        ep_next: Number(elem.ep_next || 0),
        lineup_position: pick.position,
        is_captain: isCaptain,
        is_vice: !!pick.is_vice_captain,
        multiplier: pick.multiplier || 1,
        base_points: base,
        final_points: finalPoints,
        stats,
        injury: parseInjuryStatus(elem),
        team_id: elem.team || 0,
        is_effective: false
      };
    });
    const [effectiveScore] = calculateEffectiveScore(picks, teamsPlayingToday);
    const lineupEconomy = buildLineupEconomySummary(picks);
    debugUid("merge_data", uid, {
      players: summarizePlayersForDebug(picks),
      effective_score: effectiveScore,
      lineup_economy: lineupEconomy
    });
    const previousEventTotal = Number(previous.event_total);
    const previousRawToday = Number(previous.raw_total_live ?? previous.total_live);
    let weekRawScore = null;
    if (historyWeek.has_week_rows) {
      weekRawScore = computeWeekTotalFromHistory(
        historyWeek,
        currentEvent,
        effectiveScore,
        gd1MissingPenalty
      );
    } else if (Number.isFinite(previousEventTotal)) {
      weekRawScore = Math.max(
        0,
        previousEventTotal - (Number.isFinite(previousRawToday) ? previousRawToday : 0) + effectiveScore
      );
    } else {
      weekRawScore = Math.max(0, Number(standingsByUid[uid].week_total || 0));
    }
    const todayLive = Number(effectiveScore || 0);
    const rawTodayLive = todayLive;
    const finalWeekTotal = Math.max(0, Number(weekRawScore || 0));
    standingsByUid[uid].raw_today_live = rawTodayLive;
    standingsByUid[uid].today_live = todayLive;
    standingsByUid[uid].week_total = finalWeekTotal;
    standingsByUid[uid].picks = picks;
    standingsByUid[uid].lineup_economy = lineupEconomy;
    standingsByUid[uid].captain_used = captainUsed;
    standingsByUid[uid].fetch_status = {
      profile_ok: classicRank > 0,
      picks_ok: true,
      history_ok: !!historyRes.ok,
      transfers_ok: !!transfersRes.ok
    };
    debugUid("final_payload", uid, {
      total_live: standingsByUid[uid].today_live,
      raw_total_live: standingsByUid[uid].raw_today_live,
      event_total: standingsByUid[uid].week_total,
      penalty_score: standingsByUid[uid].penalty_score,
      players: summarizePlayersForDebug(picks),
      lineup_economy: lineupEconomy
    });
  });
  const availableWeeks = [...new Set(ALL_FIXTURES.map(([gw]) => gw))].sort((a, b) => a - b);
  let fixtureWeek = currentWeek;
  if (!availableWeeks.includes(fixtureWeek)) {
    fixtureWeek = availableWeeks.filter((w) => w <= currentWeek).pop() || availableWeeks[0] || currentWeek;
  }
  const weeklyFixtures = ALL_FIXTURES.filter(([gw]) => gw === fixtureWeek);
  let h2h = weeklyFixtures.map(([gw, rawUid1, rawUid2]) => {
    const uid1 = normalizeUid(rawUid1);
    const uid2 = normalizeUid(rawUid2);
    const t1 = UID_MAP[uidToNumber(uid1)] || uid1;
    const t2 = UID_MAP[uidToNumber(uid2)] || uid2;
    const s1 = standingsByUid[uid1] || { week_total: 0, today_live: 0 };
    const s2 = standingsByUid[uid2] || { week_total: 0, today_live: 0 };
    return {
      gameweek: fixtureWeek,
      t1,
      t2,
      uid1: uidToNumber(uid1),
      uid2: uidToNumber(uid2),
      total1: s1.week_total || 0,
      total2: s2.week_total || 0,
      diff: Math.abs(Number(s1.week_total || 0) - Number(s2.week_total || 0)),
      today1: s1.today_live || 0,
      today2: s2.today_live || 0,
      raw_today1: s1.raw_today_live || s1.today_live || 0,
      raw_today2: s2.raw_today_live || s2.today_live || 0,
      penalty1: s1.penalty_score || 0,
      penalty2: s2.penalty_score || 0,
      transfer_count1: s1.transfer_count || 0,
      transfer_count2: s2.transfer_count || 0,
      wildcard1: !!s1.wildcard_active,
      wildcard2: !!s2.wildcard_active
    };
  });
  const picksByUid = {};
  for (const uid of UID_LIST) {
    const uidNum = uidToNumber(uid);
    const s = standingsByUid[uid] || {};
    const picks = s.picks || [];
    let formation = "N/A";
    if (picks.length) {
      const [, , fmt] = calculateEffectiveScore(picks, teamsPlayingToday);
      formation = fmt;
    }
    picksByUid[uid] = {
      uid: uidNum,
      team_name: UID_MAP[uidNum],
      total_live: s.today_live || 0,
      raw_total_live: s.raw_today_live || s.today_live || 0,
      penalty_score: s.penalty_score || 0,
      transfer_count: s.transfer_count || 0,
      penalty_transfer_count: s.penalty_transfer_count || 0,
      gd1_transfer_count: s.gd1_transfer_count || 0,
      gd1_missing_penalty: s.gd1_missing_penalty || 0,
      wildcard_active: !!s.wildcard_active,
      wildcard_day: s.wildcard_day || null,
      rich_day: s.rich_day || null,
      fetch_status: s.fetch_status || { picks_ok: true, history_ok: true, transfers_ok: true },
      event_total: s.week_total || 0,
      overall_total: s.overall_total || s.week_total || 0,
      classic_rank: s.classic_rank || 0,
      classic_week_rank: s.classic_week_rank || 0,
      classic_week_total: s.classic_week_total || 0,
      transfer_records: Array.isArray(s.transfer_records) ? s.transfer_records : [],
      captain_used: s.captain_used || {
        used: false,
        label: "None",
        day: null,
        captain_name: null,
        captain_points: null
      },
      lineup_economy: s.lineup_economy || {
        effective_total_cost: 0,
        breakeven_line: 0,
        effective_total_points: 0,
        status: "\u52C9\u5F3A\u56DE\u672C"
      },
      formation,
      current_event: currentEvent,
      current_event_name: currentEventName,
      players: picks
    };
  }
  const ownershipSummary = buildOwnershipSummary(picksByUid);
  for (const uid of UID_LIST) {
    const players = Array.isArray(picksByUid[uid]?.players) ? picksByUid[uid].players : [];
    for (const player of players) {
      const ownership = ownershipSummary.by_element[Number(player?.element_id || 0)];
      player.ownership_count = Number(ownership?.holder_count || 0);
      player.ownership_percent = Number(((ownership?.holder_count || 0) / Math.max(1, ownershipSummary.manager_count) * 100).toFixed(1));
    }
  }
  const league_daily_averages = buildLeagueDailyAverages(picksByUid, teamsPlayingToday);
  const projectionByUid = {};
  for (const uid of UID_LIST) {
    projectionByUid[uid] = buildManagerProjectionSummary(picksByUid[uid], futureTeamsByEvent);
  }
  h2h = h2h.map((match2) => {
    const uid1 = normalizeUid(match2.uid1);
    const uid2 = normalizeUid(match2.uid2);
    const leftProjection = projectionByUid[uid1] || { expected_total: Number(match2.total1 || 0) };
    const rightProjection = projectionByUid[uid2] || { expected_total: Number(match2.total2 || 0) };
    const winProb = buildWinProbabilitySummary(leftProjection, rightProjection);
    return {
      ...match2,
      projected_total1: Number(leftProjection.expected_total || match2.total1 || 0),
      projected_total2: Number(rightProjection.expected_total || match2.total2 || 0),
      projected_future1: Number(leftProjection.projected_future_score || 0),
      projected_future2: Number(rightProjection.projected_future_score || 0),
      remaining_ft1: Number(leftProjection.remaining_ft || 0),
      remaining_ft2: Number(rightProjection.remaining_ft || 0),
      captain_bonus1: Number(leftProjection.captain_bonus || 0),
      captain_bonus2: Number(rightProjection.captain_bonus || 0),
      win_prob1: winProb.left,
      win_prob2: winProb.right
    };
  });
  const isFullRefresh = uids.length === UID_LIST.length;
  const transferTrends = isFullRefresh ? buildTransferTrends({
    transfersByUid,
    leagueUids: uids,
    currentWeek,
    eventMetaById,
    elements
  }) : previousState?.transfer_trends || { league: {}, global: {}, overall: {} };
  transferTrends.ownership_top = ownershipSummary.top20;
  transferTrends.ownership_manager_count = ownershipSummary.manager_count;
  const fdr = buildFdrPayload({
    standingsByUid,
    currentWeek
  });
  fdr.daily_averages = league_daily_averages;
  const h2hStandings = buildLiveH2HStandings(H2H_BASE_STATS_BY_UID, h2h);
  const classicRankings = buildClassicRankingsPayload(
    overallStandingsRows,
    weeklyStandingsRows,
    currentWeek,
    weeklyStandingsPhase
  );
  return {
    generated_at: (/* @__PURE__ */ new Date()).toISOString(),
    current_event: currentEvent,
    current_event_name: currentEventName,
    fixtures: {
      event: currentEvent,
      event_name: currentEventName,
      count: games.length,
      games
    },
    fixture_details: fixtureDetails,
    h2h,
    h2h_standings: h2hStandings,
    classic_rankings: classicRankings,
    picks_by_uid: picksByUid,
    transfer_trends: transferTrends,
    ownership: ownershipSummary,
    fdr,
    fdr_html: fdr.html,
    league_daily_averages,
    refresh_meta: previousState?.refresh_meta || null
  };
}
__name(buildState, "buildState");
__name2(buildState, "buildState");
async function refreshState(env, options = {}) {
  const previous = await getState(env);
  const full = !!options.full;
  const rawCursor = full ? "0" : await env.NBA_CACHE.get(CACHE_CURSOR_KEY);
  const startIndex = Math.max(0, Number(rawCursor || 0) || 0);
  const safeStart = startIndex >= UID_LIST.length ? 0 : startIndex;
  const targetUids = full ? [...UID_LIST] : UID_LIST.slice(safeStart, safeStart + UID_CHUNK_SIZE);
  const state = await buildState(previous, targetUids);
  const nextIndex = full || safeStart + UID_CHUNK_SIZE >= UID_LIST.length ? 0 : safeStart + UID_CHUNK_SIZE;
  state.refresh_meta = {
    mode: full ? "full" : "chunk",
    chunk_size: full ? UID_LIST.length : UID_CHUNK_SIZE,
    start_index: safeStart,
    next_index: nextIndex,
    processed_uids: targetUids,
    complete_cycle: nextIndex === 0,
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  };
  await env.NBA_CACHE.put(CACHE_KEY, JSON.stringify(state));
  await env.NBA_CACHE.put(CACHE_CURSOR_KEY, String(nextIndex));
  return state;
}
__name(refreshState, "refreshState");
__name2(refreshState, "refreshState");
async function getState(env) {
  const raw = await env.NBA_CACHE.get(CACHE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
__name(getState, "getState");
__name2(getState, "getState");
var src_default = {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") return jsonResponse({ ok: true });
    const url = new URL(request.url);
    const path = url.pathname;
    if (path === "/api/refresh" && request.method === "POST") {
      const auth = env.REFRESH_TOKEN;
      if (auth) {
        const token = url.searchParams.get("token");
        if (token !== auth) return jsonResponse({ success: false, error: "unauthorized" }, 401);
      }
      const mode = String(url.searchParams.get("mode") || "chunk").toLowerCase();
      const state2 = await refreshState(env, { full: mode === "full" });
      return jsonResponse({
        success: true,
        mode: mode === "full" ? "full" : "chunk",
        current_event_name: state2.current_event_name,
        refresh_meta: state2.refresh_meta
      });
    }
    let state = await getState(env);
    if (!state) {
      state = await refreshState(env, { full: false });
    }
    if (path === "/api/state") return jsonResponse(state);
    if (path === "/api/fixtures") return jsonResponse(state.fixtures);
    if (path === "/api/h2h") return jsonResponse(state.h2h);
    if (path === "/api/h2h-standings") return jsonResponse(state.h2h_standings || []);
    if (path === "/api/classic-rankings") return jsonResponse(state.classic_rankings || []);
    if (path.startsWith("/api/fixture/")) {
      const id = Number(path.split("/").pop());
      return jsonResponse(state.fixture_details[String(id)] || state.fixture_details[id] || {});
    }
    if (path.startsWith("/api/picks/")) {
      const uid = normalizeUid(Number(path.split("/").pop()));
      let payload = state.picks_by_uid[uid] || {};
      const forceFresh = url.searchParams.get("fresh") === "1";
      if (forceFresh || !payload.players || payload.players.length === 0) {
        state = await buildState(state, [uid]);
        await env.NBA_CACHE.put(CACHE_KEY, JSON.stringify(state));
        payload = state.picks_by_uid[uid] || {};
      }
      debugUid("api_response", uid, {
        total_live: payload.total_live || 0,
        event_total: payload.event_total || 0,
        players: summarizePlayersForDebug(payload.players || [])
      });
      return jsonResponse(payload);
    }
    if (path === "/api/trends/transfers")
      return jsonResponse(state.transfer_trends || { league: {}, global: {}, ownership_top: [], ownership_manager_count: UID_LIST.length });
    if (path === "/api/fdr") {
      return jsonResponse(
        state.fdr || {
          weeks: [],
          html: state.fdr_html || "",
          uses_h2h: false,
          ranking_source: "entry_league_rank",
          weights: { total: FDR_TOTAL_WEIGHT, h2h: FDR_H2H_WEIGHT },
          daily_averages: state.league_daily_averages || {
            manager_count: 0,
            today_average_count: 0,
            effective_average_count: 0
          }
        }
      );
    }
    if (path === "/api/health") {
      return jsonResponse({
        status: "ok",
        last_update: state.generated_at,
        current_event: state.current_event,
        current_event_name: state.current_event_name,
        refresh_meta: state.refresh_meta || null
      });
    }
    return jsonResponse({ error: "not found" }, 404);
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(refreshState(env));
  }
};
async function onRequest(context) {
  return src_default.fetch(context.request, context.env, context);
}
__name(onRequest, "onRequest");
__name2(onRequest, "onRequest");
var routes = [
  {
    routePath: "/api/:path*",
    mountPath: "/api",
    method: "",
    middlewares: [],
    modules: [onRequest]
  }
];
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
__name(lexer, "lexer");
__name2(lexer, "lexer");
function parse(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = /* @__PURE__ */ __name2(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name2(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name2(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name2(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name2(function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  }, "safePattern");
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
__name(parse, "parse");
__name2(parse, "parse");
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match, "match");
__name2(match, "match");
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = /* @__PURE__ */ __name2(function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    }, "_loop_1");
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
__name(regexpToFunction, "regexpToFunction");
__name2(regexpToFunction, "regexpToFunction");
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
__name2(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
__name2(flags, "flags");
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
__name(regexpToRegexp, "regexpToRegexp");
__name2(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
__name2(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
__name2(stringToRegexp, "stringToRegexp");
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
__name(tokensToRegexp, "tokensToRegexp");
__name2(tokensToRegexp, "tokensToRegexp");
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");
__name2(pathToRegexp, "pathToRegexp");
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname;
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
__name(executeRequest, "executeRequest");
__name2(executeRequest, "executeRequest");
var pages_template_worker_default = {
  async fetch(originalRequest, env, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name2(async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          env,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: /* @__PURE__ */ __name2(() => {
            isFailOpen = true;
          }, "passThroughOnException")
        };
        const response = await handler(context);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response);
      } else if ("ASSETS") {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      } else {
        const response = await fetch(request);
        return cloneResponse(response);
      }
    }, "next");
    try {
      return await next();
    } catch (error) {
      if (isFailOpen) {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      }
      throw error;
    }
  }
};
var cloneResponse = /* @__PURE__ */ __name2((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");
var drainBody = /* @__PURE__ */ __name2(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
__name2(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name2(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = pages_template_worker_default;
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
__name2(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
__name2(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");
__name2(__facade_invoke__, "__facade_invoke__");
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  static {
    __name(this, "___Facade_ScheduledController__");
  }
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name2(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name2(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name2(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
__name2(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name2((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name2((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
__name2(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;

// ../Node.js环境/node_global/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody2 = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default2 = drainBody2;

// ../Node.js环境/node_global/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError2(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError2(e.cause)
  };
}
__name(reduceError2, "reduceError");
var jsonError2 = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError2(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default2 = jsonError2;

// .wrangler/tmp/bundle-6tH749/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__2 = [
  middleware_ensure_req_body_drained_default2,
  middleware_miniflare3_json_error_default2
];
var middleware_insertion_facade_default2 = middleware_loader_entry_default;

// ../Node.js环境/node_global/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__2 = [];
function __facade_register__2(...args) {
  __facade_middleware__2.push(...args.flat());
}
__name(__facade_register__2, "__facade_register__");
function __facade_invokeChain__2(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__2(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__2, "__facade_invokeChain__");
function __facade_invoke__2(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__2(request, env, ctx, dispatch, [
    ...__facade_middleware__2,
    finalMiddleware
  ]);
}
__name(__facade_invoke__2, "__facade_invoke__");

// .wrangler/tmp/bundle-6tH749/middleware-loader.entry.ts
var __Facade_ScheduledController__2 = class ___Facade_ScheduledController__2 {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__2)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler2(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__2 === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__2.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__2) {
    __facade_register__2(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__2(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__2(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler2, "wrapExportedHandler");
function wrapWorkerEntrypoint2(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__2 === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__2.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__2) {
    __facade_register__2(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__2(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__2(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint2, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY2;
if (typeof middleware_insertion_facade_default2 === "object") {
  WRAPPED_ENTRY2 = wrapExportedHandler2(middleware_insertion_facade_default2);
} else if (typeof middleware_insertion_facade_default2 === "function") {
  WRAPPED_ENTRY2 = wrapWorkerEntrypoint2(middleware_insertion_facade_default2);
}
var middleware_loader_entry_default2 = WRAPPED_ENTRY2;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__2 as __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default2 as default
};
//# sourceMappingURL=functionsWorker-0.23497336611732456.js.map
