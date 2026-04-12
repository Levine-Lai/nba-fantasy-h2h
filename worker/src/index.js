import {
  jsonResponse,
  fetchJson,
  fetchJsonSafe,
  fetchTextUrl,
  fetchJsonUrl,
} from "./lib/http.js";
import {
  formatKickoffBj,
  resolveFixtureStatus,
} from "./lib/fixture-runtime.js";
import {
  extractGwNumber,
  getCurrentEvent,
  extractHistoryRecords,
  extractChipHistoryRecords,
  parseEventMetaFromName,
  buildEventMetaById,
  resolveTransferGwDay,
  getWildcardDayFromHistory,
  getChipDayMapFromHistory,
  isWildcardActiveFromHistory,
  countTransfersInGw,
  countTransfersInGd1,
  calculateTransferPenalty,
} from "./lib/history-domain.js";
import {
  calculateWeekScoresFromHistory,
  parseInjuryStatus,
  getPlayerStats,
  buildTeamsPlayingToday,
  calculateEffectiveScore,
  buildElementsMap,
  buildLiveElementsMap,
  buildTeamsMetaMap,
  buildLivePicksFromPicksData,
  rebuildLivePicksFromCachedPlayers,
  getFormationFromEffectivePlayers,
  getBeijingDateKey,
  getBeijingHour,
  buildWeekTotalSummary,
  computeWeekTotalFromSummary,
} from "./lib/live-score.js";
import {
  buildFreshHomepageState as buildFreshHomepageStateModule,
  getHomepageFreshDecision as getHomepageFreshDecisionModule,
  buildCurrentFixturePayload as buildCurrentFixturePayloadModule,
} from "./lib/homepage-live.js";
import {
  countGoodCaptainManagers as countGoodCaptainManagersModule,
  shouldRefreshManagerMeta as shouldRefreshManagerMetaModule,
  buildChipsUsedSummary as buildChipsUsedSummaryModule,
  buildGoodCaptainSummary as buildGoodCaptainSummaryModule,
  refreshManagerMetaState as refreshManagerMetaStateModule,
} from "./lib/manager-meta.js";

const LEAGUE_ID = 1653;
const SEASON_SUMMARY_LEAGUE_ID = 1233;
const SEASON_SUMMARY_CACHE_VERSION = "20260412e";
const SEASON_SUMMARY_CACHE_PREFIX = `season_summary:${SEASON_SUMMARY_CACHE_VERSION}:`;
const SEASON_SUMMARY_PREWARM_CURSOR_KEY = `season_summary_prewarm_cursor:${SEASON_SUMMARY_CACHE_VERSION}`;
const SEASON_SUMMARY_PREWARM_META_KEY = `season_summary_prewarm_meta:${SEASON_SUMMARY_CACHE_VERSION}`;
const CACHE_KEY = "latest_state";
const CACHE_CURSOR_KEY = "refresh_cursor";
const INJURY_CACHE_KEY = "injury_state";
const PLAYER_REFERENCE_CACHE_KEY = "player_reference_state";
const TEAM_ATTACK_DEFENSE_CACHE_KEY = "team_attack_defense_state";
const INJURY_CACHE_TTL_MS = 60 * 60 * 1000;
const UID_CHUNK_SIZE = 6;
const REFRESH_ESTIMATED_GAME_DURATION_MS = 5 * 60 * 60 * 1000;
const REFRESH_POSTGAME_BUFFER_MS = 15 * 60 * 1000;
const UID_LIST = [
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
  "42",
];
const DEBUG_UIDS = new Set(["5095", "6412", "8580", "16447", "5467", "5410", "6441", "6562", "22761", "5101", "4319", "11", "23", "42"]);
const FDR_TOTAL_WEIGHT = 0.7;
const FDR_H2H_WEIGHT = 0.3;
const WIN_PROB_FT_BONUS = 50;
const WIN_PROB_CAPTAIN_BONUS = 65;
const WIN_PROB_LOGISTIC_SCALE = 90;
const FDR_H2H_RANK_BY_UID = {
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
  "8580": 26,
};

const H2H_BASE_STATS_BY_UID = {
  "2": { points: 49, played: 22, won: 16, draw: 1, lost: 5, scored: 27342, conceded: 25056 },
  "15": { points: 48, played: 22, won: 16, draw: 0, lost: 6, scored: 24182, conceded: 25293 },
  "3455": { points: 45, played: 22, won: 15, draw: 0, lost: 7, scored: 27902, conceded: 26220 },
  "4319": { points: 45, played: 22, won: 15, draw: 0, lost: 7, scored: 27532, conceded: 25862 },
  "5095": { points: 45, played: 22, won: 15, draw: 0, lost: 7, scored: 24714, conceded: 26281 },
  "17": { points: 43, played: 22, won: 14, draw: 1, lost: 7, scored: 27604, conceded: 24807 },
  "10": { points: 42, played: 22, won: 14, draw: 0, lost: 8, scored: 27218, conceded: 26355 },
  "14": { points: 42, played: 22, won: 14, draw: 0, lost: 8, scored: 27241, conceded: 26827 },
  "6": { points: 39, played: 22, won: 13, draw: 0, lost: 9, scored: 27000, conceded: 26012 },
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
  "8580": { points: 15, played: 22, won: 5, draw: 0, lost: 17, scored: 23798, conceded: 26547 },
};

const UID_MAP = {
  5410: "kusuri",
  3455: "Paul",
  32: "伍家辉",
  4319: "Kimi",
  17: "堡",
  2: "大吉鲁",
  10: "弗老大",
  14: "酸男",
  6: "紫葱酱",
  189: "凯文",
  9: "雕哥",
  4224: "班班",
  22761: "纪导",
  4: "尼弟",
  16447: "文史哲",
  6562: "柯南",
  23: "橘队",
  11: "船哥",
  5101: "鬼嗨",
  6441: "马哥",
  15: "笨笨",
  5095: "AI",
  5467: "老姜",
  6412: "阿甘",
  8580: "小火龙",
  42: "桑迪",
};

const ALL_FIXTURES = [
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
  [25, "6412", "6562"],
];
function normalizeUid(uid) {
  if (uid === null || uid === undefined) return "";
  return String(uid).trim();
}

function uidToNumber(uid) {
  const normalized = normalizeUid(uid);
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function getMapValueByUid(source, uid) {
  if (!source || typeof source !== "object") return null;
  const normalized = normalizeUid(uid);
  if (normalized in source) return source[normalized];
  const numeric = uidToNumber(normalized);
  if (numeric !== null && numeric in source) return source[numeric];
  return null;
}

function isDebugUid(uid) {
  return DEBUG_UIDS.has(normalizeUid(uid));
}

function summarizePlayersForDebug(players) {
  return (players || []).map((player) => ({
    element_id: player?.element_id ?? player?.id ?? null,
    name: player?.name || "",
    lineup_position: player?.lineup_position ?? null,
    position_name: player?.position_name || "",
    final_points: Number(player?.final_points || 0),
    is_effective: !!player?.is_effective,
  }));
}

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

function getFixtureRefreshWindowInfo(fixturesOrGames, value = Date.now()) {
  const nowMs = value instanceof Date ? value.getTime() : new Date(value).getTime();
  const items = Array.isArray(fixturesOrGames) ? fixturesOrGames : [];
  const kickoffTimes = items
    .map((item) => (item?.kickoff_time ? Date.parse(item.kickoff_time) : NaN))
    .filter((item) => Number.isFinite(item))
    .sort((a, b) => a - b);

  if (!kickoffTimes.length) {
    return {
      has_games: false,
      active: false,
      before_start: false,
      after_end: false,
      has_unfinished: false,
      start_ms: null,
      end_ms: null,
    };
  }

  const startMs = kickoffTimes[0];
  const latestKickoffMs = kickoffTimes[kickoffTimes.length - 1];
  const fallbackEndMs = latestKickoffMs + REFRESH_ESTIMATED_GAME_DURATION_MS + REFRESH_POSTGAME_BUFFER_MS;
  const hasUnfinished = items.some((item) => resolveFixtureStatus(item).code !== "finished");
  return {
    has_games: true,
    active: nowMs >= startMs && nowMs <= fallbackEndMs,
    before_start: nowMs < startMs,
    after_end: nowMs > fallbackEndMs,
    has_unfinished: hasUnfinished,
    start_ms: startMs,
    end_ms: fallbackEndMs,
  };
}

function isDynamicRefreshWindow(fixturesOrGames, value = Date.now()) {
  return getFixtureRefreshWindowInfo(fixturesOrGames, value).active;
}

async function getCurrentRefreshWindowContext(value = Date.now()) {
  const bootstrap = await fetchJson("/bootstrap-static/", 1);
  const events = Array.isArray(bootstrap?.events) ? bootstrap.events : [];
  const [currentEvent, currentEventName] = getCurrentEvent(events);
  if (!currentEvent) {
    return {
      active: false,
      current_event: null,
      current_event_name: null,
      fixtures: [],
      window: getFixtureRefreshWindowInfo([], value),
    };
  }
  const fixturesRaw = await fetchJson(`/fixtures/?event=${currentEvent}`, 1);
  const fixtures = Array.isArray(fixturesRaw) ? fixturesRaw : [];
  return {
    active: isDynamicRefreshWindow(fixtures, value),
    current_event: currentEvent,
    current_event_name: currentEventName,
    fixtures,
    window: getFixtureRefreshWindowInfo(fixtures, value),
  };
}

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
    if (!standing || (Object.keys(standing).length === 0 && (!Array.isArray(players) || players.length === 0))) {
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
        wildcard_post_gw17_event: Number(standing?.wildcard_post_gw17_event || 0) || null,
        rich_day: Number(standing?.rich_day || 0) || null,
        chip_status: standing?.chip_status || null,
        event_total: Number(standing?.total || 0),
        players: Array.isArray(players) ? players : [],
      };
  }

  return migrated;
}

function extractLeagueClassicRank(entryData, leagueId) {
  const classicLeagues = Array.isArray(entryData?.leagues?.classic) ? entryData.leagues.classic : [];
  const matched = classicLeagues.find((league) => Number(league?.id) === Number(leagueId));
  const directRank = Number(matched?.entry_rank);
  if (Number.isFinite(directRank) && directRank > 0) return directRank;

  const fallbackRank = Number(entryData?.entry_rank);
  if (Number.isFinite(fallbackRank) && fallbackRank > 0) return fallbackRank;

  return null;
}

function getFutureFixtureWeeks(currentWeek) {
  const availableWeeks = [...new Set(ALL_FIXTURES.map(([gw]) => Number(gw)))].sort((a, b) => a - b);
  const futureWeeks = availableWeeks.filter((week) => week >= Number(currentWeek || 0)).slice(0, 3);
  if (futureWeeks.length > 0) return futureWeeks;
  return availableWeeks.slice(-3);
}

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
  const rankedByClassic = UID_LIST
    .filter((uid) => byUid[uid])
    .map((uid) => ({
      uid,
      name: UID_MAP[uidToNumber(uid)] || uid,
      classic_rank: Number(getMapValueByUid(standingsByUid, uid)?.classic_rank || 0),
      overall_total: Number(getMapValueByUid(standingsByUid, uid)?.overall_total || 0),
    }))
    .sort((a, b) => {
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

  const rankedByH2h = Object.entries(FDR_H2H_RANK_BY_UID)
    .map(([uid, rank]) => ({ uid: normalizeUid(uid), rank: Number(rank) }))
    .filter((item) => item.uid && Number.isFinite(item.rank))
    .sort((a, b) => a.rank - b.rank);

  const h2hStrengthByUid = {};
  const h2hDenom = Math.max(1, rankedByH2h.length - 1);
  rankedByH2h.forEach((item, idx) => {
    h2hStrengthByUid[item.uid] = 1 - idx / h2hDenom;
  });

  const difficultyClass = (opponentUid) => {
    if (!opponentUid) return 3;

    const classicStrength = classicStrengthByUid[opponentUid] ?? 0.5;
    const h2hStrength = h2hStrengthByUid[opponentUid] ?? classicStrength;
    const weightedStrength = classicStrength * FDR_TOTAL_WEIGHT + h2hStrength * FDR_H2H_WEIGHT;

    if (weightedStrength < 0.2) return 1;
    if (weightedStrength < 0.4) return 2;
    if (weightedStrength < 0.6) return 3;
    if (weightedStrength < 0.8) return 4;
    return 5;
  };

  const rows = teams
    .map((uid) => {
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
        html: `<tr><td class='t-name'>${team}</td>${cells.join("")}<td class='avg-col'>${avg}</td></tr>`,
      };
    })
    .sort((a, b) => b.avgValue - a.avgValue || (UID_MAP[uidToNumber(a.uid)] || "").localeCompare(UID_MAP[uidToNumber(b.uid)] || ""));
  const html = rows.map((row) => row.html).join("");

  return {
    weeks,
    html,
    uses_h2h: rankedByH2h.length > 0,
    ranking_source: "entry_league_rank",
    weights: {
      total: FDR_TOTAL_WEIGHT,
      h2h: FDR_H2H_WEIGHT,
    },
  };
}

function topListFromMap(counter, limit = 10) {
  return [...counter.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}

async function buildRecentFantasyMetricsMap(elementIds, elements) {
  const metricsById = {};
  for (const elementId of [...new Set((elementIds || []).map((id) => Number(id || 0)).filter((id) => id > 0))]) {
    const elem = elements?.[elementId] || {};
    const price = Number(elem.now_cost || 0) / 10;
    const bootstrapForm = Number(elem.form || 0) / 10;
    const pointsPerGame = Number(elem.points_per_game || 0) / 10;
    const average = bootstrapForm > 0 ? bootstrapForm : pointsPerGame;
    metricsById[elementId] = {
      cost: Number(price.toFixed(1)),
      form: Number(average.toFixed(1)),
      value: Number((price > 0 ? average / price : 0).toFixed(1)),
    };
  }
  return metricsById;
}

function topPlayerIdListFromCounter(counter, limit = 10) {
  return [...counter.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([rawId, transfers]) => ({
      id: Number(rawId || 0),
      transfers: Number(transfers || 0),
    }));
}

function decoratePlayerLeaders(leaders, elements, metricsById = {}) {
  return (leaders || [])
    .map((leader) => {
      const elementId = Number(leader?.id ?? 0);
      const elem = elements?.[elementId] || {};
      const metrics = metricsById[elementId] || {};
      return {
        id: elementId,
        name: elem.name || `#${elementId}`,
        cost: Number(metrics.cost ?? (Number(elem.now_cost || 0) / 10).toFixed(1)),
        form: Number(metrics.form ?? 0),
        value: Number(metrics.value ?? 0),
        transfers: Number(leader?.transfers ?? 0),
      };
    });
}

async function buildTransferTrends({
  transfersByUid,
  leagueUids,
  currentWeek,
  eventMetaById,
  elements,
}) {
  const pairCounter = new Map();
  const inCounter = new Map();
  const outCounter = new Map();
  const managerCounter = new Map();
  let totalTransfers = 0;

  for (const uid of leagueUids || []) {
    const transfers = transfersByUid?.[uid] || [];
    let managerTransfers = 0;
    for (const transfer of transfers) {
      const { gw } = resolveTransferGwDay(transfer, eventMetaById);
      if (gw !== currentWeek) continue;
      managerTransfers += 1;
      totalTransfers += 1;

      const inId = Number(transfer?.element_in || 0);
      const outId = Number(transfer?.element_out || 0);
      const inName = elements[inId]?.name || `#${inId}`;
      const outName = elements[outId]?.name || `#${outId}`;
      const pair = `${outName} -> ${inName}`;
      pairCounter.set(pair, (pairCounter.get(pair) || 0) + 1);
      if (inId > 0) inCounter.set(inId, (inCounter.get(inId) || 0) + 1);
      if (outId > 0) outCounter.set(outId, (outCounter.get(outId) || 0) + 1);
    }
    if (managerTransfers > 0) {
      managerCounter.set(UID_MAP[uid] || String(uid), managerTransfers);
    }
  }

  const global = await buildGlobalTransferTrends(elements);
  const leagueInLeaders = topPlayerIdListFromCounter(inCounter, 10);
  const leagueOutLeaders = topPlayerIdListFromCounter(outCounter, 10);
  const metricsById = await buildRecentFantasyMetricsMap(
    [...leagueInLeaders.map((item) => item.id), ...leagueOutLeaders.map((item) => item.id)],
    elements
  );

  return {
    league: {
      scope: "league_current_week",
      gw: Number(currentWeek || 0),
      total_transfers: Number(totalTransfers || 0),
      top_pairs: topListFromMap(pairCounter, 10),
      top_in: decoratePlayerLeaders(leagueInLeaders, elements, metricsById),
      top_out: decoratePlayerLeaders(leagueOutLeaders, elements, metricsById),
      top_managers: topListFromMap(managerCounter, 10),
    },
    global,
    overall: {
      scope: "league_current_week",
      gw: Number(currentWeek || 0),
      total_transfers: Number(totalTransfers || 0),
      top_pairs: topListFromMap(pairCounter, 10),
      top_in: decoratePlayerLeaders(leagueInLeaders, elements, metricsById),
      top_out: decoratePlayerLeaders(leagueOutLeaders, elements, metricsById),
      top_managers: topListFromMap(managerCounter, 10),
    },
  };
}

async function buildGlobalTransferTrends(elements) {
  const globalInCounter = new Map();
  const globalOutCounter = new Map();
  for (const [rawId, elem] of Object.entries(elements || {})) {
    if (!elem) continue;
    const inCount = Number(elem.transfers_in_event || 0);
    const outCount = Number(elem.transfers_out_event || 0);
    const elementId = Number(rawId || 0);
    if (inCount > 0) globalInCounter.set(elementId, inCount);
    if (outCount > 0) globalOutCounter.set(elementId, outCount);
  }

  const topIn = topPlayerIdListFromCounter(globalInCounter, 10);
  const topOut = topPlayerIdListFromCounter(globalOutCounter, 10);
  const metricsById = await buildRecentFantasyMetricsMap(
    [...topIn.map((item) => item.id), ...topOut.map((item) => item.id)],
    elements
  );

  return {
    // 全服目前无法获得逐笔“谁换谁”数据，这里展示当前 Event 的全服热门转入/转出。
    top_in: decoratePlayerLeaders(topIn, elements, metricsById),
    top_out: decoratePlayerLeaders(topOut, elements, metricsById),
  };
}

function decodeHtmlEntities(text) {
  return String(text || "")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code || 0)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code || "0", 16)))
    .replace(/&quot;/g, "\"")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function stripHtml(text) {
  return decodeHtmlEntities(String(text || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

async function fetchAllStandings(phase, leagueId = LEAGUE_ID) {
  const rows = [];
  const seenEntries = new Set();
  const targetPhase = Number(phase || 0) || 1;
  const targetLeagueId = Number(leagueId || LEAGUE_ID) || LEAGUE_ID;

  for (let page = 1; page <= 20; page += 1) {
    const data = await fetchJsonSafe(
      `/leagues-classic/${targetLeagueId}/standings/?phase=${targetPhase}&page_standings=${page}`,
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

  const fallback = await fetchJsonSafe(`/leagues-classic/${targetLeagueId}/standings/?phase=${targetPhase}`, 4);
  return Array.isArray(fallback.data?.standings?.results) ? fallback.data.standings.results : [];
}

function buildHomepageLiveDeps() {
  return {
    normalizeUid,
    fetchJson,
    fetchJsonSafe,
    getCurrentEvent,
    buildEventMetaById,
    parseEventMetaFromName,
    extractGwNumber,
    buildWeekEventIds,
    buildElementsMap,
    buildTeamsMetaMap,
    getTeamVisualMeta,
    buildLiveElementsMap,
    buildTeamsPlayingToday,
    resolveFixtureStatus,
    mapLimit,
    rebuildLivePicksFromCachedPlayers,
    calculateEffectiveScore,
    calculateWeekScoresFromHistory,
    buildWeekTotalSummary,
    computeWeekTotalFromSummary,
    buildLivePicksFromPicksData,
    getPlayerStats,
    syncMatchesWithPicksByUid,
    buildResolvedWinProbabilitySummary,
    buildWinProbabilitySummary,
    formatKickoffBj,
    getFixtureRefreshWindowInfo,
    ALL_FIXTURES,
    UID_MAP,
    uidToNumber,
  };
}

function buildManagerMetaDeps() {
  return {
    CACHE_KEY,
    UID_LIST,
    UID_MAP,
    hasDetailedTrendList,
    getState,
    refreshState,
    fetchJson,
    fetchJsonSafe,
    getCurrentEvent,
    buildElementsMap,
    buildEventMetaById,
    parseEventMetaFromName,
    extractGwNumber,
    buildLiveElementsMap,
    buildTeamsMetaMap,
    getTeamVisualMeta,
    buildTeamsPlayingToday,
    buildPreviousPicksByUid,
    mapLimit,
    uidToNumber,
    normalizeUid,
    buildWeeklyTransferSummary,
    getChipDayMapFromHistory,
    getWildcardDayFromHistory,
    getWildcardPostGw17Event,
    getSeasonChipEvent,
    calculateWeekScoresFromHistory,
    buildWeekTotalSummary,
    getCaptainChipEvent,
    buildCaptainUsageSummary,
    buildCaptainUsageFromHistoryOnly,
    buildPersistedChipStatus,
    buildChipStatusSummary,
    buildLivePicksFromPicksData,
    calculateEffectiveScore,
    computeWeekTotalFromSummary,
    buildLineupEconomySummary,
    buildOwnershipSummary,
    buildTransferTrends,
    syncMatchesWithPicksByUid,
    resolveFixtureStatus,
    formatKickoffBj,
    getPlayerStats,
  };
}

function countGoodCaptainManagers(summary) {
  return countGoodCaptainManagersModule(summary);
}

function shouldRefreshManagerMeta(state, value = Date.now()) {
  return shouldRefreshManagerMetaModule(state, value, buildManagerMetaDeps());
}

async function buildFreshHomepageState(baseState) {
  return buildFreshHomepageStateModule(baseState, buildHomepageLiveDeps());
  const matches = Array.isArray(baseState?.h2h) ? baseState.h2h : [];
  if (!matches.length) return baseState;

  const targetUids = [...new Set(
    matches.flatMap((match) => [normalizeUid(match?.uid1), normalizeUid(match?.uid2)]).filter(Boolean)
  )];
  if (!targetUids.length) return baseState;

  const bootstrap = await fetchJson("/bootstrap-static/", 1);
  const events = bootstrap.events || [];
  const [currentEvent, currentEventName] = getCurrentEvent(events);
  if (!currentEvent) return baseState;

  const [liveRaw, fixturesRaw] = await Promise.all([
    fetchJson(`/event/${currentEvent}/live/`, 1),
    fetchJson(`/fixtures/?event=${currentEvent}`, 1),
  ]);
  const eventMetaById = buildEventMetaById(events);
  const currentMeta = eventMetaById[currentEvent] || parseEventMetaFromName(currentEventName || baseState?.current_event_name || "");
  const currentWeek = currentMeta.gw || extractGwNumber(currentEventName) || extractGwNumber(currentEvent) || 22;
  const futureWeekEventIds = buildWeekEventIds(events, currentWeek, currentEvent);
  const elements = buildElementsMap(bootstrap);
  const teamsMetaById = buildTeamsMetaMap(bootstrap, getTeamVisualMeta);
  const liveElements = buildLiveElementsMap(liveRaw);
  const currentFixtures = Array.isArray(fixturesRaw) ? fixturesRaw : [];
  const teamsPlayingToday = buildTeamsPlayingToday(currentFixtures);
  const allCurrentFixturesFinished =
    currentFixtures.length > 0 &&
    currentFixtures.every((fixture) => resolveFixtureStatus(fixture).code === "finished");
  const isWeekResolved = futureWeekEventIds.length === 0 && allCurrentFixturesFinished;
  const freshScoresByUid = {};
  const nextPicksByUid = { ...(baseState?.picks_by_uid || {}) };

  await mapLimit(targetUids, 4, async (uid) => {
    const previous = nextPicksByUid[uid] || {};
    const [picksRes, historyRes] = await Promise.all([
      fetchJsonSafe(`/entry/${uid}/event/${currentEvent}/picks/`, 2),
      fetchJsonSafe(`/entry/${uid}/history/`, 2),
    ]);
    if (!picksRes.ok || !Array.isArray(picksRes.data?.picks)) {
      const sameEvent = Number(previous?.current_event || 0) === Number(currentEvent);
      const previousPlayers = Array.isArray(previous?.players) ? previous.players : [];
      if (sameEvent && previousPlayers.length) {
        const rebuiltPlayers = rebuildLivePicksFromCachedPlayers(previousPlayers, elements, liveElements, teamsMetaById);
        const [freshToday] = calculateEffectiveScore(rebuiltPlayers, teamsPlayingToday);
        let summary = previous?.week_total_summary || null;
        if (historyRes.ok && historyRes.data && typeof historyRes.data === "object") {
          const historyWeek = calculateWeekScoresFromHistory(historyRes.data, currentWeek, currentEvent, eventMetaById);
          if (historyWeek?.has_week_rows) {
            summary = buildWeekTotalSummary(historyWeek, currentEvent, Number(previous?.gd1_missing_penalty || 0));
          }
        }
        const fallbackWeek = Math.max(
          0,
          Number(previous?.event_total || 0) - Number(previous?.total_live || 0) + freshToday
        );
        const freshWeek = computeWeekTotalFromSummary(summary, freshToday) ?? fallbackWeek;
        freshScoresByUid[uid] = {
          total_live: freshToday,
          event_total: freshWeek,
        };
        nextPicksByUid[uid] = {
          ...previous,
          current_event: currentEvent,
          current_event_name: currentEventName,
          players: rebuiltPlayers,
          week_total_summary: summary,
          fetch_status: {
            ...(previous?.fetch_status || {}),
            picks_ok: false,
            history_ok: historyRes.ok || previous?.fetch_status?.history_ok === true,
          },
        };
      } else {
        freshScoresByUid[uid] = {
          total_live: Number(previous?.total_live || 0),
          event_total: Number(previous?.event_total || 0),
        };
      }
      return;
    }

    const picks = buildLivePicksFromPicksData(picksRes.data, elements, liveElements, teamsMetaById);
    const [freshToday] = calculateEffectiveScore(picks, teamsPlayingToday);
    let summary = previous?.week_total_summary || null;
    if (historyRes.ok && historyRes.data && typeof historyRes.data === "object") {
      const historyWeek = calculateWeekScoresFromHistory(historyRes.data, currentWeek, currentEvent, eventMetaById);
      if (historyWeek?.has_week_rows) {
        summary = buildWeekTotalSummary(historyWeek, currentEvent, Number(previous?.gd1_missing_penalty || 0));
      }
    }
    const sameEvent = Number(previous?.current_event || 0) === Number(currentEvent);
    const fallbackWeek = sameEvent
      ? Math.max(
          0,
          Number(previous?.event_total || 0) - Number(previous?.total_live || 0) + freshToday
        )
      : Math.max(0, freshToday);
    const freshWeek = computeWeekTotalFromSummary(summary, freshToday) ?? fallbackWeek;

    freshScoresByUid[uid] = {
      total_live: freshToday,
      event_total: freshWeek,
    };

    nextPicksByUid[uid] = {
      ...previous,
      current_event: currentEvent,
      current_event_name: currentEventName,
      players: picks,
      week_total_summary: summary,
      fetch_status: {
        ...(previous?.fetch_status || {}),
        picks_ok: true,
        history_ok: historyRes.ok || previous?.fetch_status?.history_ok === true,
      },
    };
  });

  for (const uid of targetUids) {
    if (!nextPicksByUid[uid]) continue;
    const fresh = freshScoresByUid[uid];
    if (!fresh) continue;
    nextPicksByUid[uid] = {
      ...nextPicksByUid[uid],
      current_event: currentEvent,
      current_event_name: currentEventName,
      total_live: Number(fresh.total_live || 0),
      event_total: Number(fresh.event_total || 0),
    };
  }

  const teams = {};
  for (const [teamId, meta] of Object.entries(teamsMetaById || {})) {
    teams[Number(teamId)] = meta?.name || `Team #${teamId}`;
  }
  const freshGames = (currentFixtures || []).map((fixture) => {
    const status = resolveFixtureStatus(fixture);
    const homeTeamName = teams[Number(fixture?.team_h || 0)] || `Team #${fixture?.team_h}`;
    const awayTeamName = teams[Number(fixture?.team_a || 0)] || `Team #${fixture?.team_a}`;
    const homeVisual = getTeamVisualMeta(homeTeamName);
    const awayVisual = getTeamVisualMeta(awayTeamName);
    return {
      id: Number(fixture?.id || 0),
      team_h: Number(fixture?.team_h || 0),
      team_a: Number(fixture?.team_a || 0),
      home_team: homeTeamName,
      away_team: awayTeamName,
      home_logo_url: homeVisual.logo_url,
      away_logo_url: awayVisual.logo_url,
      home_color: homeVisual.color,
      away_color: awayVisual.color,
      home_score: Number(fixture?.team_h_score || 0),
      away_score: Number(fixture?.team_a_score || 0),
      started: !!fixture?.started,
      finished: status.code === "finished",
      status_code: status.code,
      status_label: status.label,
      kickoff: formatKickoffBj(fixture?.kickoff_time),
      kickoff_time: fixture?.kickoff_time || null,
    };
  });

  const freshFixtureDetails = {};
  for (const fixture of currentFixtures || []) {
    const homePlayers = [];
    const awayPlayers = [];
    for (const [idText, liveData] of Object.entries(liveElements)) {
      const elementId = Number(idText);
      const elem = elements[elementId] || {};
      const player = {
        id: elementId,
        name: elem.name || `#${elementId}`,
        position: elem.position || 0,
        position_name: elem.position_name || "UNK",
        ...getPlayerStats(elementId, liveElements, elements),
      };
      if (elem.team === Number(fixture?.team_h || 0)) homePlayers.push(player);
      if (elem.team === Number(fixture?.team_a || 0)) awayPlayers.push(player);
    }
    homePlayers.sort((a, b) => Number(b?.fantasy || 0) - Number(a?.fantasy || 0));
    awayPlayers.sort((a, b) => Number(b?.fantasy || 0) - Number(a?.fantasy || 0));
    const homeTeamName = teams[Number(fixture?.team_h || 0)] || `Team #${fixture?.team_h}`;
    const awayTeamName = teams[Number(fixture?.team_a || 0)] || `Team #${fixture?.team_a}`;
    const homeVisual = getTeamVisualMeta(homeTeamName);
    const awayVisual = getTeamVisualMeta(awayTeamName);
    freshFixtureDetails[Number(fixture?.id || 0)] = {
      home_team: homeTeamName,
      away_team: awayTeamName,
      home_logo_url: homeVisual.logo_url,
      away_logo_url: awayVisual.logo_url,
      home_color: homeVisual.color,
      away_color: awayVisual.color,
      home_players: homePlayers,
      away_players: awayPlayers,
    };
  }

  const nextMatches = syncMatchesWithPicksByUid(matches, nextPicksByUid).map((match) => {
    const uid1 = normalizeUid(match?.uid1);
    const uid2 = normalizeUid(match?.uid2);
    const fresh1 = freshScoresByUid[uid1];
    const fresh2 = freshScoresByUid[uid2];
    const total1 = Number(fresh1?.event_total ?? match?.total1 ?? 0);
    const total2 = Number(fresh2?.event_total ?? match?.total2 ?? 0);
    const today1 = Number(fresh1?.total_live ?? match?.today1 ?? 0);
    const today2 = Number(fresh2?.total_live ?? match?.today2 ?? 0);
    const futureDelta1 = Math.max(0, Number(match?.projected_total1 || total1) - Number(match?.total1 || 0));
    const futureDelta2 = Math.max(0, Number(match?.projected_total2 || total2) - Number(match?.total2 || 0));
    const projectedTotal1 = Number((total1 + futureDelta1).toFixed(1));
    const projectedTotal2 = Number((total2 + futureDelta2).toFixed(1));
    const winProb = isWeekResolved
      ? buildResolvedWinProbabilitySummary(total1, total2)
      : buildWinProbabilitySummary(
          { expected_total: projectedTotal1 },
          { expected_total: projectedTotal2 }
        );

    return {
      ...match,
      total1,
      total2,
      today1,
      today2,
      diff: Math.abs(total1 - total2),
      projected_total1: projectedTotal1,
      projected_total2: projectedTotal2,
      win_prob1: winProb.left,
      win_prob2: winProb.right,
      penalty1: Number(nextPicksByUid[uid1]?.penalty_score ?? match?.penalty1 ?? 0),
      penalty2: Number(nextPicksByUid[uid2]?.penalty_score ?? match?.penalty2 ?? 0),
      transfer_count1: Number(nextPicksByUid[uid1]?.transfer_count ?? match?.transfer_count1 ?? 0),
      transfer_count2: Number(nextPicksByUid[uid2]?.transfer_count ?? match?.transfer_count2 ?? 0),
      wildcard1: !!(nextPicksByUid[uid1]?.wildcard_active ?? match?.wildcard1),
      wildcard2: !!(nextPicksByUid[uid2]?.wildcard_active ?? match?.wildcard2),
    };
  });

  return {
    ...baseState,
    current_event: currentEvent,
    current_event_name: currentEventName || baseState?.current_event_name,
    h2h: nextMatches,
    picks_by_uid: nextPicksByUid,
    fixtures: {
      count: freshGames.length,
      games: freshGames,
    },
    fixture_details: {
      ...(baseState?.fixture_details || {}),
      ...freshFixtureDetails,
    },
  };
}

async function getHomepageFreshDecision(state, value = Date.now()) {
  return getHomepageFreshDecisionModule(state, value, buildHomepageLiveDeps());
  const bootstrap = await fetchJson("/bootstrap-static/", 1);
  const events = Array.isArray(bootstrap?.events) ? bootstrap.events : [];
  const [actualCurrentEvent, actualCurrentEventName] = getCurrentEvent(events);
  const refreshWindow = getFixtureRefreshWindowInfo(state?.fixtures?.games || [], value);
  const finalizedEvent = Number(state?.refresh_meta?.live_finalized_event || 0);
  const eventChanged = Number(actualCurrentEvent || 0) !== Number(state?.current_event || 0);
  const shouldFresh =
    eventChanged ||
    refreshWindow.active ||
    (refreshWindow.after_end && Number(actualCurrentEvent || 0) > 0 && finalizedEvent !== Number(actualCurrentEvent || 0));
  return {
    shouldFresh,
    eventChanged,
    actualCurrentEvent: Number(actualCurrentEvent || 0) || null,
    actualCurrentEventName: actualCurrentEventName || null,
    refreshWindow,
    finalizedEvent,
  };
}

async function buildCurrentFixturePayload(baseState = null) {
  return buildCurrentFixturePayloadModule(baseState, buildHomepageLiveDeps());
  const bootstrap = await fetchJson("/bootstrap-static/", 1);
  const events = Array.isArray(bootstrap?.events) ? bootstrap.events : [];
  const [currentEvent, currentEventName] = getCurrentEvent(events);
  if (!currentEvent) {
    return {
      current_event: null,
      current_event_name: baseState?.current_event_name || null,
      fixtures: {
        count: 0,
        games: [],
      },
      fixture_details: {},
    };
  }

  const [liveRaw, fixturesRaw] = await Promise.all([
    fetchJson(`/event/${currentEvent}/live/`, 1),
    fetchJson(`/fixtures/?event=${currentEvent}`, 1),
  ]);
  const elements = buildElementsMap(bootstrap);
  const liveElements = buildLiveElementsMap(liveRaw);
  const teams = {};
  for (const t of bootstrap?.teams || []) teams[t.id] = t.name;
  const fixtures = Array.isArray(fixturesRaw) ? fixturesRaw : [];
  const games = fixtures.map((fixture) => {
    const status = resolveFixtureStatus(fixture);
    const homeTeamName = teams[Number(fixture?.team_h || 0)] || `Team #${fixture?.team_h}`;
    const awayTeamName = teams[Number(fixture?.team_a || 0)] || `Team #${fixture?.team_a}`;
    const homeVisual = getTeamVisualMeta(homeTeamName);
    const awayVisual = getTeamVisualMeta(awayTeamName);
    return {
      id: Number(fixture?.id || 0),
      team_h: Number(fixture?.team_h || 0),
      team_a: Number(fixture?.team_a || 0),
      home_team: homeTeamName,
      away_team: awayTeamName,
      home_logo_url: homeVisual.logo_url,
      away_logo_url: awayVisual.logo_url,
      home_color: homeVisual.color,
      away_color: awayVisual.color,
      home_score: Number(fixture?.team_h_score || 0),
      away_score: Number(fixture?.team_a_score || 0),
      started: !!fixture?.started,
      finished: status.code === "finished",
      status_code: status.code,
      status_label: status.label,
      kickoff: formatKickoffBj(fixture?.kickoff_time),
      kickoff_time: fixture?.kickoff_time || null,
    };
  });

  const fixtureDetails = {};
  for (const fixture of fixtures) {
    const homePlayers = [];
    const awayPlayers = [];
    for (const [idText, liveData] of Object.entries(liveElements)) {
      const elementId = Number(idText);
      const elem = elements[elementId] || {};
      const player = {
        id: elementId,
        name: elem.name || `#${elementId}`,
        position: elem.position || 0,
        position_name: elem.position_name || "UNK",
        ...getPlayerStats(elementId, liveElements, elements),
      };
      if (Number(elem.team || 0) === Number(fixture?.team_h || 0)) homePlayers.push(player);
      if (Number(elem.team || 0) === Number(fixture?.team_a || 0)) awayPlayers.push(player);
    }
    homePlayers.sort((a, b) => Number(b?.fantasy || 0) - Number(a?.fantasy || 0));
    awayPlayers.sort((a, b) => Number(b?.fantasy || 0) - Number(a?.fantasy || 0));
    const homeTeamName = teams[Number(fixture?.team_h || 0)] || `Team #${fixture?.team_h}`;
    const awayTeamName = teams[Number(fixture?.team_a || 0)] || `Team #${fixture?.team_a}`;
    const homeVisual = getTeamVisualMeta(homeTeamName);
    const awayVisual = getTeamVisualMeta(awayTeamName);
    fixtureDetails[Number(fixture?.id || 0)] = {
      home_team: homeTeamName,
      away_team: awayTeamName,
      home_logo_url: homeVisual.logo_url,
      away_logo_url: awayVisual.logo_url,
      home_color: homeVisual.color,
      away_color: awayVisual.color,
      home_players: homePlayers,
      away_players: awayPlayers,
    };
  }

  return {
    current_event: currentEvent,
    current_event_name: currentEventName,
    fixtures: {
      count: games.length,
      games,
    },
    fixture_details: fixtureDetails,
  };
}

function buildChipsUsedSummary(picksByUid) {
  return buildChipsUsedSummaryModule(picksByUid, buildManagerMetaDeps());
  const totalManagers = UID_LIST.length;
  const chips = [
    {
      key: "captain",
      label: "Captain",
      note: "this week",
      isUsed: (payload) => buildPersistedChipStatus(payload).captain_used,
    },
    {
      key: "all_stars",
      label: "All-Stars",
      note: "season",
      isUsed: (payload) => buildPersistedChipStatus(payload).all_stars_used,
    },
    {
      key: "wildcard",
      label: "Wildcard",
      note: "GW17+",
      isUsed: (payload) => buildPersistedChipStatus(payload).wildcard_used,
    },
  ];

  return chips.map((chip) => {
    let usedCount = 0;
    for (const uid of UID_LIST) {
      if (chip.isUsed(picksByUid?.[uid] || null)) usedCount += 1;
    }
    return {
      key: chip.key,
      label: chip.label,
      note: chip.note,
      used_count: usedCount,
      total_count: totalManagers,
      unused_count: Math.max(0, totalManagers - usedCount),
      used_percent: Number(((usedCount / Math.max(1, totalManagers)) * 100).toFixed(1)),
    };
  });
}

function buildGoodCaptainSummary(picksByUid) {
  return buildGoodCaptainSummaryModule(picksByUid, buildManagerMetaDeps());
  const grouped = new Map();

  for (const uid of UID_LIST) {
    const payload = picksByUid?.[uid] || null;
    const captainUsed = payload?.captain_used || {};
    if (!buildPersistedChipStatus(payload).captain_used) continue;

    const captainName = String(
      captainUsed?.captain_name ||
      String(captainUsed?.label || "")
        .replace(/^DAY\d+:\s*/i, "")
        .replace(/^Used:\s*/i, "")
        .replace(/\s+\d+(?:\.\d+)?\s*$/, "")
        .trim() ||
      "Unknown"
    ).trim();
    const day = Number(captainUsed.day || 0) || null;
    const captainPoints = Number(captainUsed.captain_points || 0);
    const key = `${day || 0}__${captainName}__${captainPoints}`;
    const current = grouped.get(key) || {
      captain_name: captainName,
      captain_points: captainPoints,
      day,
      managers: [],
    };

    current.captain_points = Math.max(Number(current.captain_points || 0), captainPoints);
    current.managers.push({
      uid: normalizeUid(uid),
      team_name: String(payload?.team_name || UID_MAP[uidToNumber(uid)] || `#${uid}`),
    });
    grouped.set(key, current);
  }

  return Array.from(grouped.values())
    .map((item) => ({
      ...item,
      managers: (item.managers || []).sort((a, b) =>
        String(a?.team_name || "").localeCompare(String(b?.team_name || ""))
      ),
    }))
    .sort((a, b) =>
      Number(b?.captain_points || 0) - Number(a?.captain_points || 0) ||
      Number(a?.day || 99) - Number(b?.day || 99) ||
      String(a?.captain_name || "").localeCompare(String(b?.captain_name || ""))
    )
    .map((item, index) => ({
      ...item,
      rank: index + 1,
    }));
}

async function refreshManagerMetaState(env, existingState = null, options = {}) {
  return refreshManagerMetaStateModule(env, existingState, options, buildManagerMetaDeps());
  const lightweightCaptainDetails = options?.lightweightCaptainDetails !== false;
  const previousState = existingState || await getState(env);
  if (!previousState) {
    return refreshState(env, { full: true });
  }

  const bootstrap = await fetchJson("/bootstrap-static/");
  const events = bootstrap.events || [];
  const elements = buildElementsMap(bootstrap);
  const [currentEvent, currentEventName] = getCurrentEvent(events);
  const eventMetaById = buildEventMetaById(events);
  const currentMeta = eventMetaById[currentEvent] || parseEventMetaFromName(currentEventName || previousState?.current_event_name || "");
  const currentWeek = currentMeta.gw || extractGwNumber(currentEventName) || extractGwNumber(currentEvent) || 22;
  const [liveRaw, fixturesRaw] = await Promise.all([
    fetchJson(`/event/${currentEvent}/live/`, 1),
    fetchJson(`/fixtures/?event=${currentEvent}`, 1),
  ]);
  const liveElements = buildLiveElementsMap(liveRaw);
  const teamsMetaById = buildTeamsMetaMap(bootstrap, getTeamVisualMeta);
  const currentFixtures = Array.isArray(fixturesRaw) ? fixturesRaw : [];
  const teamsPlayingToday = buildTeamsPlayingToday(currentFixtures);
  const eventLiveCache = {
    [Number(currentEvent || 0)]: liveElements,
  };
  const previousPicksByUid = buildPreviousPicksByUid(previousState);
  const nextPicksByUid = { ...previousPicksByUid };
  const transfersByUid = {};

  await mapLimit(UID_LIST, 4, async (uid) => {
    const uidNumber = uidToNumber(uid);
    const previous = previousPicksByUid[uid] || {};
    const eventChanged = Number(previous?.current_event || 0) !== Number(currentEvent || 0);
    const shouldFetchPicks =
      eventChanged ||
      !Array.isArray(previous?.players) ||
      previous.players.length === 0 ||
      previous?.fetch_status?.picks_ok !== true;
    const shouldFetchHistory =
      eventChanged ||
      previous?.fetch_status?.history_ok !== true ||
      !previous?.chip_status;
    const shouldFetchTransfers = true;

    let picksRes = shouldFetchPicks
      ? await fetchJsonSafe(`/entry/${uidNumber}/event/${currentEvent}/picks/`, 2)
      : { ok: true, data: null };
    let historyRes = shouldFetchHistory
      ? await fetchJsonSafe(`/entry/${uidNumber}/history/`, 2)
      : { ok: true, data: null };
    let transfersRes = shouldFetchTransfers
      ? await fetchJsonSafe(`/entry/${uidNumber}/transfers/`, 2)
      : { ok: true, data: null };

    if (shouldFetchPicks && !picksRes.ok) picksRes = await fetchJsonSafe(`/entry/${uidNumber}/event/${currentEvent}/picks/`, 2);
    if (shouldFetchHistory && !historyRes.ok) historyRes = await fetchJsonSafe(`/entry/${uidNumber}/history/`, 2);
    if (shouldFetchTransfers && !transfersRes.ok) transfersRes = await fetchJsonSafe(`/entry/${uidNumber}/transfers/`, 2);

    const picksData = picksRes.ok && Array.isArray(picksRes.data?.picks) ? picksRes.data : null;
    const historyData = historyRes.ok && typeof historyRes.data === "object" && historyRes.data ? historyRes.data : null;
    const transfersData = transfersRes.ok && Array.isArray(transfersRes.data) ? transfersRes.data : (
      Array.isArray(previous?.raw_transfers) ? previous.raw_transfers : []
    );
    const hasHistoryData = !!historyData;
    const chipDayMap = hasHistoryData
      ? getChipDayMapFromHistory(historyData, currentWeek, currentEvent, eventMetaById)
      : {};
    const transferSummary = hasHistoryData && Array.isArray(transfersData)
      ? buildWeeklyTransferSummary(transfersData, currentWeek, eventMetaById, elements, chipDayMap)
      : {
          records: Array.isArray(previous.transfer_records) ? previous.transfer_records : [],
          total_transfer_count: Number(previous.transfer_count || 0),
          penalty_transfer_count: Number(previous.penalty_transfer_count || previous.transfer_count || 0),
          gd1_transfer_count: Number(previous.gd1_transfer_count || 0),
          gd1_missing_penalty: Number(previous.gd1_missing_penalty || 0),
          penalty_score: Number(previous.penalty_score || 0),
        };
    transfersByUid[uid] = transfersData;

    const wildcardDay = hasHistoryData
      ? getWildcardDayFromHistory(historyData, currentWeek, currentEvent, eventMetaById)
      : Number(previous.wildcard_day || 0) || null;
    const wildcardPostGw17Event = hasHistoryData
      ? getWildcardPostGw17Event(historyData, eventMetaById)
      : Number(previous.wildcard_post_gw17_event || 0) || null;
    const richEvent = hasHistoryData
      ? getSeasonChipEvent(historyData, ["rich"])
      : Number(previous.rich_day || 0) || null;
    const gd1MissingPenalty = Number(transferSummary.gd1_missing_penalty || 0);
    const historyWeek = hasHistoryData
      ? calculateWeekScoresFromHistory(historyData, currentWeek, currentEvent, eventMetaById)
      : null;
    const weekTotalSummary = historyWeek?.has_week_rows
      ? buildWeekTotalSummary(historyWeek, currentEvent, gd1MissingPenalty)
      : (previous.week_total_summary || null);
    const captainChipEvent = hasHistoryData
      ? getCaptainChipEvent(historyData, currentWeek, currentEvent, eventMetaById)
      : null;
    const captainWeek = hasHistoryData
      ? (captainChipEvent?.event ? currentWeek : null)
      : (Number(previous.captain_week || 0) || null);
    const activeChip = String(picksData?.active_chip || (eventChanged ? "" : (previous?.active_chip || ""))).toLowerCase();
    const shouldResolveCaptainDetails = !lightweightCaptainDetails && hasHistoryData && (
      eventChanged ||
      !previous?.captain_used?.used ||
      !previous?.captain_used?.captain_name ||
      Number(previous?.captain_week || 0) !== Number(captainWeek || 0)
    );
    let captainUsed = hasHistoryData
      ? (
          shouldResolveCaptainDetails
            ? await buildCaptainUsageSummary(
                uidNumber,
                historyData,
                currentWeek,
                currentEvent,
                eventMetaById,
                elements,
                eventLiveCache,
                previous.captain_used || null
              )
            : buildCaptainUsageFromHistoryOnly(
                historyData,
                currentWeek,
                currentEvent,
                eventMetaById,
                previous.captain_used || null
              )
        )
      : previous.captain_used || {
          used: false,
          label: "None",
          day: null,
          captain_name: null,
          captain_points: null,
        };
    let players = Array.isArray(previous?.players) ? previous.players : [];
    let totalLive = Number(previous?.total_live || 0);
    let eventTotal = Number(previous?.event_total || 0);
    let lineupEconomy = previous?.lineup_economy || {
      effective_total_cost: 0,
      breakeven_line: 0,
      effective_total_points: 0,
      status: "勉强回本",
    };
    if (picksData) {
      players = buildLivePicksFromPicksData(picksData, elements, liveElements, teamsMetaById);
      if (activeChip === "phcapt") {
        const captainPick = players.find((pick) => pick?.is_captain);
        if (captainPick) {
          const captainDay = Number(captainUsed?.day || currentMeta?.day || 0) || null;
          const captainPoints = Number(captainPick.final_points || 0);
          captainUsed = {
            ...captainUsed,
            used: true,
            day: captainDay,
            captain_name: captainPick.name || captainUsed?.captain_name || null,
            captain_points: captainPoints,
            label: captainDay
              ? `DAY${captainDay}: ${captainPick.name || captainUsed?.captain_name || "None"} ${captainPoints}`
              : `Used: ${captainPick.name || captainUsed?.captain_name || "None"} ${captainPoints}`,
          };
        }
      }
      const [effectiveScore] = calculateEffectiveScore(players, teamsPlayingToday);
      totalLive = Number(effectiveScore || 0);
      eventTotal = computeWeekTotalFromSummary(weekTotalSummary, totalLive)
        ?? (eventChanged ? Math.max(0, totalLive) : Number(previous?.event_total || totalLive || 0));
      lineupEconomy = buildLineupEconomySummary(players);
    } else if (historyWeek?.has_week_rows) {
      const previewTodayScore = Number(
        Number(previous.current_event || 0) === Number(currentEvent)
          ? previous.total_live || historyWeek?.today_points || 0
          : historyWeek?.today_points || 0
      );
      eventTotal = computeWeekTotalFromSummary(weekTotalSummary, previewTodayScore) ?? Number(previous?.event_total || 0);
    }
    const rawChipStatus = hasHistoryData
      ? buildChipStatusSummary(historyData, currentWeek, currentEvent, eventMetaById, captainUsed)
      : buildPersistedChipStatus(previous, { currentWeek, activeChip });
    const chipStatus = buildPersistedChipStatus({
      ...previous,
      current_event_name: currentEventName,
      active_chip: activeChip || null,
      captain_used: captainUsed,
      captain_week: captainWeek,
      chip_status: rawChipStatus,
    }, {
      currentWeek,
      activeChip,
    });

    nextPicksByUid[uid] = {
      ...previous,
      uid: uidNumber,
      team_name: previous.team_name || UID_MAP[uidNumber],
      current_event: currentEvent,
      current_event_name: currentEventName,
      gd1_missing_penalty: gd1MissingPenalty,
      active_chip: activeChip || null,
      total_live: totalLive,
      raw_total_live: totalLive,
      event_total: eventTotal,
      players,
      lineup_economy: lineupEconomy,
      wildcard_active: wildcardDay !== null,
      wildcard_day: wildcardDay,
      wildcard_post_gw17_event: wildcardPostGw17Event ? Number(wildcardPostGw17Event) : null,
      rich_day: richEvent ? Number(richEvent) : null,
      captain_week: captainWeek ? Number(captainWeek) : null,
      transfer_records: transferSummary.records,
      transfer_count: Number(transferSummary.total_transfer_count || 0),
      penalty_transfer_count: Number(transferSummary.penalty_transfer_count || 0),
      raw_transfers: transfersData,
      captain_used: captainUsed,
      chip_status: chipStatus,
      historical_h2h_week_totals: historicalH2hWeekTotals,
      week_total_summary: weekTotalSummary,
      fetch_status: {
        ...(previous.fetch_status || {}),
        picks_ok: !!(picksData || (!shouldFetchPicks && Array.isArray(previous?.players))),
        history_ok: !!(historyData || (!shouldFetchHistory && previous?.fetch_status?.history_ok === true)),
        transfers_ok: !!(transfersRes.ok || (!shouldFetchTransfers && Array.isArray(previous?.transfer_records))),
      },
    };
  });

  const ownershipSummary = buildOwnershipSummary(nextPicksByUid);
  for (const uid of UID_LIST) {
    const players = Array.isArray(nextPicksByUid?.[uid]?.players) ? nextPicksByUid[uid].players : [];
    for (const player of players) {
      const ownership = ownershipSummary.by_element[Number(player?.element_id || 0)];
      const ownershipCount = Number(ownership?.holder_count || 0);
      const ownershipPercent = Number(((ownershipCount / Math.max(1, ownershipSummary.manager_count)) * 100).toFixed(1));
      const todayHasGame = teamsPlayingToday.has(Number(player?.team_id || 0));
      player.ownership_count = ownershipCount;
      player.ownership_percent = ownershipPercent;
      player.today_has_game = todayHasGame;
      player.eo_percent = todayHasGame
        ? Number((player?.is_effective ? 100 - ownershipPercent : -ownershipPercent).toFixed(1))
        : null;
    }
  }
  const chipsUsedSummary = buildChipsUsedSummary(nextPicksByUid);
  const goodCaptainSummary = buildGoodCaptainSummary(nextPicksByUid);
  const nextTransferTrends = await buildTransferTrends({
    transfersByUid,
    leagueUids: UID_LIST,
    currentWeek,
    eventMetaById,
    elements,
  });
  nextTransferTrends.ownership_top = ownershipSummary.top10;
  nextTransferTrends.ownership_manager_count = ownershipSummary.manager_count;

  const nextMatches = syncMatchesWithPicksByUid(Array.isArray(previousState?.h2h) ? previousState.h2h : [], nextPicksByUid).map((match) => {
    const uid1 = normalizeUid(match?.uid1);
    const uid2 = normalizeUid(match?.uid2);
    const left = nextPicksByUid[uid1] || {};
    const right = nextPicksByUid[uid2] || {};
    const total1 = Number(left.event_total ?? match?.total1 ?? 0);
    const total2 = Number(right.event_total ?? match?.total2 ?? 0);
    return {
      ...match,
      total1,
      total2,
      diff: Math.abs(total1 - total2),
      penalty1: Number(left.penalty_score ?? match?.penalty1 ?? 0),
      penalty2: Number(right.penalty_score ?? match?.penalty2 ?? 0),
      transfer_count1: Number(left.transfer_count ?? match?.transfer_count1 ?? 0),
      transfer_count2: Number(right.transfer_count ?? match?.transfer_count2 ?? 0),
      wildcard1: !!(left.wildcard_active ?? match?.wildcard1),
      wildcard2: !!(right.wildcard_active ?? match?.wildcard2),
    };
  });

  const teams = {};
  for (const [teamId, meta] of Object.entries(teamsMetaById || {})) {
    teams[Number(teamId)] = meta?.name || `Team #${teamId}`;
  }
  const freshGames = (currentFixtures || []).map((fixture) => {
    const status = resolveFixtureStatus(fixture);
    const homeTeamName = teams[Number(fixture?.team_h || 0)] || `Team #${fixture?.team_h}`;
    const awayTeamName = teams[Number(fixture?.team_a || 0)] || `Team #${fixture?.team_a}`;
    const homeVisual = getTeamVisualMeta(homeTeamName);
    const awayVisual = getTeamVisualMeta(awayTeamName);
    return {
      id: Number(fixture?.id || 0),
      team_h: Number(fixture?.team_h || 0),
      team_a: Number(fixture?.team_a || 0),
      home_team: homeTeamName,
      away_team: awayTeamName,
      home_logo_url: homeVisual.logo_url,
      away_logo_url: awayVisual.logo_url,
      home_color: homeVisual.color,
      away_color: awayVisual.color,
      home_score: Number(fixture?.team_h_score || 0),
      away_score: Number(fixture?.team_a_score || 0),
      started: !!fixture?.started,
      finished: status.code === "finished",
      status_code: status.code,
      status_label: status.label,
      kickoff: formatKickoffBj(fixture?.kickoff_time),
      kickoff_time: fixture?.kickoff_time || null,
    };
  });
  const freshFixtureDetails = {};
  for (const fixture of currentFixtures || []) {
    const homePlayers = [];
    const awayPlayers = [];
    for (const [idText] of Object.entries(liveElements)) {
      const elementId = Number(idText);
      const elem = elements[elementId] || {};
      const player = {
        id: elementId,
        name: elem.name || `#${elementId}`,
        position: elem.position || 0,
        position_name: elem.position_name || "UNK",
        ...getPlayerStats(elementId, liveElements, elements),
      };
      if (elem.team === Number(fixture?.team_h || 0)) homePlayers.push(player);
      if (elem.team === Number(fixture?.team_a || 0)) awayPlayers.push(player);
    }
    homePlayers.sort((a, b) => Number(b?.fantasy || 0) - Number(a?.fantasy || 0));
    awayPlayers.sort((a, b) => Number(b?.fantasy || 0) - Number(a?.fantasy || 0));
    const homeTeamName = teams[Number(fixture?.team_h || 0)] || `Team #${fixture?.team_h}`;
    const awayTeamName = teams[Number(fixture?.team_a || 0)] || `Team #${fixture?.team_a}`;
    const homeVisual = getTeamVisualMeta(homeTeamName);
    const awayVisual = getTeamVisualMeta(awayTeamName);
    freshFixtureDetails[Number(fixture?.id || 0)] = {
      home_team: homeTeamName,
      away_team: awayTeamName,
      home_logo_url: homeVisual.logo_url,
      away_logo_url: awayVisual.logo_url,
      home_color: homeVisual.color,
      away_color: awayVisual.color,
      home_players: homePlayers,
      away_players: awayPlayers,
    };
  }

  const nextState = {
    ...previousState,
    current_event: currentEvent,
    current_event_name: currentEventName,
    h2h: nextMatches,
    picks_by_uid: nextPicksByUid,
    fixtures: {
      count: freshGames.length,
      games: freshGames,
    },
    fixture_details: {
      ...(previousState?.fixture_details || {}),
      ...freshFixtureDetails,
    },
    transfer_trends: nextTransferTrends,
    chips_used_summary: chipsUsedSummary,
    good_captain_summary: goodCaptainSummary,
    refresh_meta: {
      ...(previousState?.refresh_meta || {}),
      meta_updated_at: new Date().toISOString(),
      meta_mode: "ddl",
      meta_event: Number(currentEvent || 0) || null,
      meta_event_name: currentEventName || null,
    },
  };

  await env.NBA_CACHE.put(CACHE_KEY, JSON.stringify(nextState));
  return nextState;
}

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
    effective_average_count: Number((totalAvailablePlayers / divisor).toFixed(2)),
  };
}

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
      out_name: elements[outId]?.name || `#${outId}`,
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
      is_chip: isChipTransfer,
    };
  });

  gd1MissingPenalty = Math.max(0, gd1TransferCount - 2) * 100;

  return {
    records,
    total_transfer_count: weeklyTransfers.length,
    penalty_transfer_count: nonWildcardTransferCount,
    gd1_transfer_count: gd1TransferCount,
    gd1_missing_penalty: gd1MissingPenalty,
    penalty_score: calculateTransferPenalty(nonWildcardTransferCount),
  };
}

function buildLineupEconomySummary(players) {
  const effectivePlayers = (players || []).filter((player) => player?.is_effective);
  const totalCost =
    effectivePlayers.reduce((sum, player) => {
      const multiplier = player?.is_captain && Number(player?.multiplier || 1) > 1 ? Number(player.multiplier || 1) : 1;
      return sum + Number(player?.now_cost || 0) * multiplier;
    }, 0) / 10;
  const totalPoints = effectivePlayers.reduce((sum, player) => sum + Number(player?.final_points || 0), 0);
  const breakeven = totalCost * 3;
  let status = "勉强回本";
  if (totalPoints < breakeven - 20) {
    status = "血本无归！";
  } else if (totalPoints > breakeven + 20) {
    status = "大爆纯赚";
  }
  return {
    effective_total_cost: Number(totalCost.toFixed(1)),
    breakeven_line: Number(breakeven.toFixed(1)),
    effective_total_points: Number(totalPoints.toFixed(1)),
    status,
  };
}

function getCaptainChipEvent(historyData, currentGw, currentEvent, eventMetaById) {
  for (const item of extractChipHistoryRecords(historyData)) {
    const name = String(item?.name || "").toLowerCase();
    if (name !== "phcapt") continue;
    const itemEvent = Number(item?.event || 0);
    const eventMeta = eventMetaById?.[itemEvent] || {};
    const itemGw = item?.gw || item?.gameweek || eventMeta.gw || extractGwNumber(itemEvent);
    if (itemGw !== currentGw && itemEvent !== currentEvent) continue;
    return {
      event: itemEvent,
      day: Number(eventMeta.day || item?.day || 0) || null,
    };
  }
  return null;
}

function getSeasonChipEvent(historyData, names = []) {
  const normalizedNames = new Set((names || []).map((name) => String(name || "").toLowerCase()).filter(Boolean));
  if (!normalizedNames.size) return null;
  for (const item of extractChipHistoryRecords(historyData)) {
    const rawName = String(item?.name || "").toLowerCase();
    if (!normalizedNames.has(rawName)) continue;
    const itemEvent = Number(item?.event || 0);
    if (itemEvent > 0) return itemEvent;
  }
  return null;
}

function getWildcardPostGw17Event(historyData, eventMetaById, minGw = 17) {
  for (const item of extractChipHistoryRecords(historyData)) {
    const rawName = String(item?.name || "").toLowerCase();
    if (rawName !== "wildcard" && rawName !== "wild_card") continue;
    const itemEvent = Number(item?.event || 0);
    const eventMeta = eventMetaById?.[itemEvent] || {};
    const itemGw = Number(item?.gw || item?.gameweek || eventMeta.gw || extractGwNumber(itemEvent) || 0);
    if (itemEvent > 0 && itemGw >= Number(minGw || 17)) return itemEvent;
  }
  return null;
}

function getPayloadCurrentWeek(payload = {}, fallbackEventName = "") {
  const eventName = String(payload?.current_event_name || fallbackEventName || "");
  const parsed = parseEventMetaFromName(eventName);
  return Number(parsed?.gw || extractGwNumber(eventName) || 0) || null;
}

function buildPersistedChipStatus(payload = {}, options = {}) {
  const current = payload?.chip_status && typeof payload.chip_status === "object" ? payload.chip_status : {};
  const currentWeek = Number(options?.currentWeek || getPayloadCurrentWeek(payload, options?.current_event_name || "")) || null;
  const captainWeek = Number(payload?.captain_week || 0) || null;
  const activeChip = String(options?.activeChip || payload?.active_chip || "").toLowerCase();
  let captainUsed = false;
  if (activeChip === "phcapt") {
    captainUsed = true;
  } else if (captainWeek && currentWeek) {
    captainUsed = captainWeek === currentWeek;
  } else if (captainWeek && !currentWeek) {
    captainUsed = true;
  } else {
    captainUsed = false;
  }
  return {
    captain_used: captainUsed,
    wildcard_used: !!(current?.wildcard_used || payload?.wildcard_post_gw17_event),
    all_stars_used: !!(current?.all_stars_used || payload?.rich_day),
  };
}

function syncMatchesWithPicksByUid(matches, picksByUid) {
  return (Array.isArray(matches) ? matches : []).map((match) => {
    const uid1 = normalizeUid(match?.uid1);
    const uid2 = normalizeUid(match?.uid2);
    return {
      ...match,
      chip_status1: picksByUid?.[uid1]?.chip_status || null,
      chip_status2: picksByUid?.[uid2]?.chip_status || null,
    };
  });
}

function normalizeStateChipStatus(state) {
  if (!state || typeof state !== "object") return state;
  const currentShape = state?.picks_by_uid;
  if (!currentShape || typeof currentShape !== "object") return state;

  const nextPicksByUid = {};
  for (const [uid, payload] of Object.entries(currentShape)) {
    nextPicksByUid[uid] = {
      ...payload,
      chip_status: buildPersistedChipStatus(payload),
    };
  }

  return {
    ...state,
    picks_by_uid: nextPicksByUid,
    h2h: syncMatchesWithPicksByUid(state?.h2h, nextPicksByUid),
  };
}

function buildCaptainUsageFromHistoryOnly(historyData, currentGw, currentEvent, eventMetaById, previousCaptainUsed = null) {
  const chipEvent = getCaptainChipEvent(historyData, currentGw, currentEvent, eventMetaById);
  if (!chipEvent?.event) {
    return previousCaptainUsed && previousCaptainUsed.used === false
      ? previousCaptainUsed
      : {
          used: false,
          label: "None",
          day: null,
          captain_name: null,
          captain_points: null,
        };
  }

  return {
    ...(previousCaptainUsed || {}),
    used: true,
    day: Number(chipEvent.day || 0) || null,
    label: chipEvent.day ? `DAY${chipEvent.day}` : "Used",
    captain_name: previousCaptainUsed?.captain_name || null,
    captain_points: previousCaptainUsed?.captain_points || null,
  };
}

function buildChipStatusSummary(historyData, currentGw, currentEvent, eventMetaById, captainUsed = null) {
  let wildcardUsed = false;
  let allStarsUsed = false;

  for (const item of extractChipHistoryRecords(historyData)) {
    const rawName = String(item?.name || "").toLowerCase();
    if (!rawName) continue;
    const itemEvent = Number(item?.event || 0);
    const eventMeta = eventMetaById?.[itemEvent] || {};
    const itemGw = Number(item?.gw || item?.gameweek || eventMeta.gw || extractGwNumber(itemEvent) || 0);

    if (!wildcardUsed && (rawName === "wildcard" || rawName === "wild_card") && itemGw >= 17) {
      wildcardUsed = true;
    }
    if (!allStarsUsed && rawName === "rich") {
      allStarsUsed = true;
    }
    if (wildcardUsed && allStarsUsed) break;
  }

  return {
    captain_used: !!captainUsed?.used,
    wildcard_used: wildcardUsed,
    all_stars_used: allStarsUsed,
  };
}

async function buildCaptainUsageSummary(
  uidNumber,
  historyData,
  currentGw,
  currentEvent,
  eventMetaById,
  elements,
  eventLiveCache,
  previousCaptainUsed = null
) {
  const chipEvent = getCaptainChipEvent(historyData, currentGw, currentEvent, eventMetaById);
  if (!chipEvent?.event) {
    return {
      used: false,
      label: "None",
      day: null,
      captain_name: null,
      captain_points: null,
    };
  }

  const picksRes = await fetchJsonSafe(`/entry/${uidNumber}/event/${chipEvent.event}/picks/`, 4);
  if (!picksRes.ok) {
    if (previousCaptainUsed?.used && previousCaptainUsed?.captain_name) {
      return {
        ...previousCaptainUsed,
        used: true,
        day: Number(previousCaptainUsed?.day || chipEvent.day || 0) || null,
        label: previousCaptainUsed?.label || (chipEvent.day ? `DAY${chipEvent.day}` : "Used"),
      };
    }
    return {
      used: true,
      label: chipEvent.day ? `DAY${chipEvent.day}: None` : "Used",
      day: chipEvent.day,
      captain_name: null,
      captain_points: null,
    };
  }
  const picks = Array.isArray(picksRes.data?.picks) ? picksRes.data.picks : [];
  const captainPick = picks.find((pick) => pick?.is_captain);
  if (!captainPick) {
    if (previousCaptainUsed?.used && previousCaptainUsed?.captain_name) {
      return {
        ...previousCaptainUsed,
        used: true,
        day: Number(previousCaptainUsed?.day || chipEvent.day || 0) || null,
        label: previousCaptainUsed?.label || (chipEvent.day ? `DAY${chipEvent.day}` : "Used"),
      };
    }
    return {
      used: true,
      label: chipEvent.day ? `DAY${chipEvent.day}: None` : "Used",
      day: chipEvent.day,
      captain_name: null,
      captain_points: null,
    };
  }

  if (!eventLiveCache[chipEvent.event]) {
    const liveRes = await fetchJsonSafe(`/event/${chipEvent.event}/live/`, 4);
    const rawElements = liveRes.ok ? liveRes.data?.elements : null;
    if (!liveRes.ok && previousCaptainUsed?.used && previousCaptainUsed?.captain_name) {
      return {
        ...previousCaptainUsed,
        used: true,
        day: Number(previousCaptainUsed?.day || chipEvent.day || 0) || null,
        label: previousCaptainUsed?.label || (chipEvent.day ? `DAY${chipEvent.day}` : "Used"),
      };
    }
    if (!liveRes.ok) {
      const dayLabel = chipEvent.day ? `DAY${chipEvent.day}` : "DAY?";
      const elementId = Number(captainPick.element || 0);
      const elem = elements[elementId] || {};
      const captainName = elem.name || previousCaptainUsed?.captain_name || `#${elementId}`;
      return {
        used: true,
        label: `${dayLabel}: ${captainName}${Number.isFinite(Number(previousCaptainUsed?.captain_points)) ? ` ${Number(previousCaptainUsed?.captain_points)}` : ""}`,
        day: chipEvent.day,
        captain_name: captainName,
        captain_points: Number.isFinite(Number(previousCaptainUsed?.captain_points)) ? Number(previousCaptainUsed?.captain_points) : null,
      };
    }
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
    captain_points: finalPoints,
  };
}

async function buildFreshManagerPanelPayload(baseState, uid) {
  const normalizedUid = normalizeUid(uid);
  if (!normalizedUid) return {};
  const uidNumber = uidToNumber(normalizedUid);
  const previous = baseState?.picks_by_uid?.[normalizedUid] || {};
  const bootstrap = await fetchJson("/bootstrap-static/", 1);
  const events = bootstrap.events || [];
  const [currentEvent, currentEventName] = getCurrentEvent(events);
  const eventMetaById = buildEventMetaById(events);
  const currentMeta = eventMetaById[currentEvent] || parseEventMetaFromName(currentEventName || previous?.current_event_name || "");
  const currentWeek = currentMeta.gw || extractGwNumber(currentEventName) || extractGwNumber(currentEvent) || 22;
  const elements = buildElementsMap(bootstrap);
  const teamsMetaById = buildTeamsMetaMap(bootstrap, getTeamVisualMeta);
  const eventLiveCache = {};

  let [picksRes, historyRes, transfersRes] = await Promise.all([
    fetchJsonSafe(`/entry/${uidNumber}/event/${currentEvent}/picks/`, 2),
    fetchJsonSafe(`/entry/${uidNumber}/history/`, 2),
    fetchJsonSafe(`/entry/${uidNumber}/transfers/`, 2),
  ]);
  if (!picksRes.ok) picksRes = await fetchJsonSafe(`/entry/${uidNumber}/event/${currentEvent}/picks/`, 2);
  if (!historyRes.ok) historyRes = await fetchJsonSafe(`/entry/${uidNumber}/history/`, 2);
  if (!transfersRes.ok) transfersRes = await fetchJsonSafe(`/entry/${uidNumber}/transfers/`, 2);

  const picksData = picksRes.ok ? picksRes.data : null;
  const historyData = historyRes.ok && historyRes.data && typeof historyRes.data === "object" ? historyRes.data : null;
  const transfersData = transfersRes.ok && Array.isArray(transfersRes.data) ? transfersRes.data : [];
  const hasHistoryData = !!historyData;
  const chipDayMap = hasHistoryData
    ? getChipDayMapFromHistory(historyData, currentWeek, currentEvent, eventMetaById)
    : {};
  const wildcardDay = hasHistoryData
    ? getWildcardDayFromHistory(historyData, currentWeek, currentEvent, eventMetaById)
    : Number(previous.wildcard_day || 0) || null;
  const wildcardPostGw17Event = hasHistoryData
    ? getWildcardPostGw17Event(historyData, eventMetaById)
    : Number(previous.wildcard_post_gw17_event || 0) || null;
  const richDay = hasHistoryData
    ? getSeasonChipEvent(historyData, ["rich"])
    : Number(previous.rich_day || 0) || null;
  const transferSummary = hasHistoryData && transfersRes.ok
    ? buildWeeklyTransferSummary(transfersData, currentWeek, eventMetaById, elements, chipDayMap)
    : {
        records: Array.isArray(previous.transfer_records) ? previous.transfer_records : [],
        total_transfer_count: Number(previous.transfer_count || 0),
        penalty_transfer_count: Number(previous.penalty_transfer_count || previous.transfer_count || 0),
        gd1_transfer_count: Number(previous.gd1_transfer_count || 0),
        gd1_missing_penalty: Number(previous.gd1_missing_penalty || 0),
        penalty_score: Number(previous.penalty_score || 0),
      };
  const activeChip = String(picksData?.active_chip || "").toLowerCase();
  const captainChipEvent = hasHistoryData
    ? getCaptainChipEvent(historyData, currentWeek, currentEvent, eventMetaById)
    : null;
  const captainWeek = hasHistoryData
    ? (captainChipEvent?.event ? currentWeek : null)
    : (Number(previous.captain_week || 0) || null);
  let captainUsed = hasHistoryData
    ? await buildCaptainUsageSummary(
        uidNumber,
        historyData,
        currentWeek,
        currentEvent,
        eventMetaById,
        elements,
        eventLiveCache,
        previous.captain_used || null
      )
    : (previous.captain_used || { used: false, label: "None", day: null, captain_name: null, captain_points: null });

  if (activeChip === "phcapt" && Array.isArray(picksData?.picks)) {
    if (!eventLiveCache[currentEvent]) {
      const liveRes = await fetchJsonSafe(`/event/${currentEvent}/live/`, 2);
      if (liveRes.ok) eventLiveCache[currentEvent] = buildLiveElementsMap(liveRes.data);
    }
    const currentPicks = buildLivePicksFromPicksData(
      picksData,
      elements,
      eventLiveCache[currentEvent] || {},
      teamsMetaById
    );
    const captainPick = currentPicks.find((pick) => pick?.is_captain);
    if (captainPick) {
      const captainDay = Number(captainUsed?.day || currentMeta?.day || 0) || null;
      const captainPoints = Number(captainPick.final_points || 0);
      captainUsed = {
        ...captainUsed,
        used: true,
        day: captainDay,
        captain_name: captainPick.name || captainUsed?.captain_name || null,
        captain_points: Number.isFinite(captainPoints) ? captainPoints : (captainUsed?.captain_points ?? null),
        label: captainDay
          ? `DAY${captainDay}: ${captainPick.name || captainUsed?.captain_name || "None"} ${Number.isFinite(captainPoints) ? captainPoints : (captainUsed?.captain_points ?? "")}`.trim()
          : `Used: ${captainPick.name || captainUsed?.captain_name || "None"} ${Number.isFinite(captainPoints) ? captainPoints : (captainUsed?.captain_points ?? "")}`.trim(),
      };
    }
  }

  const rawChipStatus = hasHistoryData
    ? buildChipStatusSummary(historyData, currentWeek, currentEvent, eventMetaById, captainUsed)
    : buildPersistedChipStatus(previous, { currentWeek, activeChip });
  const persistedChipStatus = buildPersistedChipStatus({
    ...previous,
    current_event_name: currentEventName,
    active_chip: activeChip || null,
    captain_used: captainUsed,
    captain_week: activeChip === "phcapt" ? currentWeek : captainWeek,
    chip_status: rawChipStatus,
  }, {
    currentWeek,
    activeChip,
  });

  return {
    ...previous,
    uid: uidNumber,
    team_name: previous.team_name || UID_MAP[uidNumber],
    current_event: currentEvent,
    current_event_name: currentEventName,
    active_chip: activeChip || null,
    transfer_records: transferSummary.records,
    transfer_count: Number(transferSummary.total_transfer_count || 0),
    penalty_transfer_count: Number(transferSummary.penalty_transfer_count || 0),
    gd1_transfer_count: Number(transferSummary.gd1_transfer_count || 0),
    gd1_missing_penalty: Number(transferSummary.gd1_missing_penalty || 0),
    penalty_score: Number(transferSummary.penalty_score || 0),
    wildcard_day: wildcardDay,
    wildcard_post_gw17_event: wildcardPostGw17Event ? Number(wildcardPostGw17Event) : null,
    rich_day: richDay ? Number(richDay) : null,
    captain_week: activeChip === "phcapt"
      ? Number(currentWeek || 0) || null
      : (captainWeek ? Number(captainWeek) : null),
    captain_used: captainUsed,
    chip_status: persistedChipStatus,
    fetch_status: {
      ...(previous.fetch_status || {}),
      picks_ok: !!picksRes.ok,
      history_ok: !!historyRes.ok,
      transfers_ok: !!transfersRes.ok,
    },
  };
}

function buildWeekEventIds(events, currentWeek, currentEvent) {
  return (events || [])
    .filter((event) => {
      const meta = parseEventMetaFromName(event?.name || "");
      return Number(meta.gw || 0) === Number(currentWeek || 0);
    })
    .map((event) => Number(event.id))
    .filter((eventId) => eventId > Number(currentEvent || 0))
    .sort((a, b) => a - b);
}

function buildUpcomingEventIds(events, currentEvent, limit = 7) {
  const currentId = Number(currentEvent || 0);
  return (events || [])
    .map((event) => Number(event?.id || 0))
    .filter((eventId) => eventId >= currentId)
    .sort((a, b) => a - b)
    .slice(0, limit);
}

function formatEventShortLabel(eventMeta, eventId, fallbackIndex = 0) {
  const gw = Number(eventMeta?.gw || 0);
  const day = Number(eventMeta?.day || 0);
  if (gw > 0 && day > 0) return `GW${gw}.${day}`;
  if (day > 0) return `DAY${day}`;
  return `E${Number(eventId || 0) || fallbackIndex + 1}`;
}

function buildUpcomingDayContexts(upcomingEventIds, eventMetaById, fixturesByEvent) {
  return (upcomingEventIds || []).map((eventId, index) => {
    const meta = eventMetaById?.[eventId] || {};
    return {
      event_id: Number(eventId || 0),
      gw: Number(meta.gw || 0) || null,
      day: Number(meta.day || 0) || null,
      day_label: formatEventShortLabel(meta, eventId, index),
      teams_playing: buildTeamsPlayingToday(fixturesByEvent?.[eventId] || []),
    };
  });
}

function buildFixtureLookup(fixtures, teamsMetaById) {
  const lookup = {};
  for (const fixture of fixtures || []) {
    const homeId = Number(fixture?.team_h || 0);
    const awayId = Number(fixture?.team_a || 0);
    if (!homeId || !awayId) continue;
    const homeMeta = teamsMetaById?.[homeId] || {};
    const awayMeta = teamsMetaById?.[awayId] || {};
    lookup[homeId] = {
      opponent_team_id: awayId,
      opponent_name: awayMeta?.name || `Team #${awayId}`,
      opponent_short: awayMeta?.short_name || awayMeta?.name || `#${awayId}`,
      opponent_logo_url: awayMeta?.logo_url || "/nba-team-logos/_.png",
      venue_label: "vs",
    };
    lookup[awayId] = {
      opponent_team_id: homeId,
      opponent_name: homeMeta?.name || `Team #${homeId}`,
      opponent_short: homeMeta?.short_name || homeMeta?.name || `#${homeId}`,
      opponent_logo_url: homeMeta?.logo_url || "/nba-team-logos/_.png",
      venue_label: "@",
    };
  }
  return lookup;
}

function getNextEventInfo(events, currentEvent) {
  const currentId = Number(currentEvent || 0);
  const candidates = (events || [])
    .map((event) => ({
      id: Number(event?.id || 0),
      name: event?.name || "",
      meta: parseEventMetaFromName(event?.name || ""),
      deadline: event?.deadline_time || null,
    }))
    .filter((event) => event.id > currentId)
    .sort((a, b) => a.id - b.id);
  return candidates[0] || null;
}

function normalizeTeamName(value) {
  const raw = String(value || "").trim().toLowerCase();
  const aliasMap = {
    "la clippers": "los angeles clippers",
    "los angeles clippers": "los angeles clippers",
    "la lakers": "los angeles lakers",
    "los angeles lakers": "los angeles lakers",
    "ny knicks": "new york knicks",
    "new york knicks": "new york knicks",
    "gs warriors": "golden state warriors",
    "golden state warriors": "golden state warriors",
    "no pelicans": "new orleans pelicans",
    "new orleans pelicans": "new orleans pelicans",
    "okc thunder": "oklahoma city thunder",
    "oklahoma city thunder": "oklahoma city thunder",
    "sa spurs": "san antonio spurs",
    "san antonio spurs": "san antonio spurs",
    "utah jazz": "utah jazz",
    "portland trail blazers": "portland trail blazers",
    "phoenix suns": "phoenix suns",
  };
  const base = aliasMap[raw] || raw;
  return base.replace(/[^a-z0-9]+/g, " ").trim();
}

function parseEspnInjuryPage(html) {
  const blocks = [];
  const blockRegex = /<span class="injuries__teamName[^"]*">([\s\S]*?)<\/span>[\s\S]*?<tbody class="Table__TBODY">([\s\S]*?)<\/tbody>/g;
  let blockMatch;
  while ((blockMatch = blockRegex.exec(html))) {
    const teamName = stripHtml(blockMatch[1]);
    const tbody = blockMatch[2];
    const injuries = [];
    const rowRegex = /<tr class="Table__TR[\s\S]*?<\/tr>/g;
    let rowMatch;
    while ((rowMatch = rowRegex.exec(tbody))) {
      const row = rowMatch[0];
      const cells = [...row.matchAll(/<td class="[^"]*Table__TD[^"]*">([\s\S]*?)<\/td>/g)].map((match) => stripHtml(match[1]));
      if (cells.length < 5) continue;
      injuries.push({
        player_name: cells[0],
        position: cells[1],
        est_return_date: cells[2],
        status: cells[3],
        comment: cells[4],
      });
    }
    blocks.push({
      team_name: teamName,
      team_key: normalizeTeamName(teamName),
      injuries,
    });
  }
  return blocks;
}

function extractAvailabilityFromComment(comment, fallbackStatus = "") {
  const text = String(comment || "").toLowerCase();
  const fallback = String(fallbackStatus || "").trim().toLowerCase();
  if (text.includes("day-to-day") || text.includes("day to day")) return "questionable";
  const tags = ["questionable", "probable", "doubtful", "out", "available"];
  for (const tag of tags) {
    if (text.includes(tag)) return tag;
  }
  if (fallback === "day-to-day" || fallback === "day to day") return "questionable";
  return fallback || "unknown";
}

function formatInjuryStatus(status) {
  const normalized = String(status || "").trim().toLowerCase();
  if (!normalized) return "Unknown";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function sortInjuriesByPriority(injuries) {
  const order = {
    available: 0,
    probable: 1,
    questionable: 2,
    doubtful: 3,
    out: 4,
  };
  return [...(injuries || [])].sort((a, b) => {
    const left = Number(a?.status_order ?? order[String(a?.status_short || "").toLowerCase()] ?? 99);
    const right = Number(b?.status_order ?? order[String(b?.status_short || "").toLowerCase()] ?? 99);
    return left - right || String(a?.player_name || "").localeCompare(String(b?.player_name || ""));
  });
}

function getTeamVisualMeta(teamName) {
  const key = normalizeTeamName(teamName);
  const visualMap = {
    "atlanta hawks": { logo: "hawks.png", color: "#E03A3E" },
    "boston celtics": { logo: "celtics.png", color: "#007A33" },
    "brooklyn nets": { logo: "nets.png", color: "#111111" },
    "charlotte hornets": { logo: "hornets.png", color: "#1D1160" },
    "chicago bulls": { logo: "bulls.png", color: "#CE1141" },
    "cleveland cavaliers": { logo: "cavaliers.png", color: "#6F263D" },
    "dallas mavericks": { logo: "mavericks.png", color: "#00538C" },
    "denver nuggets": { logo: "nuggets.png", color: "#0E2240" },
    "detroit pistons": { logo: "pistons.png", color: "#C8102E" },
    "golden state warriors": { logo: "warriors.png", color: "#1D428A" },
    "houston rockets": { logo: "rockets.png", color: "#CE1141" },
    "indiana pacers": { logo: "pacers.png", color: "#002D62" },
    "los angeles clippers": { logo: "clippers.png", color: "#C8102E" },
    "los angeles lakers": { logo: "lakers.png", color: "#552583" },
    "memphis grizzlies": { logo: "grizzlies.png", color: "#5D76A9" },
    "miami heat": { logo: "heat.png", color: "#98002E" },
    "milwaukee bucks": { logo: "bucks.png", color: "#00471B" },
    "minnesota timberwolves": { logo: "timberwolves.png", color: "#0C2340" },
    "new orleans pelicans": { logo: "pelicans.png", color: "#0C2340" },
    "new york knicks": { logo: "knicks.png", color: "#006BB6" },
    "oklahoma city thunder": { logo: "thunder.png", color: "#007AC1" },
    "orlando magic": { logo: "magic.png", color: "#0077C0" },
    "philadelphia 76ers": { logo: "sixers.png", color: "#006BB6" },
    "phoenix suns": { logo: "suns.png", color: "#1D1160" },
    "portland trail blazers": { logo: "blazers.png", color: "#E03A3E" },
    "sacramento kings": { logo: "kings.png", color: "#5A2D81" },
    "san antonio spurs": { logo: "spurs.png", color: "#111111" },
    "toronto raptors": { logo: "raptors.png", color: "#CE1141" },
    "utah jazz": { logo: "jazz.png", color: "#002B5C" },
    "washington wizards": { logo: "wizards.png", color: "#002B5C" },
  };
  const visual = visualMap[key] || { logo: "_.png", color: "#334155" };
  return {
    ...visual,
    logo_url: `/nba-team-logos/${visual.logo}`,
  };
}

async function getInjuryCache(env) {
  const raw = await env.NBA_CACHE.get(INJURY_CACHE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function fetchNextDayInjuriesPayload() {
  const bootstrap = await fetchJson("/bootstrap-static/");
  const events = bootstrap.events || [];
  const [currentEvent, currentEventName] = getCurrentEvent(events);
  const nextEvent = getNextEventInfo(events, currentEvent);
  if (!nextEvent?.id) {
    return {
      current_event: currentEvent,
      current_event_name: currentEventName,
      next_event: null,
      next_event_name: null,
      target_date: null,
      games_count: 0,
      teams: [],
    };
  }

  const fixtures = await fetchJson(`/fixtures/?event=${nextEvent.id}`);
  const teamsById = {};
  for (const team of bootstrap.teams || []) {
    teamsById[Number(team?.id || 0)] = team?.name || `Team #${team?.id}`;
  }

  const games = (fixtures || []).map((fixture) => ({
    id: Number(fixture?.id || 0),
    home_team: teamsById[Number(fixture?.team_h || 0)] || `Team #${fixture?.team_h}`,
    away_team: teamsById[Number(fixture?.team_a || 0)] || `Team #${fixture?.team_a}`,
    kickoff_time: fixture?.kickoff_time || null,
  }));

  const teamOpponents = {};
  let targetDate = null;
  for (const game of games) {
    if (!targetDate && game.kickoff_time) {
      targetDate = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Shanghai",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(game.kickoff_time));
    }
    teamOpponents[normalizeTeamName(game.home_team)] = {
      team_name: game.home_team,
      opponent: game.away_team,
      kickoff_time: game.kickoff_time,
      home_away: "home",
    };
    teamOpponents[normalizeTeamName(game.away_team)] = {
      team_name: game.away_team,
      opponent: game.home_team,
      kickoff_time: game.kickoff_time,
      home_away: "away",
    };
  }

  const espnHtml = await fetchTextUrl("https://www.espn.com/nba/injuries", 1);
  const espnTeams = parseEspnInjuryPage(espnHtml);

  const teams = Object.entries(teamOpponents)
    .map(([teamKey, info]) => {
      const matched = espnTeams.find((team) => team.team_key === teamKey);
      const visual = getTeamVisualMeta(info.team_name);
      return {
        team_name: info.team_name,
        opponent: info.opponent,
        home_away: info.home_away,
        kickoff_time: info.kickoff_time,
        team_color: visual.color,
        logo_url: visual.logo_url,
        injury_count: Array.isArray(matched?.injuries) ? matched.injuries.length : 0,
        injuries: Array.isArray(matched?.injuries)
          ? sortInjuriesByPriority(matched.injuries.map((injury) => {
              const short = extractAvailabilityFromComment(injury.comment, injury.status);
              const normalizedShort = String(short || "").trim().toLowerCase();
              const order = {
                available: 0,
                probable: 1,
                questionable: 2,
                doubtful: 3,
                out: 4,
              };
              return {
                ...injury,
                status_short: formatInjuryStatus(normalizedShort),
                status_order: Number(order[normalizedShort] || 99),
              };
            }))
          : [],
      };
    })
    .sort((a, b) => a.team_name.localeCompare(b.team_name));

  return {
    current_event: currentEvent,
    current_event_name: currentEventName,
    next_event: nextEvent.id,
    next_event_name: nextEvent.name || `Event ${nextEvent.id}`,
    target_date: targetDate,
    games_count: games.length,
    teams,
  };
}

function getProjectedPlayerScore(player) {
  const formValue = Number(player?.form || 0) / 10;
  const ppgValue = Number(player?.points_per_game || 0) / 10;
  const nextValue = Number(player?.ep_next || 0) / 10;
  let projected = 0;
  if (formValue > 0 && ppgValue > 0 && nextValue > 0) {
    projected = formValue * 0.6 + ppgValue * 0.25 + nextValue * 0.15;
  } else if (formValue > 0 && ppgValue > 0) {
    projected = formValue * 0.7 + ppgValue * 0.3;
  } else if (formValue > 0) {
    projected = formValue;
  } else if (ppgValue > 0 && nextValue > 0) {
    projected = ppgValue * 0.75 + nextValue * 0.25;
  } else {
    projected = ppgValue > 0 ? ppgValue : nextValue;
  }
  return Number(projected.toFixed(1));
}

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
  const total =
    settledPoints +
    Number(todayScore || 0) -
    settledTransferCost -
    todayTransferCost -
    manualDay1Penalty;

  return Math.max(0, Math.round(total));
}

function computeCompletedWeekTotalForGw(historyData, transfersData, targetWeek, eventMetaById, elements) {
  const week = Number(targetWeek || 0);
  if (!week) return null;

  const weekEventIds = Object.entries(eventMetaById || {})
    .filter(([, meta]) => Number(meta?.gw || 0) === week)
    .map(([eventId]) => Number(eventId || 0))
    .filter((eventId) => eventId > 0)
    .sort((a, b) => a - b);
  const finalEventId = weekEventIds[weekEventIds.length - 1];
  if (!finalEventId) return null;

  const historyWeek = calculateWeekScoresFromHistory(historyData, week, finalEventId, eventMetaById);
  if (!historyWeek?.has_week_rows) return null;

  const chipDayMap = getChipDayMapFromHistory(historyData, week, 0, eventMetaById);
  const transferSummary = buildWeeklyTransferSummary(
    Array.isArray(transfersData) ? transfersData : [],
    week,
    eventMetaById,
    elements,
    chipDayMap
  );
  const finalDayScore = Number(historyWeek.points_by_event?.[finalEventId] || historyWeek.today_points || 0);
  return computeWeekTotalFromHistory(
    historyWeek,
    finalEventId,
    finalDayScore,
    Number(transferSummary.gd1_missing_penalty || 0)
  );
}

function calculateProjectedFutureScore(players, futureTeamsByEvent) {
  let total = 0;
  let bestCaptainCandidate = 0;
  let projectedSlots = 0;

  for (const teamSet of futureTeamsByEvent) {
    const simulated = (players || []).map((player) => ({
      ...player,
      final_points: Number(player?.projected_points || 0),
      is_effective: false,
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
    best_captain_candidate: Number(bestCaptainCandidate.toFixed(1)),
  };
}

function buildManagerProjectionSummary(payload, futureTeamsByEvent) {
  const players = Array.isArray(payload?.players) ? payload.players : [];
  const projectedPlayers = players.map((player) => ({
    ...player,
    projected_points: getProjectedPlayerScore(player),
  }));
  const futureSummary = calculateProjectedFutureScore(projectedPlayers, futureTeamsByEvent);
  const captainUsed = payload?.captain_used || {};
  const captainBonus = !captainUsed.used && futureSummary.best_captain_candidate > 0
    ? WIN_PROB_CAPTAIN_BONUS
    : 0;
  const remainingFt = Math.max(0, 2 - Number(payload?.penalty_transfer_count || 0));
  const ftBonus = Number((remainingFt * WIN_PROB_FT_BONUS).toFixed(1));
  const expectedTotal = Number((
    Number(payload?.event_total || 0) +
    Number(futureSummary.projected_future_score || 0) +
    captainBonus +
    ftBonus
  ).toFixed(1));

  return {
    projected_future_score: Number(futureSummary.projected_future_score || 0),
    projected_slots: Number(futureSummary.projected_slots || 0),
    best_captain_candidate: Number(futureSummary.best_captain_candidate || 0),
    captain_bonus: captainBonus,
    remaining_ft: remainingFt,
    ft_bonus: ftBonus,
    expected_total: expectedTotal,
  };
}

function buildWinProbabilitySummary(left, right) {
  const diff = Number(left.expected_total || 0) - Number(right.expected_total || 0);
  const leftProb = 1 / (1 + Math.exp(-diff / WIN_PROB_LOGISTIC_SCALE));
  const leftPct = Math.max(5, Math.min(95, Math.round(leftProb * 100)));
  const rightPct = 100 - leftPct;
  return {
    left: leftPct,
    right: rightPct,
  };
}

function buildResolvedWinProbabilitySummary(leftScore, rightScore) {
  const left = Number(leftScore || 0);
  const right = Number(rightScore || 0);
  if (left > right) return { left: 100, right: 0 };
  if (right > left) return { left: 0, right: 100 };
  return { left: 50, right: 50 };
}

function hasDetailedTransferTrendRows(transferTrends) {
  const sample =
    transferTrends?.league?.top_in?.[0] ||
    transferTrends?.overall?.top_in?.[0] ||
    transferTrends?.global?.top_in?.[0] ||
    null;
  if (!sample || typeof sample !== "object") return false;
  return ["cost", "form", "value", "transfers"].every((key) => key in sample)
    && Number(sample.cost || 0) > 0
    && (Number(sample.form || 0) > 0 || Number(sample.value || 0) > 0);
}

function hasDetailedTrendList(rows) {
  const sample = Array.isArray(rows) ? rows[0] : null;
  if (!sample || typeof sample !== "object") return false;
  return ["cost", "form", "value"].every((key) => key in sample)
    && Number(sample.cost || 0) > 0
    && (Number(sample.form || 0) > 0 || Number(sample.value || 0) > 0);
}

function buildOwnershipSummary(picksByUid) {
  const holderMap = {};
  const managerCount = UID_LIST.length;

  for (const uid of UID_LIST) {
    const players = Array.isArray(picksByUid?.[uid]?.players) ? picksByUid[uid].players : [];
    const seen = new Set();
    for (const player of players) {
      const elementId = Number(player?.element_id || 0);
      if (!elementId || seen.has(elementId)) continue;
      seen.add(elementId);
      if (!holderMap[elementId]) {
        holderMap[elementId] = {
          element_id: elementId,
          name: player?.name || `#${elementId}`,
          cost: Number((Number(player?.now_cost || 0) / 10).toFixed(1)),
          holder_count: 0,
        };
      }
      holderMap[elementId].holder_count += 1;
    }
  }

  const top10 = Object.values(holderMap)
    .map((item) => ({
      ...item,
      ownership_percent: Number(((item.holder_count / Math.max(1, managerCount)) * 100).toFixed(1)),
    }))
    .sort((a, b) => b.ownership_percent - a.ownership_percent || b.holder_count - a.holder_count || a.name.localeCompare(b.name))
    .slice(0, 10);

  return {
    by_element: holderMap,
    top10,
    manager_count: managerCount,
  };
}

function buildTodayValueLeaders(picksByUid, teamsPlayingToday) {
  const byElement = {};

  for (const uid of UID_LIST) {
    const players = Array.isArray(picksByUid?.[uid]?.players) ? picksByUid[uid].players : [];
    for (const player of players) {
      const elementId = Number(player?.element_id || 0);
      const teamId = Number(player?.team_id || 0);
      const nowCost = Number(player?.now_cost || 0) / 10;
      if (!elementId || !teamId || !teamsPlayingToday.has(teamId) || nowCost <= 0) continue;

      const finalPoints = Number(player?.final_points || 0);
      const value = finalPoints / nowCost;
      const current = byElement[elementId];
      if (!current || finalPoints > Number(current.points || 0)) {
        byElement[elementId] = {
          element_id: elementId,
          name: player?.name || `#${elementId}`,
          price: Number(nowCost.toFixed(1)),
          points: finalPoints,
          value: Number(value.toFixed(1)),
        };
      }
    }
  }

  return Object.values(byElement)
    .sort((a, b) =>
      Number(b.value || 0) - Number(a.value || 0) ||
      Number(b.points || 0) - Number(a.points || 0) ||
      Number(a.price || 0) - Number(b.price || 0) ||
      String(a.name || "").localeCompare(String(b.name || ""))
    )
    .slice(0, 10);
}

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
      weekly_phase: Number(weeklyPhase || 0) || null,
    };
  }).sort((a, b) => {
    const aRank = Number.isFinite(Number(a.overall_rank)) && Number(a.overall_rank) > 0 ? Number(a.overall_rank) : Number.MAX_SAFE_INTEGER;
    const bRank = Number.isFinite(Number(b.overall_rank)) && Number(b.overall_rank) > 0 ? Number(b.overall_rank) : Number.MAX_SAFE_INTEGER;
    return aRank - bRank || a.team_name.localeCompare(b.team_name);
  });
}

function buildSeededH2HTable(baseStatsByUid) {
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
      live_applied: false,
    };
  }
  return table;
}

function applyH2HMatchToTable(table, uid1, uid2, total1, total2, options = {}) {
  const left = table[normalizeUid(uid1)];
  const right = table[normalizeUid(uid2)];
  if (!left || !right) return;

  left.played += 1;
  right.played += 1;
  left.scored += Number(total1 || 0);
  left.conceded += Number(total2 || 0);
  right.scored += Number(total2 || 0);
  right.conceded += Number(total1 || 0);
  if (options.liveApplied) {
    left.live_applied = true;
    right.live_applied = true;
  }

  if (Number(total1 || 0) > Number(total2 || 0)) {
    left.won += 1;
    right.lost += 1;
    left.points += 3;
  } else if (Number(total2 || 0) > Number(total1 || 0)) {
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

function applyCompletedH2HWeeksToTable(table, weeklyTotalsByUid = {}, upToWeek = null) {
  const targetWeek = Number(upToWeek || 0);
  if (!targetWeek) return;

  const completedWeeks = [...new Set(ALL_FIXTURES.map(([gw]) => Number(gw || 0)))]
    .filter((gw) => gw > 22 && gw <= targetWeek)
    .sort((a, b) => a - b);

  for (const week of completedWeeks) {
    const weekFixtures = ALL_FIXTURES.filter(([gw]) => Number(gw || 0) === week);
    for (const [, uid1, uid2] of weekFixtures) {
      const total1 = Number(weeklyTotalsByUid?.[normalizeUid(uid1)]?.[String(week)] ?? weeklyTotalsByUid?.[normalizeUid(uid1)]?.[week] ?? 0);
      const total2 = Number(weeklyTotalsByUid?.[normalizeUid(uid2)]?.[String(week)] ?? weeklyTotalsByUid?.[normalizeUid(uid2)]?.[week] ?? 0);
      applyH2HMatchToTable(table, uid1, uid2, total1, total2, { liveApplied: false });
    }
  }
}

function finalizeH2HTable(table) {
  return Object.values(table)
    .map((row) => ({
      ...row,
      diff: row.scored - row.conceded,
      win_rate: row.played > 0 ? Number(((row.won + row.draw / 2) / row.played * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) =>
      b.points - a.points ||
      b.won - a.won ||
      (b.scored - b.conceded) - (a.scored - a.conceded) ||
      b.scored - a.scored ||
      a.team_name.localeCompare(b.team_name)
    )
    .map((row, index) => ({
      ...row,
      rank: index + 1,
    }));
}

function buildCompletedH2HStandings(baseStatsByUid, weeklyTotalsByUid = {}, lastCompletedWeek = null) {
  const table = buildSeededH2HTable(baseStatsByUid);
  applyCompletedH2HWeeksToTable(table, weeklyTotalsByUid, lastCompletedWeek);
  return finalizeH2HTable(table);
}

function buildLiveH2HStandings(baseStatsByUid, liveMatches, weeklyTotalsByUid = {}, lastCompletedWeek = null) {
  const table = buildSeededH2HTable(baseStatsByUid);
  applyCompletedH2HWeeksToTable(table, weeklyTotalsByUid, lastCompletedWeek);

  for (const match of liveMatches || []) {
    applyH2HMatchToTable(table, match?.uid1, match?.uid2, match?.total1, match?.total2, { liveApplied: true });
  }

  return finalizeH2HTable(table);
}

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
  const teamsMetaById = buildTeamsMetaMap(bootstrap, getTeamVisualMeta);

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
      transfers_out_event: e.transfers_out_event || 0,
    };
  }

  const [liveRaw, fixturesRaw, overallStandingsRows, weeklyStandingsRows] = await Promise.all([
    fetchJson(`/event/${currentEvent}/live/`),
    fetchJson(`/fixtures/?event=${currentEvent}`),
    fetchAllStandings(1),
    weeklyStandingsPhase ? fetchAllStandings(weeklyStandingsPhase) : Promise.resolve([]),
  ]);
  const upcomingEventIds = buildUpcomingEventIds(events, currentEvent, 7);
  const fixturesByEvent = {
    [currentEvent]: fixturesRaw || [],
  };
  for (const eventId of upcomingEventIds) {
    if (eventId === currentEvent) continue;
    fixturesByEvent[eventId] = await fetchJson(`/fixtures/?event=${eventId}`);
  }
  const futureFixturesByEvent = {};
  for (const eventId of futureWeekEventIds) {
    futureFixturesByEvent[eventId] = fixturesByEvent[eventId] || [];
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
    const homeTeamName = teams[f.team_h] || `Team #${f.team_h}`;
    const awayTeamName = teams[f.team_a] || `Team #${f.team_a}`;
    const homeVisual = getTeamVisualMeta(homeTeamName);
    const awayVisual = getTeamVisualMeta(awayTeamName);
    return {
      id: f.id,
      team_h: f.team_h,
      team_a: f.team_a,
      home_team: homeTeamName,
      away_team: awayTeamName,
      home_logo_url: homeVisual.logo_url,
      away_logo_url: awayVisual.logo_url,
      home_color: homeVisual.color,
      away_color: awayVisual.color,
      home_score: f.team_h_score || 0,
      away_score: f.team_a_score || 0,
      started: !!f.started,
      finished: status.code === "finished",
      status_code: status.code,
      status_label: status.label,
      kickoff: formatKickoffBj(f.kickoff_time),
      kickoff_time: f.kickoff_time || null,
    };
  });
  const allCurrentFixturesFinished = games.length > 0 && games.every((game) => !!game.finished);
  const isWeekResolved = futureWeekEventIds.length === 0 && allCurrentFixturesFinished;
  const maxFixtureWeek = [...new Set(ALL_FIXTURES.map(([gw]) => Number(gw || 0)))].sort((a, b) => a - b).pop() || currentWeek;
  const displayWeek = isWeekResolved ? Math.min(maxFixtureWeek, Number(currentWeek || 0) + 1) : Number(currentWeek || 0);
  const lastCompletedH2hWeek = Math.max(22, Math.min(maxFixtureWeek, displayWeek - 1));
  const completedH2hWeeks = [...new Set(ALL_FIXTURES.map(([gw]) => Number(gw || 0)))]
    .filter((gw) => gw > 22 && gw <= lastCompletedH2hWeek)
    .sort((a, b) => a - b);
  const teamsPlayingToday = buildTeamsPlayingToday(games);
  const futureTeamsByEvent = futureWeekEventIds.map((eventId) => buildTeamsPlayingToday(futureFixturesByEvent[eventId] || []));
  const upcomingDayContexts = buildUpcomingDayContexts(upcomingEventIds, eventMetaById, fixturesByEvent);
  const fixtureLookupByEvent = {};
  for (const eventId of upcomingEventIds) {
    fixtureLookupByEvent[eventId] = buildFixtureLookup(fixturesByEvent[eventId] || [], teamsMetaById);
  }
  const eventLiveCache = {
    [currentEvent]: liveElements,
  };

  const fixtureDetails = {};
  for (const fixture of fixturesRaw || []) {
    const homePlayers = [];
    const awayPlayers = [];
    for (const [idText, liveData] of Object.entries(liveElements)) {
      const elementId = Number(idText);
      const elem = elements[elementId] || {};
      const player = {
        id: elementId,
        name: elem.name || `#${elementId}`,
        position: elem.position || 0,
        position_name: elem.position_name || "UNK",
        ...getPlayerStats(elementId, liveElements, elements),
      };
      if (elem.team === fixture.team_h) homePlayers.push(player);
      if (elem.team === fixture.team_a) awayPlayers.push(player);
    }
    homePlayers.sort((a, b) => b.fantasy - a.fantasy);
    awayPlayers.sort((a, b) => b.fantasy - a.fantasy);
    const homeTeamName = teams[fixture.team_h] || `Team #${fixture.team_h}`;
    const awayTeamName = teams[fixture.team_a] || `Team #${fixture.team_a}`;
    const homeVisual = getTeamVisualMeta(homeTeamName);
    const awayVisual = getTeamVisualMeta(awayTeamName);
    fixtureDetails[fixture.id] = {
      home_team: homeTeamName,
      away_team: awayTeamName,
      home_logo_url: homeVisual.logo_url,
      away_logo_url: awayVisual.logo_url,
      home_color: homeVisual.color,
      away_color: awayVisual.color,
      home_players: homePlayers,
      away_players: awayPlayers,
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
      wildcard_post_gw17_event: Number(previous.wildcard_post_gw17_event || 0) || null,
      rich_day: Number(previous.rich_day || 0) || null,
      captain_week: Number(previous.captain_week || 0) || null,
      transfer_records: Array.isArray(previous.transfer_records) ? previous.transfer_records : [],
      historical_h2h_week_totals:
        previous.historical_h2h_week_totals && typeof previous.historical_h2h_week_totals === "object"
          ? { ...previous.historical_h2h_week_totals }
          : {},
      week_total_summary: previous.week_total_summary || null,
      lineup_economy: previous.lineup_economy || null,
      picks: Array.isArray(previous.players) ? previous.players : [],
    };
    debugUid("base_data", uid, {
      overall_total: overallRow.entry ? Math.round(Number(overallRow.total || 0) / 10) : null,
      overall_rank: Number(overallRow.rank || 0),
      weekly_total: weeklyRow.entry ? Math.round(Number(weeklyRow.total || 0) / 10) : null,
      weekly_rank: Number(weeklyRow.rank || 0),
      previous_event_total: Number(previous.event_total || 0),
      previous_total_live: Number(previous.total_live || 0),
      previous_players: Array.isArray(previous.players) ? previous.players.length : 0,
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
      fetchJsonSafe(`/entry/${uidNumber}/history/`, 4),
    ]);
    // Retry once for failed endpoints to reduce random empty states.
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
      history_rows: Array.isArray(historyData?.current) ? historyData.current.length : 0,
    });
    debugUid("trend_data", uid, null);
    debugUid("avatar_data", uid, null);

    const hasHistoryData = !!historyRes.ok;
    const canRecomputePenalty = !!transfersRes.ok && hasHistoryData;
    const chipDayMap = hasHistoryData
      ? getChipDayMapFromHistory(historyData, currentWeek, currentEvent, eventMetaById)
      : {};
    const wildcardDay = hasHistoryData
      ? getWildcardDayFromHistory(historyData, currentWeek, currentEvent, eventMetaById)
      : Number(previous.wildcard_day || 0) || null;
    const wildcardPostGw17Event = hasHistoryData
      ? getWildcardPostGw17Event(historyData, eventMetaById)
      : Number(previous.wildcard_post_gw17_event || 0) || null;
    const richDay = hasHistoryData
      ? getSeasonChipEvent(historyData, ["rich"])
      : Number(previous.rich_day || 0) || null;
    const transferSummary = canRecomputePenalty
      ? buildWeeklyTransferSummary(transfersData, currentWeek, eventMetaById, elements, chipDayMap)
      : {
          records: Array.isArray(previous.transfer_records) ? previous.transfer_records : [],
          total_transfer_count: Number(previous.transfer_count || 0),
          penalty_transfer_count: Number(previous.penalty_transfer_count || previous.transfer_count || 0),
          gd1_transfer_count: Number(previous.gd1_transfer_count || 0),
          gd1_missing_penalty: Number(previous.gd1_missing_penalty || 0),
          penalty_score: Number(previous.penalty_score || 0),
        };
    const transferCount = Number(transferSummary.total_transfer_count || 0);
    const gd1TransferCount = Number(transferSummary.gd1_transfer_count || 0);
    const gd1MissingPenalty = Number(transferSummary.gd1_missing_penalty || 0);
    const wildcardActive = wildcardDay !== null;
    const penaltyScore = Number(transferSummary.penalty_score || 0);
    const historyWeek = calculateWeekScoresFromHistory(historyData, currentWeek, currentEvent, eventMetaById);
    const historicalH2hWeekTotals = (
      previous.historical_h2h_week_totals && typeof previous.historical_h2h_week_totals === "object"
        ? { ...previous.historical_h2h_week_totals }
        : {}
    );
    if (hasHistoryData && completedH2hWeeks.length) {
      for (const week of completedH2hWeeks) {
        const completedWeekTotal = computeCompletedWeekTotalForGw(
          historyData,
          transfersData,
          week,
          eventMetaById,
          elements
        );
        if (Number.isFinite(Number(completedWeekTotal))) {
          historicalH2hWeekTotals[String(week)] = Number(completedWeekTotal || 0);
        }
      }
    }
    const captainChipEvent = hasHistoryData
      ? getCaptainChipEvent(historyData, currentWeek, currentEvent, eventMetaById)
      : null;
    const captainWeek = hasHistoryData
      ? (captainChipEvent?.event ? currentWeek : null)
      : (Number(previous.captain_week || 0) || null);
    const activeChip = String(picksData?.active_chip || "").toLowerCase();
    const captainUsedBase = hasHistoryData
      ? await buildCaptainUsageSummary(
          uidNumber,
          historyData,
          currentWeek,
          currentEvent,
          eventMetaById,
          elements,
          eventLiveCache,
          previous.captain_used || null
        )
      : previous.captain_used || { used: false, label: "None", day: null, captain_name: null, captain_points: null };
    let captainUsed = activeChip === "phcapt"
      ? {
          ...captainUsedBase,
          used: true,
          day: Number(captainUsedBase?.day || currentMeta?.day || 0) || null,
          label: captainUsedBase?.used
            ? captainUsedBase.label
            : (currentMeta?.day ? `DAY${currentMeta.day}` : "Used"),
        }
      : captainUsedBase;
    const rawChipStatus = hasHistoryData
      ? buildChipStatusSummary(historyData, currentWeek, currentEvent, eventMetaById, captainUsed)
      : buildPersistedChipStatus(previous, { currentWeek, activeChip });
    const chipStatus = buildPersistedChipStatus({
      ...previous,
      current_event_name: currentEventName,
      captain_used: captainUsed,
      captain_week: activeChip === "phcapt" ? currentWeek : captainWeek,
      chip_status: rawChipStatus,
    }, {
      currentWeek,
      activeChip,
    });

    standingsByUid[uid].penalty_score = penaltyScore;
    standingsByUid[uid].transfer_count = transferCount;
    standingsByUid[uid].penalty_transfer_count = Number(transferSummary.penalty_transfer_count || 0);
    standingsByUid[uid].gd1_transfer_count = gd1TransferCount;
    standingsByUid[uid].gd1_missing_penalty = gd1MissingPenalty;
    standingsByUid[uid].wildcard_active = wildcardActive;
    standingsByUid[uid].wildcard_day = wildcardDay;
    standingsByUid[uid].wildcard_post_gw17_event = wildcardPostGw17Event ? Number(wildcardPostGw17Event) : null;
    standingsByUid[uid].rich_day = richDay ? Number(richDay) : null;
    standingsByUid[uid].captain_week = activeChip === "phcapt"
      ? Number(currentWeek || 0) || null
      : (captainWeek ? Number(captainWeek) : null);
    standingsByUid[uid].transfer_records = transferSummary.records;
    standingsByUid[uid].captain_used = captainUsed;
    standingsByUid[uid].chip_status = chipStatus;
    standingsByUid[uid].historical_h2h_week_totals = historicalH2hWeekTotals;
    standingsByUid[uid].week_total_summary = buildWeekTotalSummary(historyWeek, currentEvent, gd1MissingPenalty);
    if (historyWeek.has_week_rows) {
      const previewTodayScore = historyWeek.today_points !== null
        ? Number(historyWeek.today_points || 0)
        : Number(previous.total_live || standingsByUid[uid].today_live || 0);
      standingsByUid[uid].week_total = computeWeekTotalFromHistory(
        historyWeek,
        currentEvent,
        previewTodayScore,
        gd1MissingPenalty
      );
    }

    if (!picksData?.picks) {
      if (
        Array.isArray(previous.players) &&
        previous.players.length > 0 &&
        Number(previous.current_event || currentEvent) === Number(currentEvent) &&
        previous.fetch_status?.picks_ok === true
      ) {
        standingsByUid[uid].picks = previous.players;
      }
      // 没有picks数据时的回退处理
      // 优先使用history中的今日得分，其次使用之前缓存的今日得分
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
        transfers_ok: !!transfersRes.ok,
      };
      standingsByUid[uid].lineup_economy = previous.lineup_economy || standingsByUid[uid].lineup_economy || {
        effective_total_cost: 0,
        breakeven_line: 0,
        effective_total_points: Number(todayFallback || 0),
        status: "勉强回本",
      };
      debugUid("final_payload", uid, {
        fallback: true,
        total_live: standingsByUid[uid].today_live,
        event_total: standingsByUid[uid].week_total,
        players: summarizePlayersForDebug(standingsByUid[uid].picks),
        lineup_economy: standingsByUid[uid].lineup_economy,
        captain_used: captainUsed,
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
      team_name: teamsMetaById[Number(elem.team || 0)]?.name || "",
      team_short: teamsMetaById[Number(elem.team || 0)]?.short_name || "",
      team_logo_url: teamsMetaById[Number(elem.team || 0)]?.logo_url || "/nba-team-logos/_.png",
      is_effective: false,
    };
    });

    if (activeChip === "phcapt") {
      const captainPick = picks.find((pick) => pick?.is_captain);
      if (captainPick) {
        const captainDay = Number(captainUsed?.day || currentMeta?.day || 0) || null;
        const captainPoints = Number(captainPick.final_points || 0);
        captainUsed = {
          ...captainUsed,
          used: true,
          day: captainDay,
          captain_name: captainPick.name || captainUsed?.captain_name || null,
          captain_points: captainPoints,
          label: captainDay
            ? `DAY${captainDay}: ${captainPick.name || captainUsed?.captain_name || "None"} ${captainPoints}`
            : `Used: ${captainPick.name || captainUsed?.captain_name || "None"} ${captainPoints}`,
        };
        standingsByUid[uid].captain_used = captainUsed;
      }
    }

    const [effectiveScore] = calculateEffectiveScore(picks, teamsPlayingToday);
    const lineupEconomy = buildLineupEconomySummary(picks);
    debugUid("merge_data", uid, {
      players: summarizePlayersForDebug(picks),
      effective_score: effectiveScore,
      lineup_economy: lineupEconomy,
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
    standingsByUid[uid].chip_status = chipStatus;
    standingsByUid[uid].fetch_status = {
      profile_ok: classicRank > 0,
      picks_ok: true,
      history_ok: !!historyRes.ok,
      transfers_ok: !!transfersRes.ok,
    };
    debugUid("final_payload", uid, {
      total_live: standingsByUid[uid].today_live,
      raw_total_live: standingsByUid[uid].raw_today_live,
      event_total: standingsByUid[uid].week_total,
      penalty_score: standingsByUid[uid].penalty_score,
      players: summarizePlayersForDebug(picks),
      lineup_economy: lineupEconomy,
    });
  });

  const availableWeeks = [...new Set(ALL_FIXTURES.map(([gw]) => gw))].sort((a, b) => a - b);
  let fixtureWeek = displayWeek;
  if (!availableWeeks.includes(fixtureWeek)) {
    fixtureWeek = availableWeeks.filter((w) => w <= displayWeek).pop() || availableWeeks[0] || displayWeek;
  }
  const preferredTopOrder = fixtureWeek === 25
    ? ["4319-4224", "2-5101", "5095-14", "15-189"]
    : [];
  const preferredOrderMap = new Map(preferredTopOrder.map((key, index) => [key, index]));
  const weeklyFixtures = ALL_FIXTURES
    .filter(([gw]) => gw === fixtureWeek)
    .sort((left, right) => {
      const leftKey = `${normalizeUid(left?.[1])}-${normalizeUid(left?.[2])}`;
      const rightKey = `${normalizeUid(right?.[1])}-${normalizeUid(right?.[2])}`;
      const leftRank = preferredOrderMap.has(leftKey) ? preferredOrderMap.get(leftKey) : Number.MAX_SAFE_INTEGER;
      const rightRank = preferredOrderMap.has(rightKey) ? preferredOrderMap.get(rightKey) : Number.MAX_SAFE_INTEGER;
      if (leftRank !== rightRank) return leftRank - rightRank;
      return 0;
    });

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
      wildcard2: !!s2.wildcard_active,
    };
  });

  const picksByUid = {};
  for (const uid of UID_LIST) {
    const uidNum = uidToNumber(uid);
    const s = standingsByUid[uid] || {};
    const picks = s.picks || [];
    const formation = getFormationFromEffectivePlayers(picks);
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
      wildcard_post_gw17_event: s.wildcard_post_gw17_event || null,
      rich_day: s.rich_day || null,
      captain_week: s.captain_week || null,
      historical_h2h_week_totals:
        s.historical_h2h_week_totals && typeof s.historical_h2h_week_totals === "object"
          ? { ...s.historical_h2h_week_totals }
          : {},
      fetch_status: s.fetch_status || { picks_ok: true, history_ok: true, transfers_ok: true },
      event_total: s.week_total || 0,
      overall_total: s.overall_total || s.week_total || 0,
      classic_rank: s.classic_rank || 0,
      classic_week_rank: s.classic_week_rank || 0,
      classic_week_total: s.classic_week_total || 0,
      raw_transfers: Array.isArray(transfersByUid[uid]) ? transfersByUid[uid] : [],
      transfer_records: Array.isArray(s.transfer_records) ? s.transfer_records : [],
      week_total_summary: s.week_total_summary || null,
      captain_used: s.captain_used || {
        used: false,
        label: "None",
        day: null,
        captain_name: null,
        captain_points: null,
      },
      chip_status: buildPersistedChipStatus(s),
      lineup_economy: s.lineup_economy || {
        effective_total_cost: 0,
        breakeven_line: 0,
        effective_total_points: 0,
        status: "勉强回本",
      },
      formation,
      current_event: currentEvent,
      current_event_name: currentEventName,
      players: picks,
    };
  }

  const ownershipSummary = buildOwnershipSummary(picksByUid);
  const chipsUsedSummary = buildChipsUsedSummary(picksByUid);
  const goodCaptainSummary = buildGoodCaptainSummary(picksByUid);
  for (const uid of UID_LIST) {
    const players = Array.isArray(picksByUid[uid]?.players) ? picksByUid[uid].players : [];
    for (const player of players) {
      const ownership = ownershipSummary.by_element[Number(player?.element_id || 0)];
      const ownershipCount = Number(ownership?.holder_count || 0);
      const ownershipPercent = Number(((ownershipCount / Math.max(1, ownershipSummary.manager_count)) * 100).toFixed(1));
      const todayHasGame = teamsPlayingToday.has(Number(player?.team_id || 0));
      player.ownership_count = ownershipCount;
      player.ownership_percent = ownershipPercent;
      player.today_has_game = todayHasGame;
      player.eo_percent = todayHasGame
        ? Number((player?.is_effective ? 100 - ownershipPercent : -ownershipPercent).toFixed(1))
        : null;
    }
    const futureSchedule = buildManagerFutureSchedule(picksByUid[uid], upcomingDayContexts, fixtureLookupByEvent);
    picksByUid[uid].future_schedule = futureSchedule;
    picksByUid[uid].future_day_outlook = futureSchedule.summary;
  }

  const league_daily_averages = buildLeagueDailyAverages(picksByUid, teamsPlayingToday);
  const projectionByUid = {};
  for (const uid of UID_LIST) {
    projectionByUid[uid] = buildManagerProjectionSummary(picksByUid[uid], futureTeamsByEvent);
  }
  h2h = h2h.map((match) => {
    const uid1 = normalizeUid(match.uid1);
    const uid2 = normalizeUid(match.uid2);
    const leftProjection = projectionByUid[uid1] || { expected_total: Number(match.total1 || 0) };
    const rightProjection = projectionByUid[uid2] || { expected_total: Number(match.total2 || 0) };
    const winProb = isWeekResolved
      ? buildResolvedWinProbabilitySummary(match.total1, match.total2)
      : buildWinProbabilitySummary(leftProjection, rightProjection);
    return {
      ...match,
      projected_total1: Number(leftProjection.expected_total || match.total1 || 0),
      projected_total2: Number(rightProjection.expected_total || match.total2 || 0),
      projected_future1: Number(leftProjection.projected_future_score || 0),
      projected_future2: Number(rightProjection.projected_future_score || 0),
      remaining_ft1: Number(leftProjection.remaining_ft || 0),
      remaining_ft2: Number(rightProjection.remaining_ft || 0),
      captain_bonus1: Number(leftProjection.captain_bonus || 0),
      captain_bonus2: Number(rightProjection.captain_bonus || 0),
      win_prob1: winProb.left,
      win_prob2: winProb.right,
      chip_status1: picksByUid[uid1]?.chip_status || null,
      chip_status2: picksByUid[uid2]?.chip_status || null,
    };
  });

  const isFullRefresh = uids.length === UID_LIST.length;
  const transferTrends = isFullRefresh
      ? await buildTransferTrends({
          transfersByUid,
          leagueUids: uids,
          currentWeek,
          eventMetaById,
          elements,
        })
    : {
        ...(previousState?.transfer_trends || { league: {}, global: {}, overall: {} }),
        global: await buildGlobalTransferTrends(elements),
        overall: previousState?.transfer_trends?.league || previousState?.transfer_trends?.overall || {},
      };
  transferTrends.ownership_top = ownershipSummary.top10;
  transferTrends.ownership_manager_count = ownershipSummary.manager_count;
  transferTrends.today_value_top = buildTodayValueLeaders(picksByUid, teamsPlayingToday);
  const fdr = buildFdrPayload({
    standingsByUid,
    currentWeek: displayWeek,
  });
  fdr.daily_averages = league_daily_averages;
  const historicalH2hTotalsByUid = {};
  for (const uid of UID_LIST) {
    historicalH2hTotalsByUid[uid] = standingsByUid[uid]?.historical_h2h_week_totals || {};
  }
  const h2hLastStandings = buildCompletedH2HStandings(
    H2H_BASE_STATS_BY_UID,
    historicalH2hTotalsByUid,
    lastCompletedH2hWeek
  );
  const h2hStandings = buildLiveH2HStandings(
    H2H_BASE_STATS_BY_UID,
    h2h,
    historicalH2hTotalsByUid,
    lastCompletedH2hWeek
  );
  const classicRankings = buildClassicRankingsPayload(
    overallStandingsRows,
    weeklyStandingsRows,
    currentWeek,
    weeklyStandingsPhase
  );
  const nextChipsUsedSummary = isFullRefresh
    ? chipsUsedSummary
    : (Array.isArray(previousState?.chips_used_summary) ? previousState.chips_used_summary : chipsUsedSummary);
  const nextGoodCaptainSummary = isFullRefresh
    ? goodCaptainSummary
    : (Array.isArray(previousState?.good_captain_summary) ? previousState.good_captain_summary : goodCaptainSummary);

  return {
    generated_at: new Date().toISOString(),
    current_event: currentEvent,
    current_event_name: currentEventName,
    current_week: currentWeek,
    display_week: displayWeek,
    last_completed_week: lastCompletedH2hWeek,
    fixtures: {
      event: currentEvent,
      event_name: currentEventName,
      count: games.length,
      games,
    },
    fixture_details: fixtureDetails,
    h2h,
    h2h_last_standings: h2hLastStandings,
    h2h_standings: h2hStandings,
    classic_rankings: classicRankings,
    picks_by_uid: picksByUid,
    transfer_trends: transferTrends,
    chips_used_summary: nextChipsUsedSummary,
    good_captain_summary: nextGoodCaptainSummary,
    ownership: ownershipSummary,
    fdr,
    fdr_html: fdr.html,
    league_daily_averages,
    refresh_meta: previousState?.refresh_meta || null,
  };
}

async function refreshState(env, options = {}) {
  const previous = await getState(env);
  const full = !!options.full;
  const rawCursor = full ? "0" : await env.NBA_CACHE.get(CACHE_CURSOR_KEY);
  const startIndex = Math.max(0, Number(rawCursor || 0) || 0);
  const safeStart = startIndex >= UID_LIST.length ? 0 : startIndex;
  const targetUids = full ? [...UID_LIST] : UID_LIST.slice(safeStart, safeStart + UID_CHUNK_SIZE);
  const state = await buildState(previous, targetUids);
  const nextIndex = full || safeStart + UID_CHUNK_SIZE >= UID_LIST.length ? 0 : safeStart + UID_CHUNK_SIZE;
  const updatedAt = new Date().toISOString();
  state.refresh_meta = {
    ...(previous?.refresh_meta || {}),
    mode: full ? "full" : "chunk",
    chunk_size: full ? UID_LIST.length : UID_CHUNK_SIZE,
    start_index: safeStart,
    next_index: nextIndex,
    processed_uids: targetUids,
    complete_cycle: nextIndex === 0,
    updated_at: updatedAt,
    ...(full ? {
      meta_updated_at: updatedAt,
      meta_mode: "full",
      meta_event: Number(state?.current_event || 0) || null,
      meta_event_name: state?.current_event_name || null,
    } : {}),
  };
  await env.NBA_CACHE.put(CACHE_KEY, JSON.stringify(state));
  await env.NBA_CACHE.put(CACHE_CURSOR_KEY, String(nextIndex));
  return state;
}

async function getState(env) {
  const raw = await env.NBA_CACHE.get(CACHE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function buildManagerFutureSchedule(payload, dayContexts, fixtureLookupByEvent) {
  const players = Array.isArray(payload?.players) ? payload.players : [];
  const currentEvent = Number(payload?.current_event || 0);
  const summary = (dayContexts || []).map((context) => {
    const isToday = Number(context?.event_id || 0) === currentEvent;
    const teamSet = context?.teams_playing instanceof Set ? context.teams_playing : new Set();
    const rawActiveCount = players.filter((player) => teamSet.has(Number(player?.team_id || 0))).length;
    const simulated = players.map((player) => ({
      ...player,
      injury: isToday ? player?.injury : null,
      final_points: isToday ? Number(player?.final_points || 0) : getProjectedPlayerScore(player),
      base_points: isToday ? Number(player?.base_points || 0) : getProjectedPlayerScore(player),
      is_effective: false,
    }));
    const [projectedPoints, selected, formation] = calculateEffectiveScore(simulated, teamSet);
    return {
      event_id: Number(context?.event_id || 0),
      day: Number(context?.day || 0) || null,
      day_label: context?.day_label || "DAY?",
      raw_active_count: rawActiveCount,
      effective_count: Number(selected?.length || 0),
      projected_points: Number(projectedPoints || 0),
      formation: formation || "N/A",
    };
  });

  const groups = [
    { key: "FC", label: "FRONT COURT" },
    { key: "BC", label: "BACK COURT" },
  ].map((group) => ({
    position: group.key,
    label: group.label,
    players: players
      .filter((player) => String(player?.position_name || "") === group.key)
      .sort((a, b) => Number(a?.lineup_position || 0) - Number(b?.lineup_position || 0))
      .map((player) => ({
        element_id: Number(player?.element_id || 0),
        name: player?.name || "",
        team_short: player?.team_short || "",
        position_name: player?.position_name || group.key,
        lineup_position: Number(player?.lineup_position || 0),
        is_effective: !!player?.is_effective,
        cells: (dayContexts || []).map((context) => {
          const lookup = fixtureLookupByEvent?.[Number(context?.event_id || 0)] || {};
          const matchup = lookup[Number(player?.team_id || 0)] || null;
          return matchup
            ? {
                has_game: true,
                venue_label: matchup.venue_label || "",
                opponent_name: matchup.opponent_name || "",
                opponent_short: matchup.opponent_short || "",
                opponent_logo_url: matchup.opponent_logo_url || "/nba-team-logos/_.png",
              }
            : {
                has_game: false,
              };
        }),
      })),
  })).filter((group) => group.players.length > 0);

  return {
    days: (dayContexts || []).map((context) => ({
      event_id: Number(context?.event_id || 0),
      day_label: context?.day_label || "DAY?",
      gw: Number(context?.gw || 0) || null,
      day: Number(context?.day || 0) || null,
    })),
    summary,
    groups,
  };
}

async function getInjuriesPayload(env, options = {}) {
  const force = !!options.force;
  const cached = await getInjuryCache(env);
  const now = Date.now();
  const cachedAt = Date.parse(cached?.updated_at || "") || 0;
  if (!force && cached && cachedAt && now - cachedAt < INJURY_CACHE_TTL_MS) {
    return cached;
  }

  const fresh = await fetchNextDayInjuriesPayload();
  const payload = {
    ...fresh,
    updated_at: new Date().toISOString(),
    cache_ttl_minutes: 60,
  };
  try {
    await env.NBA_CACHE.put(INJURY_CACHE_KEY, JSON.stringify(payload));
  } catch {
    return payload;
  }
  return payload;
}

async function getPlayerReferenceCache(env) {
  const raw = await env.NBA_CACHE.get(PLAYER_REFERENCE_CACHE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function getTeamAttackDefenseCache(env) {
  const raw = await env.NBA_CACHE.get(TEAM_ATTACK_DEFENSE_CACHE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function shiftDateKey(dateKey, deltaDays) {
  const [year, month, day] = String(dateKey || "").split("-").map((part) => Number(part || 0));
  const base = new Date(Date.UTC(year, Math.max(0, month - 1), day || 1));
  base.setUTCDate(base.getUTCDate() + Number(deltaDays || 0));
  return base.toISOString().slice(0, 10);
}

function buildLastDateKeys(count = 30, endDateKey = getBeijingDateKey()) {
  const total = Math.max(1, Number(count || 0));
  return Array.from({ length: total }, (_, index) => shiftDateKey(endDateKey, index - (total - 1)));
}

async function fetchTeamAttackDefensePayload() {
  const endDate = getBeijingDateKey();
  const dateKeys = buildLastDateKeys(30, endDate);
  const totalsByTeam = {};

  await mapLimit(dateKeys, 4, async (dateKey) => {
    const scoreboard = await fetchJsonUrl(
      `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${String(dateKey).replace(/-/g, "")}`,
      1
    );
    for (const event of scoreboard?.events || []) {
      const competition = event?.competitions?.[0];
      if (!competition || event?.status?.type?.completed !== true) continue;
      const competitors = Array.isArray(competition.competitors) ? competition.competitors : [];
      if (competitors.length !== 2) continue;

      const left = competitors[0];
      const right = competitors[1];
      const leftScore = Number(left?.score || 0);
      const rightScore = Number(right?.score || 0);
      const pair = [
        { current: left, opponentScore: rightScore },
        { current: right, opponentScore: leftScore },
      ];

      for (const item of pair) {
        const team = item.current?.team || {};
        const teamId = Number(team?.id || 0);
        if (!teamId) continue;
        if (!totalsByTeam[teamId]) {
          const visual = getTeamVisualMeta(team.displayName || team.shortDisplayName || "");
          totalsByTeam[teamId] = {
            team_id: teamId,
            team_name: team.displayName || team.shortDisplayName || `Team #${teamId}`,
            team_abbrev: team.abbreviation || team.shortDisplayName || "",
            team_color: visual.color,
            logo_url: visual.logo_url,
            games_played: 0,
            total_points_for: 0,
            total_points_against: 0,
            total_abs_margin: 0,
            total_combined_points: 0,
          };
        }
        totalsByTeam[teamId].games_played += 1;
        totalsByTeam[teamId].total_points_for += Number(item.current?.score || 0);
        totalsByTeam[teamId].total_points_against += item.opponentScore;
        totalsByTeam[teamId].total_abs_margin += Math.abs(Number(item.current?.score || 0) - item.opponentScore);
        totalsByTeam[teamId].total_combined_points += Number(item.current?.score || 0) + item.opponentScore;
      }
    }
  });

  const teams = Object.values(totalsByTeam)
    .map((team) => ({
      ...team,
      points_for: Number((team.total_points_for / Math.max(1, team.games_played)).toFixed(1)),
      points_against: Number((team.total_points_against / Math.max(1, team.games_played)).toFixed(1)),
      combined_points: Number((team.total_combined_points / Math.max(1, team.games_played)).toFixed(1)),
      abs_margin: Number((team.total_abs_margin / Math.max(1, team.games_played)).toFixed(1)),
    }))
    .sort((a, b) =>
      b.points_for - a.points_for ||
      a.points_against - b.points_against ||
      String(a.team_name || "").localeCompare(String(b.team_name || ""))
    );

  return {
    period_label: "近30天",
    start_date: dateKeys[0],
    end_date: dateKeys[dateKeys.length - 1],
    updated_at: new Date().toISOString(),
    teams,
  };
}

function decodeHtmlText(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function extractTableStat(rowHtml, stat) {
  const match = rowHtml.match(new RegExp(`<(?:td|th)[^>]*data-stat="${stat}"[^>]*>([\\s\\S]*?)<\\/(?:td|th)>`, "i"));
  return decodeHtmlText(match?.[1] || "");
}

async function fetchSeasonPaceDiffTeams() {
  try {
    const html = await fetchTextUrl("https://www.basketball-reference.com/leagues/NBA_2026.html", 2);
    const tableMatch = html.match(/<table[^>]*id="advanced-team"[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/i);
    if (!tableMatch) return null;

    const rows = Array.from(tableMatch[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi));
    const teams = rows
      .map((rowMatch) => {
        const rowHtml = rowMatch[1] || "";
        const teamName = extractTableStat(rowHtml, "team_name")
          .replace(/\*+/g, "")
          .replace(/\s+/g, " ")
          .trim();
        if (!teamName || /league average/i.test(teamName)) return null;
        const pace = Number(extractTableStat(rowHtml, "pace"));
        const nRtg = Number(extractTableStat(rowHtml, "n_rtg"));
        if (!Number.isFinite(pace) || !Number.isFinite(nRtg)) return null;
        const visual = getTeamVisualMeta(teamName);
        return {
          team_name: teamName,
          team_color: visual.color,
          logo_url: visual.logo_url,
          pace: Number(pace.toFixed(1)),
          n_rtg: Number(nRtg.toFixed(1)),
          abs_n_rtg: Number(-Math.abs(nRtg).toFixed(1)),
        };
      })
      .filter(Boolean)
      .sort((a, b) =>
        a.abs_n_rtg - b.abs_n_rtg ||
        b.pace - a.pace ||
        String(a.team_name || "").localeCompare(String(b.team_name || ""))
      );

    if (!teams.length) return null;
    return {
      source: "basketball-reference",
      source_label: "赛季 Advanced Stats",
      period_label: "赛季",
      metric_note: "x = Pace, y = |NRtg|",
      teams,
    };
  } catch {
    return null;
  }
}

async function getTeamAttackDefensePayload(env, options = {}) {
  const force = !!options.force;
  const cached = await getTeamAttackDefenseCache(env);
  const todayKey = getBeijingDateKey();
  if (!force && cached?.end_date === todayKey && Array.isArray(cached?.teams) && cached.teams.length > 0) {
    return cached;
  }
  const payload = await fetchTeamAttackDefensePayload();
  payload.pace_chart = (await fetchSeasonPaceDiffTeams()) || {
    source: "proxy",
    source_label: "近30天代理值",
    period_label: "近30天",
    metric_note: "x = 双方总分代理 Pace, y = 平均绝对分差",
    teams: payload.teams.map((team) => ({
      team_name: team.team_name,
      team_color: team.team_color,
      logo_url: team.logo_url,
      pace_proxy: team.combined_points,
      abs_diff: team.abs_margin,
    })),
  };
  try {
    await env.NBA_CACHE.put(TEAM_ATTACK_DEFENSE_CACHE_KEY, JSON.stringify(payload));
  } catch {
    return payload;
  }
  return payload;
}

async function fetchPlayerReferencePayload(playerQuery = "nikola-jokic") {
  const bootstrap = await fetchJson("/bootstrap-static/");
  const normalizedQuery = String(playerQuery || "").trim().toLowerCase();
  const numericQuery = Number(playerQuery || 0);
  const players = Array.isArray(bootstrap?.elements) ? bootstrap.elements : [];
  const teamsById = {};
  for (const team of bootstrap?.teams || []) {
    teamsById[Number(team?.id || 0)] = team?.name || `Team #${team?.id}`;
  }

  let player = null;
  if (Number.isFinite(numericQuery) && numericQuery > 0) {
    player = players.find((item) => Number(item?.id || 0) === numericQuery) || null;
  }
  if (normalizedQuery === "nikola-jokic" || normalizedQuery === "jokic") {
    player = players.find((item) => {
      const first = String(item?.first_name || "").toLowerCase();
      const last = String(item?.second_name || "").toLowerCase();
      return first === "nikola" && last === "jokic";
    });
  }
  if (!player) {
    player = players.find((item) => String(item?.web_name || "").toLowerCase() === normalizedQuery) || null;
  }
  if (!player && normalizedQuery) {
    player = players.find((item) => {
      const fullName = `${item?.first_name || ""} ${item?.second_name || ""}`.trim().toLowerCase();
      return fullName === normalizedQuery;
    }) || null;
  }
  if (!player) {
    return {
      player_key: normalizedQuery,
      player_name: "Unknown",
      web_name: "",
      team_name: "",
      season_label: "2025-26",
      opponents: [],
    };
  }

  const summary = await fetchJson(`/element-summary/${player.id}/`);
  const history = Array.isArray(summary?.history) ? summary.history : [];
  const groupedByOpponent = {};
  for (const game of history) {
    const opponentTeamId = Number(game?.opponent_team || 0);
    const opponentTeam = teamsById[opponentTeamId] || `Team #${opponentTeamId}`;
    if (!groupedByOpponent[opponentTeam]) {
      groupedByOpponent[opponentTeam] = [];
    }
    groupedByOpponent[opponentTeam].push({
      fantasy_points: Math.round(Number(game?.total_points || 0) / 10),
      was_home: !!game?.was_home,
      kickoff_time: game?.kickoff_time || null,
      event_round: Number(game?.round || 0),
      points_scored: Number(game?.points_scored || 0),
      rebounds: Number(game?.rebounds || 0),
      assists: Number(game?.assists || 0),
      steals: Number(game?.steals || 0),
      blocks: Number(game?.blocks || 0),
      minutes: Number(game?.minutes || 0),
      date_label: game?.kickoff_time
        ? new Intl.DateTimeFormat("en-CA", {
            timeZone: "Asia/Shanghai",
            month: "2-digit",
            day: "2-digit",
          }).format(new Date(game.kickoff_time))
        : `GW${Number(game?.round || 0) || "?"}`,
    });
  }

  const opponents = (bootstrap?.teams || [])
    .map((team) => {
      const teamName = team?.name || `Team #${team?.id}`;
      const visual = getTeamVisualMeta(teamName);
      const sourceGames = (groupedByOpponent[teamName] || [])
        .sort((a, b) => b.fantasy_points - a.fantasy_points || b.points_scored - a.points_scored)
        .slice(0, 4);
      const averageGames = sourceGames.filter((game) => Number(game?.fantasy_points || 0) > 0);
      const averages = averageGames.length ? {
        fantasy_points: Number((averageGames.reduce((sum, game) => sum + Number(game.fantasy_points || 0), 0) / averageGames.length).toFixed(1)),
        points_scored: Number((averageGames.reduce((sum, game) => sum + Number(game.points_scored || 0), 0) / averageGames.length).toFixed(1)),
        rebounds: Number((averageGames.reduce((sum, game) => sum + Number(game.rebounds || 0), 0) / averageGames.length).toFixed(1)),
        assists: Number((averageGames.reduce((sum, game) => sum + Number(game.assists || 0), 0) / averageGames.length).toFixed(1)),
        steals: Number((averageGames.reduce((sum, game) => sum + Number(game.steals || 0), 0) / averageGames.length).toFixed(1)),
        blocks: Number((averageGames.reduce((sum, game) => sum + Number(game.blocks || 0), 0) / averageGames.length).toFixed(1)),
        minutes: Number((averageGames.reduce((sum, game) => sum + Number(game.minutes || 0), 0) / averageGames.length).toFixed(1)),
      } : null;
      const games = sourceGames.map((item) => ({
        ...item,
        venue_label: item.was_home ? "vs" : "@",
      }));
      while (games.length < 4) {
        games.push(null);
      }
      const avgFantasyPoints = averages ? Number(averages.fantasy_points || 0) : -1;
      return {
        opponent_team: teamName,
        team_color: visual.color,
        logo_url: visual.logo_url,
        avg_fantasy_points: avgFantasyPoints,
        games_played: sourceGames.length,
        games,
        averages,
      };
    })
    .sort((a, b) =>
      Number(b.avg_fantasy_points || -1) - Number(a.avg_fantasy_points || -1) ||
      String(a.opponent_team || "").localeCompare(String(b.opponent_team || ""))
    );

  return {
    player_key: normalizedQuery,
    player_name: `${player.first_name || ""} ${player.second_name || ""}`.trim() || player.web_name || "Unknown",
    web_name: player.web_name || "",
    team_name: teamsById[Number(player?.team || 0)] || `Team #${player?.team}`,
    season_label: "2025-26",
    opponents,
    updated_at: new Date().toISOString(),
  };
}

async function fetchPlayerOptionsPayload() {
  const bootstrap = await fetchJson("/bootstrap-static/");
  const teams = Array.isArray(bootstrap?.teams) ? bootstrap.teams : [];
  const elements = Array.isArray(bootstrap?.elements) ? bootstrap.elements : [];
  const teamsById = {};
  for (const team of teams) {
    const teamId = Number(team?.id || 0);
    if (!teamId) continue;
    const visual = getTeamVisualMeta(team?.name || "");
    teamsById[teamId] = {
      id: teamId,
      name: team?.name || `Team #${teamId}`,
      logo_url: visual.logo_url,
      team_color: visual.color,
      players: [],
    };
  }

  for (const player of elements) {
    const teamId = Number(player?.team || 0);
    if (!teamsById[teamId]) continue;
    teamsById[teamId].players.push({
      id: Number(player?.id || 0),
      name: `${player?.first_name || ""} ${player?.second_name || ""}`.trim() || player?.web_name || `#${player?.id}`,
      web_name: player?.web_name || "",
      position_name: Number(player?.element_type || 0) === 1 ? "BC" : Number(player?.element_type || 0) === 2 ? "FC" : "UNK",
      now_cost: Number(player?.now_cost || 0),
    });
  }

  const teamsList = Object.values(teamsById)
    .map((team) => ({
      ...team,
      players: team.players.sort((a, b) =>
        Number(b.now_cost || 0) - Number(a.now_cost || 0) ||
        String(a.name || "").localeCompare(String(b.name || ""))
      ),
    }))
    .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));

  return {
    teams: teamsList,
    updated_at: new Date().toISOString(),
  };
}

async function getPlayerReferencePayload(env, options = {}) {
  const playerQuery = options.player || "nikola-jokic";
  return fetchPlayerReferencePayload(playerQuery);
}

function buildSeasonLabel(value = Date.now()) {
  const date = value instanceof Date ? value : new Date(value);
  const year = Number(new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
  }).format(date));
  const month = Number(new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Shanghai",
    month: "2-digit",
  }).format(date));
  const startYear = month >= 7 ? year : year - 1;
  const endShort = String((startYear + 1) % 100).padStart(2, "0");
  return `${startYear}-${endShort}`;
}

function formatBeijingDateTimeLabel(value = Date.now()) {
  const date = value instanceof Date ? value : new Date(value);
  const datePart = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  const timePart = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Shanghai",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
  return `${datePart} ${timePart}`;
}

function formatBeijingMonthDayLabel(value = Date.now()) {
  const date = value instanceof Date ? value : new Date(value);
  const year = Number(new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
  }).format(date));
  const month = Number(new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Shanghai",
    month: "2-digit",
  }).format(date));
  const day = Number(new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Shanghai",
    day: "2-digit",
  }).format(date));
  if (
    !Number.isFinite(year) || year <= 0 ||
    !Number.isFinite(month) || month <= 0 ||
    !Number.isFinite(day) || day <= 0
  ) {
    return "";
  }
  return `${year}年${month}月${day}日`;
}

function formatFantasyScore(value) {
  return Number(Math.round(Number(value || 0) / 10) || 0);
}

function formatDisplayNumber(value) {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) return "-";
  return num.toLocaleString("en-US");
}

function formatDisplayRank(value) {
  const rank = Number(value || 0);
  if (!Number.isFinite(rank) || rank <= 0) return "-";
  return rank.toLocaleString("en-US");
}

function formatSignedFantasyDelta(value) {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) return "N/A";
  const prefix = num > 0 ? "+" : "";
  return `${prefix}${formatDisplayNumber(num)}`;
}

function buildSeasonChipEventNameMap(historyData) {
  const map = {};
  for (const item of extractChipHistoryRecords(historyData)) {
    const eventId = Number(item?.event || 0);
    const name = String(item?.name || "").toLowerCase();
    if (!eventId || !name) continue;
    map[eventId] = name;
  }
  return map;
}

function getSortedHistoryRows(historyData) {
  return [...(Array.isArray(historyData?.current) ? historyData.current : [])]
    .filter((row) => row && typeof row === "object" && Number(row?.event || 0) > 0)
    .sort((a, b) => Number(a?.event || 0) - Number(b?.event || 0));
}

function getLatestPositiveValue(values) {
  const list = (values || []).map((item) => Number(item || 0)).filter((value) => Number.isFinite(value) && value > 0);
  return list.length ? list[list.length - 1] : null;
}

function buildWeeklyCurve(rows, eventMetaById) {
  const pointsByGw = new Map();
  for (const row of rows || []) {
    const eventId = Number(row?.event || 0);
    const gw = Number(eventMetaById?.[eventId]?.gw || 0);
    if (!gw) continue;
    pointsByGw.set(gw, Number(pointsByGw.get(gw) || 0) + Number(row?.points || 0));
  }

  let running = 0;
  return Array.from(pointsByGw.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([, rawPoints]) => {
      running += Number(rawPoints || 0);
      return formatFantasyScore(running);
    });
}

function buildOverallRankCurve(rows, eventMetaById) {
  return (rows || [])
    .map((row) => {
      const event = Number(row?.event || 0);
      const rank = Number(row?.overall_rank || 0);
      if (!event || !Number.isFinite(rank) || rank <= 0) return null;
      return {
        event,
        rank,
        gw: Number(eventMetaById?.[event]?.gw || 0) || null,
      };
    })
    .filter(Boolean)
    .sort((a, b) => Number(a?.event || 0) - Number(b?.event || 0));
}

function getManagerDisplayName(uidNumber, historyData, entryData = null) {
  const candidates = [
    entryData?.player_first_name && entryData?.player_last_name ? `${entryData.player_first_name} ${entryData.player_last_name}` : "",
    entryData?.player_name,
    entryData?.name,
    entryData?.entry_name,
    historyData?.player_name,
    historyData?.name,
    historyData?.entry_name,
    UID_MAP[uidNumber],
  ];
  for (const value of candidates) {
    const text = String(value || "").trim();
    if (text) return text;
  }
  return `#${uidNumber}`;
}

function getTeamDisplayName(uidNumber, historyData, entryData = null) {
  const candidates = [
    entryData?.entry_name,
    historyData?.entry_name,
    UID_MAP[uidNumber],
  ];
  for (const value of candidates) {
    const text = String(value || "").trim();
    if (text) return text;
  }
  return `#${uidNumber}`;
}

function toGwDayLabel(gw, day) {
  if (gw && day) return `GW${gw} Day${day}`;
  if (gw) return `GW${gw}`;
  if (day) return `Day${day}`;
  return "Unknown";
}

function describeTransferStyle(totalTransfers, activeWeeks, penaltyPoints) {
  if (totalTransfers >= 45) {
    return `这是一个明显愿意主动换人的赛季。${activeWeeks} 个比赛周动过手，而且愿意为节奏付出 ${penaltyPoints} 分。`;
  }
  if (totalTransfers >= 28) {
    return `整体不是乱冲的风格，但也绝不保守。${activeWeeks} 个比赛周有动作，说明你会在合适的时候果断出手。`;
  }
  return `这赛季的转会节奏偏克制，更像是只在真的想清楚以后才动手。`;
}

function describeCaptainStyle(captainCount, favoriteCaptainName) {
  if (captainCount >= 8) {
    return `这是一份相当敢开 Captain 的赛季记录，而 ${favoriteCaptainName} 看起来像你最熟悉的答案。`;
  }
  if (captainCount >= 4) {
    return `你不是每周都开 Captain，但会把它留给自己最有把握的时点。`;
  }
  if (captainCount >= 1) {
    return `Captain 用得不算多，不过每一次都很像一次认真下的注。`;
  }
  return `这一季还没有留下 Captain 记录，反而让这页多了点“按兵不动”的味道。`;
}

function extractPickedElementIds(picksPayload) {
  return [...new Set(
    (Array.isArray(picksPayload?.picks) ? picksPayload.picks : [])
      .map((pick) => Number(pick?.element || 0))
      .filter((elementId) => elementId > 0)
  )];
}

function sortTransfersChronologically(transfers) {
  return [...(transfers || [])].sort((a, b) =>
    Number(a?.event || 0) - Number(b?.event || 0) ||
    String(a?.time || "").localeCompare(String(b?.time || "")) ||
    Number(a?.index || 0) - Number(b?.index || 0)
  );
}

function buildTimeSlotMeta(hour) {
  const safeHour = Number(hour);
  if (!Number.isFinite(safeHour) || safeHour < 0) return null;
  const normalizedHour = Math.max(0, Math.min(23, Math.floor(safeHour)));
  const startHour = Math.floor(normalizedHour / 2) * 2;
  const endHour = Math.min(24, startHour + 2);
  return {
    start_hour: startHour,
    label: `${String(startHour).padStart(2, "0")}-${String(endHour).padStart(2, "0")}`,
    full_label: `${String(startHour).padStart(2, "0")}:00-${String(endHour).padStart(2, "0")}:00`,
  };
}

function getBeijingHourFromIso(isoValue) {
  if (!isoValue) return null;
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) return null;
  const hourText = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Shanghai",
    hour: "2-digit",
    hour12: false,
  }).format(date);
  const hour = Number(hourText);
  return Number.isFinite(hour) ? hour : null;
}

function formatBeijingClockFromIso(isoValue) {
  if (!isoValue) return "";
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Shanghai",
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  }).format(date).replace(/^0/, "");
}

function buildTransferPreferenceSummary(transfers) {
  const dayCounter = new Map();
  const slotCounter = new Map();
  const fixedDays = [1, 2, 3, 4, 5, 6, 7];
  const fixedSlots = Array.from({ length: 12 }, (_, index) => index * 2);

  for (const transfer of transfers || []) {
    const day = Number(transfer?.day || 0);
    if (day > 0) {
      dayCounter.set(day, Number(dayCounter.get(day) || 0) + 1);
    }

    const slotMeta = buildTimeSlotMeta(getBeijingHourFromIso(transfer?.time));
    if (slotMeta) {
      slotCounter.set(slotMeta.start_hour, Number(slotCounter.get(slotMeta.start_hour) || 0) + 1);
    }
  }

  const dayDistribution = fixedDays.map((day) => ({
    day,
    label: `Day${day}`,
    count: Number(dayCounter.get(day) || 0),
  }));

  const timeDistribution = fixedSlots.map((startHour) => {
    const meta = buildTimeSlotMeta(startHour);
    return {
      start_hour: Number(startHour || 0),
      label: meta?.label || "",
      full_label: meta?.full_label || "",
      count: Number(slotCounter.get(startHour) || 0),
    };
  });

  const favoriteDayEntry = [...dayCounter.entries()]
    .sort((a, b) => Number(b[1] || 0) - Number(a[1] || 0) || Number(a[0] || 0) - Number(b[0] || 0))[0] || null;
  const favoriteSlotEntry = [...slotCounter.entries()]
    .sort((a, b) => Number(b[1] || 0) - Number(a[1] || 0) || Number(a[0] || 0) - Number(b[0] || 0))[0] || null;
  const favoriteSlotMeta = favoriteSlotEntry ? buildTimeSlotMeta(favoriteSlotEntry[0]) : null;
  const favoriteSlotExample = favoriteSlotEntry
    ? [...(transfers || [])]
      .filter((transfer) => {
        const slotMeta = buildTimeSlotMeta(getBeijingHourFromIso(transfer?.time));
        return slotMeta && Number(slotMeta.start_hour) === Number(favoriteSlotEntry[0]);
      })
      .sort((a, b) =>
        String(b?.time || "").localeCompare(String(a?.time || "")) ||
        Number(b?.event || 0) - Number(a?.event || 0) ||
        Number(b?.index || 0) - Number(a?.index || 0)
      )[0] || null
    : null;

  return {
    day_distribution: dayDistribution,
    time_distribution: timeDistribution,
    favorite_day: favoriteDayEntry ? {
      day: Number(favoriteDayEntry[0] || 0),
      count: Number(favoriteDayEntry[1] || 0),
      label: `Day${Number(favoriteDayEntry[0] || 0)}`,
    } : null,
    favorite_time_slot: favoriteSlotEntry ? {
      start_hour: Number(favoriteSlotEntry[0] || 0),
      label: favoriteSlotMeta?.label || "",
      full_label: favoriteSlotMeta?.full_label || "",
      count: Number(favoriteSlotEntry[1] || 0),
      example_transfer: favoriteSlotExample ? {
        time_label: formatBeijingClockFromIso(favoriteSlotExample?.time),
        player_in_name: String(favoriteSlotExample?.in_name || `#${favoriteSlotExample?.element_in || ""}`).trim(),
      } : null,
    } : null,
  };
}

async function buildLongestHeldPlayerSummary(uidNumber, latestEventId, rowEventIds, transfers, elements) {
  const eventIds = [...new Set((rowEventIds || []).map((eventId) => Number(eventId || 0)).filter((eventId) => eventId > 0))].sort((a, b) => a - b);
  const finalEventId = Number(latestEventId || eventIds[eventIds.length - 1] || 0);
  if (!finalEventId || !eventIds.length) return null;

  const picksRes = await fetchJsonSafe(`/entry/${uidNumber}/event/${finalEventId}/picks/`, 1);
  if (!picksRes.ok || !Array.isArray(picksRes.data?.picks)) return null;

  const roster = new Set(extractPickedElementIds(picksRes.data));
  if (!roster.size) return null;

  const transfersByEvent = new Map();
  for (const transfer of sortTransfersChronologically(transfers)) {
    const eventId = Number(transfer?.event || 0);
    if (!eventId || !eventIds.includes(eventId)) continue;
    if (!transfersByEvent.has(eventId)) transfersByEvent.set(eventId, []);
    transfersByEvent.get(eventId).push(transfer);
  }

  const snapshotByEvent = new Map();
  snapshotByEvent.set(finalEventId, new Set(roster));

  for (let index = eventIds.length - 1; index > 0; index -= 1) {
    const currentEventId = Number(eventIds[index] || 0);
    const previousEventId = Number(eventIds[index - 1] || 0);
    const currentTransfers = transfersByEvent.get(currentEventId) || [];
    for (let transferIndex = currentTransfers.length - 1; transferIndex >= 0; transferIndex -= 1) {
      const transfer = currentTransfers[transferIndex] || {};
      const inId = Number(transfer?.element_in || 0);
      const outId = Number(transfer?.element_out || 0);
      if (inId > 0) roster.delete(inId);
      if (outId > 0) roster.add(outId);
    }
    snapshotByEvent.set(previousEventId, new Set(roster));
  }

  const totals = new Map();
  for (const eventId of eventIds) {
    const snapshot = snapshotByEvent.get(eventId);
    if (!snapshot) continue;
    for (const elementId of snapshot) {
      const existing = totals.get(elementId) || {
        element_id: elementId,
        player_name: elements[elementId]?.name || `#${elementId}`,
        headshot_url: elements[elementId]?.headshot_url || null,
        ownership_percent: Number(elements[elementId]?.selected_by_percent || 0),
        points_per_game: Number(elements[elementId]?.points_per_game || 0) / 10,
        days_held: 0,
        first_event: eventId,
        last_event: eventId,
      };
      existing.days_held += 1;
      existing.last_event = eventId;
      totals.set(elementId, existing);
    }
  }

  return [...totals.values()]
    .sort((a, b) =>
      Number(b?.days_held || 0) - Number(a?.days_held || 0) ||
      String(a?.player_name || "").localeCompare(String(b?.player_name || ""))
    );
}

async function buildSeasonCaptainRecord(uidNumber, chip, elements, eventMetaById, retries = 6) {
  const eventId = Number(chip?.event || 0);
  if (!eventId) return null;

  const picksRes = await fetchJsonSafe(`/entry/${uidNumber}/event/${eventId}/picks/`, retries);
  if (!picksRes.ok) return null;

  const picks = Array.isArray(picksRes.data?.picks) ? picksRes.data.picks : [];
  const captainPick = picks.find((pick) => pick?.is_captain || Number(pick?.multiplier || 1) > 1) || null;
  if (!captainPick) return null;

  const liveRes = await fetchJsonSafe(`/event/${eventId}/live/`, retries);
  if (!liveRes.ok) return null;

  const liveElements = buildLiveElementsMap(liveRes.data);
  const elementId = Number(captainPick?.element || 0);
  const livePlayer = liveElements?.[elementId] || null;
  const liveStats = livePlayer?.stats || {};
  const rawLiveFantasy = Number(livePlayer?.stats?.total_points);
  let baseFantasyPoints = null;
  if (Number.isFinite(rawLiveFantasy)) {
    baseFantasyPoints = Number((rawLiveFantasy / 10).toFixed(1));
  } else if (livePlayer?.stats) {
    baseFantasyPoints = Number(getPlayerStats(elementId, liveElements, elements)?.fantasy || 0);
  }
  if (!Number.isFinite(baseFantasyPoints)) return null;

  const rawMultiplier = Number(captainPick?.multiplier || 1);
  const captainMultiplier = rawMultiplier > 1 ? rawMultiplier : (captainPick?.is_captain ? 2 : 1);
  const fantasyPoints = Number(baseFantasyPoints || 0) * captainMultiplier;
  const meta = eventMetaById?.[eventId] || {};
  const pointsScored = Number(liveStats?.points_scored || 0) || 0;
  const rebounds = Number(liveStats?.rebounds || 0) || 0;
  const assists = Number(liveStats?.assists || 0) || 0;
  const steals = Number(liveStats?.steals || 0) || 0;
  const blocks = Number(liveStats?.blocks || 0) || 0;
  const minutes = Number(liveStats?.minutes || 0) || 0;
  const didPlay = minutes > 0 || pointsScored > 0 || rebounds > 0 || assists > 0 || steals > 0 || blocks > 0;
  const dateLabel = formatBeijingMonthDayLabel(meta?.deadline_time || null);

  return {
    event: eventId,
    gw: Number(meta?.gw || 0) || null,
    day: Number(meta?.day || 0) || null,
    label: toGwDayLabel(meta?.gw, meta?.day),
    date_label: dateLabel || null,
    element_id: elementId,
    captain_name: elements[elementId]?.name || `#${elementId}`,
    headshot_url: elements[elementId]?.headshot_url || null,
    season_average_points: Number((Number(elements[elementId]?.points_per_game || 0) / 10).toFixed(1)),
    base_points: Number(Number(baseFantasyPoints || 0).toFixed(1)),
    captain_multiplier: captainMultiplier,
    captain_points: Number(Number(fantasyPoints || 0).toFixed(1)),
    minutes,
    points_scored: pointsScored,
    rebounds,
    assists,
    steals,
    blocks,
    did_play: didPlay,
    ownership_percent: Number(elements[elementId]?.selected_by_percent || 0),
  };
}

async function buildSeasonCaptainRecords(uidNumber, captainEvents, elements, eventMetaById) {
  const chips = [...new Map(
    (captainEvents || [])
      .map((chip) => [Number(chip?.event || 0), chip])
      .filter(([eventId]) => eventId > 0)
  ).values()];
  if (!chips.length) return [];

  const recordsByEvent = new Map();
  const unresolved = [];

  for (const chip of chips) {
    const record = await buildSeasonCaptainRecord(uidNumber, chip, elements, eventMetaById, 6);
    if (record) {
      recordsByEvent.set(Number(record?.event || 0), record);
    } else {
      unresolved.push(chip);
    }
  }

  if (unresolved.length) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    for (const chip of unresolved) {
      const record = await buildSeasonCaptainRecord(uidNumber, chip, elements, eventMetaById, 8);
      if (record) recordsByEvent.set(Number(record?.event || 0), record);
    }
  }

  return [...recordsByEvent.values()].sort((a, b) =>
    Number(a?.event || 0) - Number(b?.event || 0)
  );
}

function formatHighlightPlayerDisplayName(player) {
  const first = String(player?.first_name || "").trim();
  const last = String(player?.second_name || player?.web_name || "").trim();
  if (first && last) {
    return `${first.charAt(0)}.${last}`.toUpperCase();
  }
  return String(player?.web_name || player?.second_name || player?.first_name || "PLAYER").trim().toUpperCase();
}

async function buildSeasonHighlightLineupSnapshot(uidNumber, eventId, bootstrap, elements, eventMetaById, captainEnabled = false) {
  const safeEventId = Number(eventId || 0);
  if (!safeEventId) return null;

  const [picksRes, liveRes] = await Promise.all([
    fetchJsonSafe(`/entry/${uidNumber}/event/${safeEventId}/picks/`, 4),
    fetchJsonSafe(`/event/${safeEventId}/live/`, 4),
  ]);

  if (!picksRes.ok || !liveRes.ok) return null;

  const liveElements = buildLiveElementsMap(liveRes.data);
  const teamsMetaById = buildTeamsMetaMap(bootstrap, getTeamVisualMeta);
  const bootstrapElementsById = Object.fromEntries(
    (bootstrap?.elements || []).map((player) => [Number(player?.id || 0), player])
  );
  const picks = buildLivePicksFromPicksData(picksRes.data, elements, liveElements, teamsMetaById);
  const lineupPlayers = picks
    .filter((item) => Number(item?.multiplier || 0) > 0)
    .sort((a, b) => Number(a?.lineup_position || 0) - Number(b?.lineup_position || 0))
    .slice(0, 5)
    .map((player) => {
      const elementId = Number(player?.element_id || 0);
      const rawLiveFantasy = Number(liveElements?.[elementId]?.stats?.total_points);
      const bootstrapPlayer = bootstrapElementsById[elementId] || {};
      const teamMeta = teamsMetaById[Number(player?.team_id || 0)] || {};
      const points = Number.isFinite(rawLiveFantasy)
        ? Math.round((rawLiveFantasy / 10) * (Number(player?.multiplier || 1) || 1))
        : Number(player?.final_points || 0);
      return {
        element_id: elementId || null,
        player_name: String(player?.name || `#${player?.element_id || ""}`).trim(),
        display_name: formatHighlightPlayerDisplayName(bootstrapPlayer),
        headshot_url: player?.headshot_url || null,
        team_short: String(player?.team_short || "").trim(),
        team_logo_url: player?.team_logo_url || "/nba-team-logos/_.png",
        team_color: String(teamMeta?.color || "").trim() || null,
        position_type: Number(player?.position_type || 0) || null,
        is_captain: !!captainEnabled && !!player?.is_captain,
        points,
      };
    });

  const meta = eventMetaById?.[safeEventId] || {};
  return {
    event: safeEventId,
    gw: Number(meta?.gw || 0) || null,
    day: Number(meta?.day || 0) || null,
    label: toGwDayLabel(meta?.gw, meta?.day),
    players: lineupPlayers,
  };
}

async function buildSeasonHighlightLineupPayload(uidInput, eventInput, captainEnabledInput = false) {
  const uidNumber = uidToNumber(uidInput);
  const safeEventId = Number(eventInput || 0);
  const captainEnabled = String(captainEnabledInput || "").toLowerCase() === "true" || captainEnabledInput === true || captainEnabledInput === "1";
  if (!uidNumber) {
    throw new Error("uid is required");
  }
  if (!safeEventId) {
    throw new Error("event is required");
  }

  const bootstrap = await fetchJson("/bootstrap-static/", 1);
  const elements = buildElementsMap(bootstrap);
  const eventMetaById = buildEventMetaById(bootstrap.events || []);
  const lineup = await buildSeasonHighlightLineupSnapshot(uidNumber, safeEventId, bootstrap, elements, eventMetaById, captainEnabled);
  if (!lineup || !Array.isArray(lineup?.players) || !lineup.players.length) {
    throw new Error(`highlight lineup not found for uid ${uidNumber} event ${safeEventId}`);
  }

  return {
    success: true,
    uid: uidNumber,
    event: safeEventId,
    lineup,
  };
}

async function buildSeasonSummaryMomentExtrasPayload(uidInput) {
  const uidNumber = uidToNumber(uidInput);
  if (!uidNumber) {
    throw new Error("uid is required");
  }

  const [bootstrap, historyRes] = await Promise.all([
    fetchJson("/bootstrap-static/", 1),
    fetchJsonSafe(`/entry/${uidNumber}/history/`, 1),
  ]);

  if (!historyRes.ok || !historyRes.data) {
    throw new Error(`entry ${uidNumber} history not found`);
  }

  const historyData = historyRes.data;
  const elements = buildElementsMap(bootstrap);
  const eventMetaById = buildEventMetaById(bootstrap.events || []);
  const rows = getSortedHistoryRows(historyData);
  const rowEventIds = rows.map((row) => Number(row?.event || 0)).filter(Boolean);
  const extras = await buildSeasonAdditionalMomentRecords(
    uidNumber,
    rowEventIds,
    bootstrap,
    elements,
    eventMetaById
  );

  return {
    success: true,
    uid: String(uidNumber),
    bench_best: extras?.bench_best || null,
    starter_best_value: extras?.starter_best_value || null,
  };
}

function buildSeasonMomentPlayerRecord(player, eventId, eventMetaById) {
  const safeEventId = Number(eventId || 0);
  const meta = eventMetaById?.[safeEventId] || {};
  const stats = player?.stats || {};
  const basePoints = Number(player?.base_points || 0);
  const eventPriceRaw = Number(player?.selling_price || player?.purchase_price || player?.now_cost || 0);
  const price = eventPriceRaw > 0 ? eventPriceRaw / 10 : 0;
  const didPlay =
    Number(stats?.minutes || 0) > 0 ||
    Number(stats?.points || 0) > 0 ||
    Number(stats?.rebounds || 0) > 0 ||
    Number(stats?.assists || 0) > 0 ||
    Number(stats?.steals || 0) > 0 ||
    Number(stats?.blocks || 0) > 0 ||
    basePoints > 0;

  return {
    event: safeEventId,
    gw: Number(meta?.gw || 0) || null,
    day: Number(meta?.day || 0) || null,
    label: toGwDayLabel(meta?.gw, meta?.day),
    date_label: formatBeijingMonthDayLabel(meta?.deadline_time || null),
    element_id: Number(player?.element_id || 0) || null,
    player_name: String(player?.name || `#${player?.element_id || ""}`).trim(),
    headshot_url: player?.headshot_url || null,
    team_short: String(player?.team_short || "").trim(),
    price: Number(price.toFixed(1)),
    value: Number((price > 0 ? basePoints / price : 0).toFixed(1)),
    fantasy_points: Number(basePoints.toFixed(1)),
    lineup_position: Number(player?.lineup_position || 0) || null,
    is_captain: !!player?.is_captain,
    did_play: didPlay,
    minutes: Number(stats?.minutes || 0),
    points_scored: Number(stats?.points || 0),
    rebounds: Number(stats?.rebounds || 0),
    assists: Number(stats?.assists || 0),
    steals: Number(stats?.steals || 0),
    blocks: Number(stats?.blocks || 0),
  };
}

async function buildSeasonAdditionalMomentRecords(uidNumber, eventIds, bootstrap, elements, eventMetaById) {
  const safeEventIds = [...new Set((eventIds || []).map((eventId) => Number(eventId || 0)).filter((eventId) => eventId > 0))];
  if (!uidNumber || !safeEventIds.length) {
    return {
      bench_best: null,
      starter_best_value: null,
    };
  }

  const teamsMetaById = buildTeamsMetaMap(bootstrap, getTeamVisualMeta);
  let bestBench = null;
  let bestStarterValue = null;
  const failedEventIds = [];

  const pickBetterBench = (candidate) => {
    if (!candidate) return;
    if (!bestBench) {
      bestBench = candidate;
      return;
    }
    if (Number(candidate?.fantasy_points || 0) !== Number(bestBench?.fantasy_points || 0)) {
      if (Number(candidate?.fantasy_points || 0) > Number(bestBench?.fantasy_points || 0)) bestBench = candidate;
      return;
    }
    if (Number(candidate?.event || 0) !== Number(bestBench?.event || 0)) {
      if (Number(candidate?.event || 0) < Number(bestBench?.event || 0)) bestBench = candidate;
      return;
    }
    if (Number(candidate?.lineup_position || 0) < Number(bestBench?.lineup_position || 0)) bestBench = candidate;
  };

  const pickBetterStarterValue = (candidate) => {
    if (!candidate) return;
    if (!bestStarterValue) {
      bestStarterValue = candidate;
      return;
    }
    if (Number(candidate?.value || 0) !== Number(bestStarterValue?.value || 0)) {
      if (Number(candidate?.value || 0) > Number(bestStarterValue?.value || 0)) bestStarterValue = candidate;
      return;
    }
    if (Number(candidate?.fantasy_points || 0) !== Number(bestStarterValue?.fantasy_points || 0)) {
      if (Number(candidate?.fantasy_points || 0) > Number(bestStarterValue?.fantasy_points || 0)) bestStarterValue = candidate;
      return;
    }
    if (Number(candidate?.price || 0) !== Number(bestStarterValue?.price || 0)) {
      if (Number(candidate?.price || 0) < Number(bestStarterValue?.price || 0)) bestStarterValue = candidate;
      return;
    }
    if (Number(candidate?.event || 0) < Number(bestStarterValue?.event || 0)) bestStarterValue = candidate;
  };

  const processEvent = async (eventId, retries) => {
    const [picksRes, liveRes] = await Promise.all([
      fetchJsonSafe(`/entry/${uidNumber}/event/${eventId}/picks/`, retries),
      fetchJsonSafe(`/event/${eventId}/live/`, retries),
    ]);
    if (!picksRes.ok || !liveRes.ok) return false;

    const liveElements = buildLiveElementsMap(liveRes.data);
    const picks = buildLivePicksFromPicksData(picksRes.data, elements, liveElements, teamsMetaById);

    for (const player of picks) {
      const record = buildSeasonMomentPlayerRecord(player, eventId, eventMetaById);
      const lineupPosition = Number(player?.lineup_position || 0);
      const isStarter = Number(player?.multiplier || 0) > 0 && lineupPosition > 0 && lineupPosition <= 5;
      const isBench = lineupPosition > 5 || (lineupPosition > 0 && Number(player?.multiplier || 0) <= 0);

      if (isBench) {
        pickBetterBench(record);
      }
      if (isStarter && Number(record?.price || 0) > 0) {
        pickBetterStarterValue(record);
      }
    }
    return true;
  };

  await mapLimit(safeEventIds, 4, async (eventId) => {
    const ok = await processEvent(eventId, 4);
    if (!ok) failedEventIds.push(eventId);
    return null;
  });

  if (failedEventIds.length) {
    for (const eventId of failedEventIds) {
      await processEvent(eventId, 8);
    }
  }

  return {
    bench_best: bestBench,
    starter_best_value: bestStarterValue,
  };
}

function computeLeaguePercentileByRank(rank, managerCount) {
  const safeRank = Number(rank || 0);
  const safeCount = Number(managerCount || 0);
  if (!safeRank || !safeCount || safeCount <= 1) return null;
  const percentile = ((safeCount - safeRank) / (safeCount - 1)) * 100;
  return Math.max(0, Math.min(100, Math.round(percentile)));
}

async function buildSeasonSummaryPayload(uidInput, options = {}) {
  const uidNumber = uidToNumber(uidInput);
  if (!uidNumber) {
    throw new Error("uid is required");
  }

  const [bootstrap, historyRes, transfersRes, entryRes] = await Promise.all([
    fetchJson("/bootstrap-static/", 1),
    fetchJsonSafe(`/entry/${uidNumber}/history/`, 1),
    fetchJsonSafe(`/entry/${uidNumber}/transfers/`, 1),
    fetchJsonSafe(`/entry/${uidNumber}/`, 1),
  ]);

  if (!historyRes.ok || !historyRes.data) {
    throw new Error(`entry ${uidNumber} history not found`);
  }

  const historyData = historyRes.data;
  const entryData = entryRes.ok ? entryRes.data : null;
  const elements = buildElementsMap(bootstrap);
  const eventMetaById = buildEventMetaById(bootstrap.events || []);
  const seasonTeamsById = {};
  for (const team of bootstrap?.teams || []) {
    seasonTeamsById[Number(team?.id || 0)] = {
      name: String(team?.name || "").trim(),
      short_name: String(team?.short_name || "").trim(),
    };
  }

  const rows = getSortedHistoryRows(historyData);
  const latestRow = rows[rows.length - 1] || {};
  const rowEventIds = rows.map((row) => Number(row?.event || 0)).filter(Boolean);
  const totalSeasonPoints = Math.max(
    formatFantasyScore(rows.reduce((sum, row) => sum + Number(row?.points || 0), 0)),
    formatFantasyScore(latestRow?.total_points || 0)
  );
  const overallRank = getLatestPositiveValue(rows.map((row) => row?.overall_rank)) || Number(entryData?.summary_overall_rank || 0) || null;
  const seasonCurve = buildWeeklyCurve(rows, eventMetaById);
  const weeklyTotals = [];
  let previous = 0;
  for (const total of seasonCurve) {
    weeklyTotals.push(Number(total || 0) - previous);
    previous = Number(total || 0);
  }
  const bestWeekScore = weeklyTotals.length ? Math.max(...weeklyTotals) : 0;

  const pastSeasons = Array.isArray(historyData?.past) ? historyData.past : [];
  const seasonCount = Math.max(1, pastSeasons.length + 1);
  const previousSeason = pastSeasons[pastSeasons.length - 1] || null;
  const previousSeasonPoints = previousSeason ? formatFantasyScore(previousSeason?.total_points || previousSeason?.points || previousSeason?.total || 0) : null;
  const previousSeasonRank = previousSeason ? Number(previousSeason?.rank || 0) || null : null;
  const pointsDelta = previousSeasonPoints !== null ? totalSeasonPoints - previousSeasonPoints : null;
  const leagueStandingsRows = Array.isArray(options?.leagueStandingsRows)
    ? options.leagueStandingsRows
    : await fetchAllStandings(1, SEASON_SUMMARY_LEAGUE_ID);
  const leagueManagerCount = Math.max(1, Number(leagueStandingsRows.length || UID_LIST.length));
  const leagueStandingRow = leagueStandingsRows.find((row) => Number(row?.entry || 0) === Number(uidNumber || 0)) || null;
  const leagueRank = Number(leagueStandingRow?.rank || 0) || null;
  const leaguePercentile = computeLeaguePercentileByRank(leagueRank, leagueManagerCount);

  const chipEventNameByEvent = buildSeasonChipEventNameMap(historyData);
  const rawTransfers = Array.isArray(transfersRes.data) ? transfersRes.data : [];
  const qualifiedTransfers = rawTransfers
    .map((transfer, index) => {
      const eventId = Number(transfer?.event || 0);
      const chipName = String(chipEventNameByEvent[eventId] || "").toLowerCase();
      const { gw, day } = resolveTransferGwDay(transfer, eventMetaById);
      const inId = Number(transfer?.element_in || 0);
      const outId = Number(transfer?.element_out || 0);
      return {
        ...transfer,
        index,
        event: eventId,
        gw,
        day,
        time: String(transfer?.time || ""),
        label: toGwDayLabel(gw, day),
        is_chip_bulk_move: chipName === "wildcard" || chipName === "wild_card" || chipName === "rich",
        in_name: elements[inId]?.name || `#${inId}`,
        out_name: elements[outId]?.name || `#${outId}`,
      };
    })
    .filter((transfer) => !transfer.is_chip_bulk_move);

  const transferWeeksActive = new Set(qualifiedTransfers.map((transfer) => Number(transfer?.gw || 0)).filter(Boolean)).size;
  const transferPenaltyPoints = formatFantasyScore(rows.reduce((sum, row) => sum + Number(row?.event_transfers_cost || 0), 0));
  const incomingCounts = new Map();
  const outgoingCounts = new Map();
  const returningCounts = new Map();
  for (const transfer of qualifiedTransfers) {
    const inId = Number(transfer?.element_in || 0);
    const outId = Number(transfer?.element_out || 0);
    if (inId > 0) incomingCounts.set(inId, Number(incomingCounts.get(inId) || 0) + 1);
    if (outId > 0) outgoingCounts.set(outId, Number(outgoingCounts.get(outId) || 0) + 1);
  }
  for (const [elementId, count] of incomingCounts.entries()) {
    if (count > 1) returningCounts.set(elementId, count);
  }
  const compareElementCounts = (left, right) =>
    Number(right?.[1] || 0) - Number(left?.[1] || 0) ||
    String(elements?.[Number(left?.[0] || 0)]?.name || `#${left?.[0] || ""}`).localeCompare(
      String(elements?.[Number(right?.[0] || 0)]?.name || `#${right?.[0] || ""}`)
    );
  const favoriteIncoming = [...incomingCounts.entries()].sort(compareElementCounts)[0] || null;
  const favoriteOutgoing = [...outgoingCounts.entries()].sort(compareElementCounts)[0] || null;
  const favoriteReturner = [...returningCounts.entries()].sort(compareElementCounts)[0] || null;
  const latestEventId = Number(latestRow?.event || rowEventIds[rowEventIds.length - 1] || 0);
  const holdRanking = await buildLongestHeldPlayerSummary(uidNumber, latestEventId, rowEventIds, rawTransfers, elements);
  const longestHold = holdRanking?.[0] || null;
  const totalUniquePlayers = Number(holdRanking?.length || 0);
  const totalHeldDays = (holdRanking || []).reduce((sum, item) => sum + Number(item?.days_held || 0), 0);
  const averageHoldDays = totalUniquePlayers > 0 ? totalHeldDays / totalUniquePlayers : 0;
  const weightedHeldScoreTotal = (holdRanking || []).reduce(
    (sum, item) => sum + (Number(item?.points_per_game || 0) * Number(item?.days_held || 0)),
    0
  );
  const averageHeldPlayerScore = totalHeldDays > 0 ? weightedHeldScoreTotal / totalHeldDays : 0;
  const lowestOwnershipHeldPlayer = [...(holdRanking || [])]
    .filter((item) => Number.isFinite(Number(item?.ownership_percent || 0)))
    .sort((a, b) =>
      Number(a?.ownership_percent || 0) - Number(b?.ownership_percent || 0) ||
      Number(b?.days_held || 0) - Number(a?.days_held || 0) ||
      String(a?.player_name || "").localeCompare(String(b?.player_name || ""))
    )[0] || null;
  const transferPreferences = buildTransferPreferenceSummary(qualifiedTransfers);
  const seasonWeeksTracked = Math.max(
    0,
    ...rowEventIds.map((eventId) => Number(eventMetaById?.[Number(eventId || 0)]?.gw || 0))
  );
  const transferPenaltyEvents = rows.filter((row) => Number(row?.event_transfers_cost || 0) > 0).length;
  const transferEveryWeek = seasonWeeksTracked > 0 && transferWeeksActive >= seasonWeeksTracked;

  const captainEvents = [...new Map(
    (Array.isArray(historyData?.chips) ? historyData.chips : [])
      .map((item) => {
        const eventId = Number(item?.event || 0);
        const rawName = String(item?.name || "").toLowerCase();
        const meta = eventMetaById?.[eventId] || {};
        return [
          eventId,
          {
            event: eventId,
            name: rawName,
            gw: Number(item?.gw || item?.gameweek || meta?.gw || 0) || null,
            day: Number(item?.day || meta?.day || 0) || null,
          },
        ];
      })
      .filter(([eventId, item]) => eventId && item.name === "phcapt")
  ).values()].sort((a, b) => Number(a?.event || 0) - Number(b?.event || 0));
  const captainEventSet = new Set(captainEvents.map((item) => Number(item?.event || 0)).filter(Boolean));

  const captainRecords = await buildSeasonCaptainRecords(uidNumber, captainEvents, elements, eventMetaById);
  const captainUseCount = captainEvents.length;
  const captainResolvedCount = captainRecords.length;
  const captainDetailComplete = captainUseCount === 0 || captainResolvedCount === captainUseCount;
  const captainTotalPoints = captainRecords.reduce((sum, item) => sum + Number(item?.captain_points || 0), 0);
  const captainAveragePoints = captainRecords.length > 0 ? captainTotalPoints / captainRecords.length : 0;
  const captainCountsByElement = new Map();
  for (const record of captainRecords) {
    const elementId = Number(record?.element_id || 0);
    if (!elementId) continue;
    captainCountsByElement.set(elementId, Number(captainCountsByElement.get(elementId) || 0) + 1);
  }
  const favoriteCaptain = [...captainCountsByElement.entries()].sort((a, b) =>
    Number(b?.[1] || 0) - Number(a?.[1] || 0) ||
    String(elements[Number(a?.[0] || 0)]?.name || `#${a?.[0] || ""}`).localeCompare(
      String(elements[Number(b?.[0] || 0)]?.name || `#${b?.[0] || ""}`)
    )
  )[0] || null;
  const favoriteCaptainRecords = favoriteCaptain
    ? captainRecords.filter((record) => Number(record?.element_id || 0) === Number(favoriteCaptain[0] || 0))
    : [];
  const favoriteCaptainRecord = favoriteCaptainRecords[0] || null;
  const favoriteCaptainAverage = favoriteCaptainRecords.length
    ? favoriteCaptainRecords.reduce((sum, item) => sum + Number(item?.captain_points || 0), 0) / favoriteCaptainRecords.length
    : 0;
  const favoriteCaptainBaseAverage = favoriteCaptainRecords.length
    ? favoriteCaptainRecords.reduce((sum, item) => sum + Number(item?.base_points || 0), 0) / favoriteCaptainRecords.length
    : 0;
  const favoriteCaptainSeasonAverage = Number(favoriteCaptainRecord?.season_average_points || 0);
  const bestCaptain = [...captainRecords].sort((a, b) => Number(b?.captain_points || 0) - Number(a?.captain_points || 0))[0] || null;
  const worstCaptain = [...captainRecords].sort((a, b) => Number(a?.captain_points || 0) - Number(b?.captain_points || 0))[0] || null;
  const zeroCaptainCount = captainRecords.filter((item) => Number(item?.captain_points || 0) <= 0).length;
  const lowestOwnershipCaptain = [...captainRecords]
    .filter((item) => Number(item?.ownership_percent || 0) > 0)
    .sort((a, b) =>
      Number(a?.ownership_percent || 0) - Number(b?.ownership_percent || 0) ||
      Number(b?.captain_points || 0) - Number(a?.captain_points || 0) ||
      Number(a?.event || 0) - Number(b?.event || 0)
    )[0] || null;

  const bestDayRow = [...rows].sort((a, b) => Number(b?.points || 0) - Number(a?.points || 0))[0] || null;
  const bestDayMeta = eventMetaById?.[Number(bestDayRow?.event || 0)] || {};
  const bestDayPoints = bestDayRow ? formatFantasyScore(bestDayRow.points) : 0;
  const getHistoryGameRank = (row) => {
    const rankSort = Number(row?.rank_sort || 0);
    if (Number.isFinite(rankSort) && rankSort > 0) return rankSort;
    const rank = Number(row?.rank || 0);
    return Number.isFinite(rank) && rank > 0 ? rank : 0;
  };
  const bestRankRow = rows
    .filter((row) => getHistoryGameRank(row) > 0)
    .sort((a, b) => getHistoryGameRank(a) - getHistoryGameRank(b))[0] || null;
  const bestRankMeta = eventMetaById?.[Number(bestRankRow?.event || 0)] || {};
  const additionalMoments = await buildSeasonAdditionalMomentRecords(
    uidNumber,
    rowEventIds,
    bootstrap,
    elements,
    eventMetaById
  );
  const highlightEventIds = [...new Set(
    [Number(bestDayRow?.event || 0), Number(bestRankRow?.event || 0)].filter((value) => value > 0)
  )];
  const highlightLineupEntries = await Promise.all(
    highlightEventIds.map(async (eventId) => [
      eventId,
      await buildSeasonHighlightLineupSnapshot(uidNumber, eventId, bootstrap, elements, eventMetaById, captainEventSet.has(Number(eventId || 0))),
    ])
  );
  const highlightLineupsByEvent = Object.fromEntries(highlightLineupEntries);

  const managerName = getManagerDisplayName(uidNumber, historyData, entryData);
  const teamName = getTeamDisplayName(uidNumber, historyData, entryData);
  const seasonLabel = buildSeasonLabel();
  const captainFavoriteName = favoriteCaptain?.[0] || "还没有固定答案";
  const generatedAt = new Date().toISOString();
  const realName = [
    entryData?.player_first_name,
    entryData?.player_last_name,
  ].filter((value) => String(value || "").trim()).join(" ").trim() || managerName;
  const displayName = String(entryData?.name || teamName || managerName || `#${uidNumber}`).trim();
  const chinaLeague = (entryData?.leagues?.classic || []).find((league) =>
    String(league?.name || "").trim().toLowerCase() === "china"
  ) || null;
  const chinaRank = Number(chinaLeague?.entry_rank || 0) || null;
  const rankDelta = previousSeasonRank && overallRank ? previousSeasonRank - overallRank : null;
  const openingMessage = seasonCount <= 1
    ? (
      overallRank && overallRank < 1000
        ? `恭喜你完成了自己的第一个赛季！没想到第一个赛季就能达到全球第 ${formatDisplayRank(overallRank)} 名的排名，你真是范特西的天赋玩家。`
        : "恭喜你完成了自己的第一个赛季！排名什么都不重要，能玩得开心才是这个游戏的真谛。"
    )
    : (seasonCount === 2
      ? (
        rankDelta === null
          ? "恭喜你陪这个游戏走过了第二个年头。"
          : rankDelta > 0
            ? `恭喜你陪这个游戏走过了第二个年头，相比上个赛季还进步了 ${formatDisplayNumber(rankDelta)} 名，看来你逐渐摸清了这个游戏的套路了`
            : rankDelta < 0
              ? `恭喜你陪这个游戏走过了第二个年头，可惜比上个赛季退步了 ${formatDisplayNumber(Math.abs(rankDelta))} 名，继续努力吧`
              : "恭喜你陪这个游戏走过了第二个年头，而且和上个赛季保持住了同样的名次。"
      )
      : (
        previousSeasonPoints !== null
          ? `这是你的第 ${seasonCount} 个赛季。和上赛季相比，你的总分变化是 ${formatSignedFantasyDelta(pointsDelta)}，这一季的每一步都更像你自己的节奏。`
          : `这是你的第 ${seasonCount} 个赛季。能一路玩到现在，本身就说明你已经把这项游戏变成了自己的长期爱好。`
      ));

  return {
    success: true,
    uid: String(uidNumber),
    managerName,
    teamName,
    seasonLabel,
    seasonCount,
    sourceLabel: "official api live",
    generated_at: generatedAt,
    generatedLabel: formatBeijingDateTimeLabel(generatedAt),
    sourceNote: "内测版：当前直接按官方 API 按需生成。第 5 页先用转会轨迹去描摹阵容偏好，长期持有与替补遗憾会在后续版本接入逐周阵容快照。",
    intro: `${managerName} 的 ${seasonLabel} 赛季故事已经接进主站子页面了。现在输入 entry_id 就能即时生成，不需要为了换人或改文案反复部署整个站点。`,
    cover: {
      season_mark: seasonLabel,
      display_name: displayName,
      real_name: realName,
      first_name: String(entryData?.player_first_name || "").trim(),
      last_name: String(entryData?.player_last_name || "").trim(),
      region_name: String(entryData?.player_region_name || "").trim() || null,
      subtitle: `${teamName} 的这一季，先从总分、排名、Captain 与转会节奏开始讲。现在这版更像一份能跑通真实数据链路的内测故事册，后面我们可以继续把句子打磨得更有味道。`,
      opening_message: openingMessage,
      or_curve: buildOverallRankCurve(rows, eventMetaById),
      tags: [
        `第 ${seasonCount} 赛季`,
        `${qualifiedTransfers.length} 次非芯片转会`,
        captainUseCount ? `${captainUseCount} 次 Captain` : "Captain 还没开张",
      ],
      stats: [
        ["赛季总分", formatDisplayNumber(totalSeasonPoints), ""],
        ["全球排名", formatDisplayRank(overallRank), ""],
        ["中国排名", formatDisplayRank(chinaRank), ""],
      ],
      footer: [
        ["赛季总分", formatDisplayNumber(totalSeasonPoints)],
        ["全球排名", formatDisplayRank(overallRank)],
        ["数据来源", "Official API"],
      ],
    },
    overview: {
      lead: seasonCount > 1
        ? `这是你的第 ${seasonCount} 个赛季。把它放回整季曲线里看，比单看某一周更容易看出你这一季到底是稳住了、起伏了，还是终于把自己的节奏打明白了。`
        : "这是你的首个完整赛季版本。现在这页先把总分、全球排名和赛季走势搭起来，让整体画像先站住。",
      cards: [
        ["赛季总得分", formatDisplayNumber(totalSeasonPoints), previousSeasonPoints !== null ? `相较上赛季 ${formatSignedFantasyDelta(pointsDelta)} 分` : "当前版本已接入真实赛季总分"],
        ["全球排名", formatDisplayRank(overallRank), overallRank ? "按历史接口里的最新 overall rank 展示" : "如果官方没有返回 rank，这里会留空"],
        ["赛季序列", `第 ${seasonCount} 季`, previousSeasonPoints !== null ? `上赛季总分 ${formatDisplayNumber(previousSeasonPoints)}` : "之后还可以继续做跨赛季对比"],
      ],
      curve: seasonCurve,
      sideTitle: "整体回顾",
      sideBullets: [
        `目前已经能稳定拿到赛季总分、全球排名和整季曲线。`,
        `本季单周最高分是 ${formatDisplayNumber(bestWeekScore)}，这很适合后面再补“最像你的那一周”的文案。`,
        previousSeasonPoints !== null
          ? `和上季相比，你的总分变化是 ${formatSignedFantasyDelta(pointsDelta)}。`
          : "如果后面想强化“进步/退步”的叙事，可以继续补更多 past 赛季字段。 ",
      ],
      sideKpis: [
        ["Best GW", formatDisplayNumber(bestWeekScore)],
        ["Curve", `${seasonCurve.length} 周`],
      ],
    },
    player_details: {
      lead: "这一页更像是你整季阵容选择的回头看：你到底见过多少人，又和谁相处得最久。",
      summary: {
        total_unique_players: totalUniquePlayers,
        average_player_score: Number(averageHeldPlayerScore.toFixed(1)),
        average_hold_days: Number(averageHoldDays.toFixed(1)),
        season_days: Number(rowEventIds.length || 0),
        league_percentile: leaguePercentile,
        lowest_ownership_player: lowestOwnershipHeldPlayer ? {
          element_id: Number(lowestOwnershipHeldPlayer.element_id || 0) || null,
          player_name: lowestOwnershipHeldPlayer.player_name || "",
          headshot_url: lowestOwnershipHeldPlayer.headshot_url || null,
          ownership_percent: Number(lowestOwnershipHeldPlayer.ownership_percent || 0),
          average_points: Number(lowestOwnershipHeldPlayer.points_per_game || 0),
          days_held: Number(lowestOwnershipHeldPlayer.days_held || 0),
        } : null,
        longest_hold: longestHold ? {
          element_id: Number(longestHold.element_id || 0) || null,
          player_name: longestHold.player_name || "",
          headshot_url: longestHold.headshot_url || null,
          ownership_percent: Number(longestHold.ownership_percent || 0),
          average_points: Number(longestHold.points_per_game || 0),
          days_held: Number(longestHold.days_held || 0),
        } : null,
      },
    },
    transfers: {
      lead: "这页先不把你写成冷冰冰的转会计数器，而是先看你这一季到底多爱动手、愿不愿意为节奏付费，以及有没有自己偏爱的回头草。",
      summary: {
        total_transfers: Number(qualifiedTransfers.length || 0),
        active_weeks: Number(transferWeeksActive || 0),
        season_weeks: Number(seasonWeeksTracked || 0),
        transfer_every_week: !!transferEveryWeek,
        penalty_points: Number(transferPenaltyPoints || 0),
        penalty_event_count: Number(transferPenaltyEvents || 0),
        most_in: favoriteIncoming ? {
          element_id: Number(favoriteIncoming[0] || 0) || null,
          name: elements[Number(favoriteIncoming[0] || 0)]?.name || `#${favoriteIncoming[0] || ""}`,
          count: Number(favoriteIncoming[1] || 0),
          team_short: seasonTeamsById[Number(elements[Number(favoriteIncoming[0] || 0)]?.team || 0)]?.short_name || "",
          headshot_url: elements[Number(favoriteIncoming[0] || 0)]?.headshot_url || null,
        } : null,
        most_out: favoriteOutgoing ? {
          element_id: Number(favoriteOutgoing[0] || 0) || null,
          name: elements[Number(favoriteOutgoing[0] || 0)]?.name || `#${favoriteOutgoing[0] || ""}`,
          count: Number(favoriteOutgoing[1] || 0),
          team_short: seasonTeamsById[Number(elements[Number(favoriteOutgoing[0] || 0)]?.team || 0)]?.short_name || "",
          headshot_url: elements[Number(favoriteOutgoing[0] || 0)]?.headshot_url || null,
        } : null,
        favorite_returner: favoriteReturner ? {
          element_id: Number(favoriteReturner[0] || 0) || null,
          name: elements[Number(favoriteReturner[0] || 0)]?.name || `#${favoriteReturner[0] || ""}`,
          count: Number(favoriteReturner[1] || 0),
          team_short: seasonTeamsById[Number(elements[Number(favoriteReturner[0] || 0)]?.team || 0)]?.short_name || "",
          headshot_url: elements[Number(favoriteReturner[0] || 0)]?.headshot_url || null,
        } : null,
        favorite_day: transferPreferences.favorite_day ? {
          day: Number(transferPreferences.favorite_day.day || 0),
          count: Number(transferPreferences.favorite_day.count || 0),
          label: transferPreferences.favorite_day.label || "",
        } : null,
        favorite_time_slot: transferPreferences.favorite_time_slot ? {
          start_hour: Number(transferPreferences.favorite_time_slot.start_hour || 0),
          label: transferPreferences.favorite_time_slot.label || "",
          full_label: transferPreferences.favorite_time_slot.full_label || "",
          count: Number(transferPreferences.favorite_time_slot.count || 0),
          example_transfer: transferPreferences.favorite_time_slot.example_transfer ? {
            time_label: transferPreferences.favorite_time_slot.example_transfer.time_label || "",
            player_in_name: transferPreferences.favorite_time_slot.example_transfer.player_in_name || "",
          } : null,
        } : null,
      },
      day_distribution: transferPreferences.day_distribution || [],
      time_distribution: transferPreferences.time_distribution || [],
      hold_ranking: (holdRanking || []).slice(0, 10).map((item, index) => ({
        rank: index + 1,
        player_name: item.player_name,
        days_held: Number(item.days_held || 0),
      })),
      rows: [
        ["总转会", `${formatDisplayNumber(qualifiedTransfers.length)} 次（不含 WC / AS）`],
        ["操作周数", `${formatDisplayNumber(transferWeeksActive)} 周有过动作`],
        ["扣分情况", `${transferPenaltyPoints > 0 ? "-" : ""}${formatDisplayNumber(transferPenaltyPoints)} 分`],
        ["最常换入", favoriteIncoming ? `${favoriteIncoming[0]} · ${favoriteIncoming[1]} 次` : "暂无明显偏好"],
        ["最爱换人日", transferPreferences.favorite_day ? `${transferPreferences.favorite_day.label} · ${formatDisplayNumber(transferPreferences.favorite_day.count)} 次` : "暂无明显偏好"],
        ["最爱换人时段", transferPreferences.favorite_time_slot ? `${transferPreferences.favorite_time_slot.label} · ${formatDisplayNumber(transferPreferences.favorite_time_slot.count)} 次` : "暂无明显偏好"],
      ],
      quote: describeTransferStyle(qualifiedTransfers.length, transferWeeksActive, transferPenaltyPoints),
      sideTitle: "转会侧写",
      sideBullets: [
        favoriteOutgoing ? `这一季最常送走的人是 ${favoriteOutgoing[0]}。` : "目前没有明显反复卖出的对象。",
        favoriteReturner ? `${favoriteReturner[0]} 被你反复带回来了 ${favoriteReturner[1]} 次，很像真正的“回头草”。` : "暂时还没出现特别明显的回购球员。",
        transferPreferences.favorite_day ? `你最喜欢在 ${transferPreferences.favorite_day.label} 换人。` : "暂时还看不出你固定偏爱的换人日。",
        transferPreferences.favorite_time_slot ? `最常操作的时间段是北京时间 ${transferPreferences.favorite_time_slot.label}。` : "换人时间段还没有形成稳定偏好。",
        "这一页已经完全基于真实 transfers/history 接口，不依赖首页缓存。",
      ],
    },
    captain: {
      lead: "Captain 页先按整个赛季的 Captain chip 记录来排，不看今天，不看本周，而是回头看你这一季到底把赌注押在了谁身上。",
      summary: {
        total_weeks: 25,
        use_count: captainUseCount,
        resolved_count: captainResolvedCount,
        detail_complete: captainDetailComplete,
        total_points: captainTotalPoints,
        average_points: Number(captainAveragePoints.toFixed(1)),
        league_percentile: leaguePercentile,
        favorite_captain: favoriteCaptain ? {
          element_id: Number(favoriteCaptain[0] || 0) || null,
          captain_name: favoriteCaptainRecord?.captain_name || String(elements[Number(favoriteCaptain[0] || 0)]?.name || ""),
          count: Number(favoriteCaptain[1] || 0),
          average_points: Number(favoriteCaptainAverage.toFixed(1)),
          average_base_points: Number(favoriteCaptainBaseAverage.toFixed(1)),
          season_average_points: Number(favoriteCaptainSeasonAverage || 0),
          season_average_captain_points: Number((favoriteCaptainSeasonAverage * 2).toFixed(1)),
          headshot_url: favoriteCaptainRecord?.headshot_url || null,
          team_short: seasonTeamsById[Number(elements[Number(favoriteCaptain[0] || 0)]?.team || 0)]?.short_name || "",
          is_jokic: /Jokic$/i.test(String(favoriteCaptainRecord?.captain_name || elements[Number(favoriteCaptain[0] || 0)]?.name || "")),
        } : null,
        best: bestCaptain ? {
          event: Number(bestCaptain.event || 0) || null,
          gw: Number(bestCaptain.gw || 0) || null,
          day: Number(bestCaptain.day || 0) || null,
          label: bestCaptain.label || "",
          date_label: bestCaptain.date_label || "",
          captain_name: bestCaptain.captain_name || "",
          captain_points: Number(bestCaptain.captain_points || 0),
          base_points: Number(bestCaptain.base_points || 0),
          minutes: Number(bestCaptain.minutes || 0),
          points_scored: Number(bestCaptain.points_scored || 0),
          rebounds: Number(bestCaptain.rebounds || 0),
          assists: Number(bestCaptain.assists || 0),
          steals: Number(bestCaptain.steals || 0),
          blocks: Number(bestCaptain.blocks || 0),
          did_play: !!bestCaptain.did_play,
          headshot_url: bestCaptain.headshot_url || null,
        } : null,
        worst: worstCaptain ? {
          event: Number(worstCaptain.event || 0) || null,
          gw: Number(worstCaptain.gw || 0) || null,
          day: Number(worstCaptain.day || 0) || null,
          label: worstCaptain.label || "",
          date_label: worstCaptain.date_label || "",
          captain_name: worstCaptain.captain_name || "",
          captain_points: Number(worstCaptain.captain_points || 0),
          base_points: Number(worstCaptain.base_points || 0),
          minutes: Number(worstCaptain.minutes || 0),
          points_scored: Number(worstCaptain.points_scored || 0),
          rebounds: Number(worstCaptain.rebounds || 0),
          assists: Number(worstCaptain.assists || 0),
          steals: Number(worstCaptain.steals || 0),
          blocks: Number(worstCaptain.blocks || 0),
          did_play: !!worstCaptain.did_play,
          headshot_url: worstCaptain.headshot_url || null,
        } : null,
        zero_count: zeroCaptainCount,
        lowest_ownership: lowestOwnershipCaptain ? {
          label: lowestOwnershipCaptain.label || "",
          captain_name: lowestOwnershipCaptain.captain_name || "",
          ownership_percent: Number(lowestOwnershipCaptain.ownership_percent || 0),
          captain_points: Number(lowestOwnershipCaptain.captain_points || 0),
          gw: Number(lowestOwnershipCaptain.gw || 0) || null,
          day: Number(lowestOwnershipCaptain.day || 0) || null,
          headshot_url: lowestOwnershipCaptain.headshot_url || null,
        } : null,
        bench_best: additionalMoments?.bench_best ? {
          event: Number(additionalMoments.bench_best.event || 0) || null,
          gw: Number(additionalMoments.bench_best.gw || 0) || null,
          day: Number(additionalMoments.bench_best.day || 0) || null,
          label: additionalMoments.bench_best.label || "",
          date_label: additionalMoments.bench_best.date_label || "",
          element_id: Number(additionalMoments.bench_best.element_id || 0) || null,
          player_name: additionalMoments.bench_best.player_name || "",
          headshot_url: additionalMoments.bench_best.headshot_url || null,
          team_short: additionalMoments.bench_best.team_short || "",
          price: Number(additionalMoments.bench_best.price || 0),
          fantasy_points: Number(additionalMoments.bench_best.fantasy_points || 0),
          lineup_position: Number(additionalMoments.bench_best.lineup_position || 0) || null,
          minutes: Number(additionalMoments.bench_best.minutes || 0),
          points_scored: Number(additionalMoments.bench_best.points_scored || 0),
          rebounds: Number(additionalMoments.bench_best.rebounds || 0),
          assists: Number(additionalMoments.bench_best.assists || 0),
          steals: Number(additionalMoments.bench_best.steals || 0),
          blocks: Number(additionalMoments.bench_best.blocks || 0),
          did_play: !!additionalMoments.bench_best.did_play,
        } : null,
        starter_best_value: additionalMoments?.starter_best_value ? {
          event: Number(additionalMoments.starter_best_value.event || 0) || null,
          gw: Number(additionalMoments.starter_best_value.gw || 0) || null,
          day: Number(additionalMoments.starter_best_value.day || 0) || null,
          label: additionalMoments.starter_best_value.label || "",
          date_label: additionalMoments.starter_best_value.date_label || "",
          element_id: Number(additionalMoments.starter_best_value.element_id || 0) || null,
          player_name: additionalMoments.starter_best_value.player_name || "",
          headshot_url: additionalMoments.starter_best_value.headshot_url || null,
          team_short: additionalMoments.starter_best_value.team_short || "",
          price: Number(additionalMoments.starter_best_value.price || 0),
          value: Number(additionalMoments.starter_best_value.value || 0),
          fantasy_points: Number(additionalMoments.starter_best_value.fantasy_points || 0),
          lineup_position: Number(additionalMoments.starter_best_value.lineup_position || 0) || null,
          minutes: Number(additionalMoments.starter_best_value.minutes || 0),
          points_scored: Number(additionalMoments.starter_best_value.points_scored || 0),
          rebounds: Number(additionalMoments.starter_best_value.rebounds || 0),
          assists: Number(additionalMoments.starter_best_value.assists || 0),
          steals: Number(additionalMoments.starter_best_value.steals || 0),
          blocks: Number(additionalMoments.starter_best_value.blocks || 0),
          did_play: !!additionalMoments.starter_best_value.did_play,
        } : null,
      },
      cards: [
        ["Captain 次数", `${formatDisplayNumber(captainUseCount)}/${formatDisplayNumber(25)}`, "严格按 /entry/{id}/history/ 里的 phcapt 次数统计"],
        ["队长累积得分", formatDisplayNumber(captainTotalPoints), "已按当日 Captain 球员 x2 后真实 fantasy 分回算"],
        ["队长平均得分", formatDisplayNumber(Number(captainAveragePoints.toFixed(1))), "按 x2 后得分求均值"],
      ],
      rows: [
        ["最高队长", bestCaptain ? `${bestCaptain.label} · ${bestCaptain.captain_name} · ${formatDisplayNumber(bestCaptain.captain_points)} 分` : "暂无 Captain 记录"],
        ["最低队长", worstCaptain ? `${worstCaptain.label} · ${worstCaptain.captain_name} · ${formatDisplayNumber(worstCaptain.captain_points)} 分` : "暂无 Captain 记录"],
      ],
      sideTitle: "Captain 侧写",
      sideBullets: [
        describeCaptainStyle(captainUseCount, captainFavoriteName),
        captainUseCount ? `这一页已经会逐个去查 Captain 当天的 picks/live，所以同一个 entry_id 每次都能按真实记录生成。` : "后面可以继续补上“哪一次最值、哪一次最伤”的专属句子。",
      ],
    },
    roster: {
      lead: "这一页的完整版将来会接“持有多久、替补遗憾、冷门高光”。当前内测版先用真实的转会轨迹，去勾勒你更偏爱的那类球员与关系线。",
      rows: [
        ["持有最久", longestHold ? `${longestHold.player_name} · 共持有 ${formatDisplayNumber(longestHold.days_held)} 天` : "还没有足够的阵容快照来估算"],
        ["最常换出", favoriteOutgoing ? `${favoriteOutgoing[0]} · ${favoriteOutgoing[1]} 次` : "暂无明显倾向"],
        ["回头草", favoriteReturner ? `${favoriteReturner[0]} · ${favoriteReturner[1]} 次重新带回` : "这一季暂时没有明显回购对象"],
      ],
      badges: [
        favoriteIncoming ? `偏爱 ${favoriteIncoming[0]}` : "偏好待生成",
        longestHold ? `${longestHold.player_name} 是赛季常客` : "等待更多轨迹",
        favoriteReturner ? "会回头看旧爱" : "回头草未出现",
      ],
      sideTitle: "阵容偏好（初版）",
      sideBullets: [
        "这一页现在已经会按每个 event 的真实 picks 快照回推持有轨迹，不再只靠转会记录估算。",
        "后续补上每周 picks 缓存后，就能继续做最长持有、替补遗憾和低持有率高光。",
      ],
    },
    highlights: {
      lead: "最后一页先收集这个赛季最容易被记住的几个瞬间，让整份总结不会只剩下表格和排名。",
      cards: [
        ["赛季最高单日", bestDayRow ? formatDisplayNumber(bestDayPoints) : "-", bestDayRow ? `${toGwDayLabel(bestDayMeta?.gw, bestDayMeta?.day)} 打出来的最高单日` : "还没有足够的历史数据"],
        ["最佳单日排名", bestRankRow ? formatDisplayRank(getHistoryGameRank(bestRankRow)) : "-", bestRankRow ? `${toGwDayLabel(bestRankMeta?.gw, bestRankMeta?.day)} 打出来的最佳 game rank` : "官方若缺 rank 字段，这里会留空"],
      ],
      summary: {
        best_day: bestDayRow ? {
          label: toGwDayLabel(bestDayMeta?.gw, bestDayMeta?.day),
          date_label: formatBeijingMonthDayLabel(bestDayMeta?.deadline_time || null),
          gw: Number(bestDayMeta?.gw || 0) || null,
          day: Number(bestDayMeta?.day || 0) || null,
          event: Number(bestDayRow?.event || 0) || null,
          points: Number(bestDayPoints || 0),
          captain_enabled: captainEventSet.has(Number(bestDayRow?.event || 0)),
          lineup: highlightLineupsByEvent[Number(bestDayRow?.event || 0)] || null,
        } : null,
        best_rank: bestRankRow ? {
          label: toGwDayLabel(bestRankMeta?.gw, bestRankMeta?.day),
          date_label: formatBeijingMonthDayLabel(bestRankMeta?.deadline_time || null),
          gw: Number(bestRankMeta?.gw || 0) || null,
          day: Number(bestRankMeta?.day || 0) || null,
          event: Number(bestRankRow?.event || 0) || null,
          points: formatFantasyScore(bestRankRow?.points || 0),
          game_rank: Number(getHistoryGameRank(bestRankRow) || 0) || null,
          captain_enabled: captainEventSet.has(Number(bestRankRow?.event || 0)),
          lineup: highlightLineupsByEvent[Number(bestRankRow?.event || 0)] || null,
        } : null,
      },
      quote: bestDayRow
        ? `${toGwDayLabel(bestDayMeta?.gw, bestDayMeta?.day)} 的 ${formatDisplayNumber(bestDayPoints)} 分，会是这版赛季总结里最适合被单独打亮的一页。`
        : "等真实数据补齐后，这一页会成为整份总结最适合做动效收尾的位置。",
      sideTitle: "高光页",
      sideBullets: [
        bestRankRow ? `目前已经能抓到全季最佳单日和最佳单日 game rank 那一天。` : "最高排名这块还取决于官方历史里有没有稳定 rank 字段。",
        "这页后面最适合加轻动效和一句赛季收刀文案。",
      ],
      sideKpis: [
        ["Best Day", bestDayRow ? toGwDayLabel(bestDayMeta?.gw, bestDayMeta?.day) : "-"],
        ["Best OR", bestRankRow ? formatDisplayRank(getHistoryGameRank(bestRankRow)) : "-"],
      ],
    },
  };
}

function isTruthyQueryValue(value) {
  const text = String(value || "").trim().toLowerCase();
  return text === "1" || text === "true" || text === "yes" || text === "y";
}

function isAuthorizedRefreshRequest(url, env) {
  const auth = env?.REFRESH_TOKEN;
  if (!auth) return true;
  return url.searchParams.get("token") === auth;
}

function getSeasonSummaryCacheKey(uidInput) {
  const uidNumber = uidToNumber(uidInput);
  return uidNumber ? `${SEASON_SUMMARY_CACHE_PREFIX}${uidNumber}` : "";
}

function withSeasonSummaryCacheMeta(payload, meta = {}) {
  return {
    ...(payload || {}),
    cache_meta: {
      version: SEASON_SUMMARY_CACHE_VERSION,
      league_id: SEASON_SUMMARY_LEAGUE_ID,
      ...meta,
    },
  };
}

async function readSeasonSummaryCache(env, uidInput) {
  const key = getSeasonSummaryCacheKey(uidInput);
  if (!key) return null;
  const raw = await env.NBA_CACHE.get(key);
  if (!raw) return null;
  try {
    const cached = JSON.parse(raw);
    if (cached?.version === SEASON_SUMMARY_CACHE_VERSION && cached?.payload) {
      return withSeasonSummaryCacheMeta(cached.payload, {
        hit: true,
        key,
        generated_at: cached.generated_at || null,
      });
    }
    if (cached?.success) {
      return withSeasonSummaryCacheMeta(cached, { hit: true, key, generated_at: cached.generated_at || null });
    }
  } catch (error) {
    console.warn(`season summary cache parse failed for ${key}:`, error?.message || error);
  }
  return null;
}

async function writeSeasonSummaryCache(env, uidInput, payload) {
  const key = getSeasonSummaryCacheKey(uidInput);
  if (!key || !payload?.success) return null;
  const wrapper = {
    version: SEASON_SUMMARY_CACHE_VERSION,
    league_id: SEASON_SUMMARY_LEAGUE_ID,
    uid: String(uidToNumber(uidInput)),
    generated_at: new Date().toISOString(),
    payload,
  };
  await env.NBA_CACHE.put(key, JSON.stringify(wrapper));
  return key;
}

function extractSeasonSummaryLeagueUids(rows) {
  const seen = new Set();
  const uids = [];
  for (const row of rows || []) {
    const uid = uidToNumber(row?.entry);
    if (!uid || seen.has(uid)) continue;
    seen.add(uid);
    uids.push(String(uid));
  }
  return uids;
}

async function fetchSeasonSummaryLeagueUids() {
  const rows = await fetchAllStandings(1, SEASON_SUMMARY_LEAGUE_ID);
  return {
    rows,
    uids: extractSeasonSummaryLeagueUids(rows),
  };
}

async function buildCachedSeasonSummaryPayload(env, uidInput, options = {}) {
  const refresh = !!options?.refresh;
  if (!refresh) {
    const cached = await readSeasonSummaryCache(env, uidInput);
    if (cached) return cached;
  }

  const payload = await buildSeasonSummaryPayload(uidInput, options);
  const key = await writeSeasonSummaryCache(env, uidInput, payload);
  return withSeasonSummaryCacheMeta(payload, {
    hit: false,
    key,
    generated_at: new Date().toISOString(),
  });
}

async function buildSeasonSummaryPrewarmPayload(env, options = {}) {
  const refresh = !!options?.refresh;
  const requestedCursor = Number(options?.cursor);
  const requestedLimit = Number(options?.limit);
  const requestedConcurrency = Number(options?.concurrency);
  const { rows, uids } = await fetchSeasonSummaryLeagueUids();

  const storedCursorRaw = await env.NBA_CACHE.get(SEASON_SUMMARY_PREWARM_CURSOR_KEY);
  const storedCursor = Number(storedCursorRaw || 0);
  const cursor = Number.isFinite(requestedCursor) && requestedCursor >= 0
    ? requestedCursor
    : (Number.isFinite(storedCursor) && storedCursor >= 0 ? storedCursor : 0);
  const limit = Math.max(1, Math.min(20, Number.isFinite(requestedLimit) && requestedLimit > 0 ? requestedLimit : 8));
  const concurrency = Math.max(1, Math.min(4, Number.isFinite(requestedConcurrency) && requestedConcurrency > 0 ? requestedConcurrency : 2));
  const batch = uids.slice(cursor, cursor + limit);
  const startedAt = new Date().toISOString();

  const results = await mapLimit(batch, concurrency, async (uid) => {
    try {
      if (!refresh) {
        const cached = await readSeasonSummaryCache(env, uid);
        if (cached) {
          return { uid, status: "cached" };
        }
      }
      const payload = await buildSeasonSummaryPayload(uid, { leagueStandingsRows: rows });
      await writeSeasonSummaryCache(env, uid, payload);
      return { uid, status: "generated" };
    } catch (error) {
      return { uid, status: "error", error: String(error?.message || error || "failed") };
    }
  });

  const nextCursor = cursor + batch.length >= uids.length ? 0 : cursor + batch.length;
  const done = nextCursor === 0;
  const meta = {
    version: SEASON_SUMMARY_CACHE_VERSION,
    league_id: SEASON_SUMMARY_LEAGUE_ID,
    total_uids: uids.length,
    cursor,
    next_cursor: nextCursor,
    done,
    limit,
    concurrency,
    refresh,
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    generated_count: results.filter((item) => item?.status === "generated").length,
    cached_count: results.filter((item) => item?.status === "cached").length,
    error_count: results.filter((item) => item?.status === "error").length,
  };

  await env.NBA_CACHE.put(SEASON_SUMMARY_PREWARM_CURSOR_KEY, String(nextCursor));
  await env.NBA_CACHE.put(SEASON_SUMMARY_PREWARM_META_KEY, JSON.stringify(meta));

  return {
    success: true,
    ...meta,
    uids,
    batch,
    results,
  };
}

export default {
  async fetch(request, env, ctx) {
    try {
      if (!env?.NBA_CACHE || typeof env.NBA_CACHE.get !== "function" || typeof env.NBA_CACHE.put !== "function") {
        return jsonResponse({
          success: false,
          error: "NBA_CACHE binding missing or invalid",
          hint: "Bind NBA_CACHE in the current Pages/Worker environment.",
        }, 500);
      }

      if (request.method === "OPTIONS") return jsonResponse({ ok: true });

      const url = new URL(request.url);
      const path = url.pathname;

      if (path === "/api/refresh" && request.method === "POST") {
        const auth = env.REFRESH_TOKEN;
        if (auth) {
          const token = url.searchParams.get("token");
          if (token !== auth) return jsonResponse({ success: false, error: "unauthorized" }, 401);
        }
        const rawMode = url.searchParams.get("mode");
        const mode = String(rawMode || "meta").toLowerCase();
        let state;
        if (!rawMode || mode === "meta") {
          state = await refreshManagerMetaState(env, null, { lightweightCaptainDetails: true });
        } else if (mode === "full") {
          state = await refreshState(env, { full: true });
        } else {
          state = await refreshState(env, { full: false });
        }
        return jsonResponse({
          success: true,
          mode: !rawMode ? "default" : (mode === "full" ? "full" : (mode === "meta" ? "meta" : "chunk")),
          current_event_name: state.current_event_name,
          refresh_meta: state.refresh_meta,
        });
      }

      if (path === "/api/season-summary/prewarm") {
        if (!isAuthorizedRefreshRequest(url, env)) {
          return jsonResponse(
            { success: false, error: "unauthorized" },
            401,
            { "cache-control": "no-store, no-cache, must-revalidate, max-age=0" }
          );
        }
        try {
          return jsonResponse(
            await buildSeasonSummaryPrewarmPayload(env, {
              refresh: isTruthyQueryValue(url.searchParams.get("refresh")),
              cursor: url.searchParams.has("cursor") ? Number(url.searchParams.get("cursor")) : undefined,
              limit: url.searchParams.has("limit") ? Number(url.searchParams.get("limit")) : undefined,
              concurrency: url.searchParams.has("concurrency") ? Number(url.searchParams.get("concurrency")) : undefined,
            }),
            200,
            { "cache-control": "no-store, no-cache, must-revalidate, max-age=0" }
          );
        } catch (error) {
          return jsonResponse(
            { success: false, error: String(error?.message || error || "season summary prewarm failed") },
            500,
            { "cache-control": "no-store, no-cache, must-revalidate, max-age=0" }
          );
        }
      }

      if (path === "/api/season-summary") {
        const uid = url.searchParams.get("uid") || url.searchParams.get("entry_id");
        if (!uid) {
          return jsonResponse(
            { success: false, error: "uid is required" },
            400,
            { "cache-control": "no-store, no-cache, must-revalidate, max-age=0" }
          );
        }
        const refresh = isTruthyQueryValue(url.searchParams.get("refresh"));
        if (refresh && !isAuthorizedRefreshRequest(url, env)) {
          return jsonResponse(
            { success: false, error: "unauthorized" },
            401,
            { "cache-control": "no-store, no-cache, must-revalidate, max-age=0" }
          );
        }
        try {
          return jsonResponse(
            await buildCachedSeasonSummaryPayload(env, uid, { refresh }),
            200,
            { "cache-control": "no-store, no-cache, must-revalidate, max-age=0" }
          );
        } catch (error) {
          const message = String(error?.message || error || "season summary failed");
          const status = /not found|required/i.test(message) ? 404 : 500;
          return jsonResponse(
            { success: false, error: message },
            status,
            { "cache-control": "no-store, no-cache, must-revalidate, max-age=0" }
          );
        }
      }

      if (path === "/api/season-summary-highlight-lineup") {
        const uid = url.searchParams.get("uid") || url.searchParams.get("entry_id");
        const event = url.searchParams.get("event") || url.searchParams.get("event_id");
        const captainEnabled = url.searchParams.get("captain_enabled");
        if (!uid || !event) {
          return jsonResponse(
            { success: false, error: "uid and event are required" },
            400,
            { "cache-control": "no-store, no-cache, must-revalidate, max-age=0" }
          );
        }
        try {
          return jsonResponse(
            await buildSeasonHighlightLineupPayload(uid, event, captainEnabled),
            200,
            { "cache-control": "no-store, no-cache, must-revalidate, max-age=0" }
          );
        } catch (error) {
          const message = String(error?.message || error || "highlight lineup failed");
          const status = /not found|required/i.test(message) ? 404 : 500;
          return jsonResponse(
            { success: false, error: message },
            status,
            { "cache-control": "no-store, no-cache, must-revalidate, max-age=0" }
          );
        }
      }

      if (path === "/api/season-summary-moments") {
        const uid = url.searchParams.get("uid") || url.searchParams.get("entry_id");
        if (!uid) {
          return jsonResponse(
            { success: false, error: "uid is required" },
            400,
            { "cache-control": "no-store, no-cache, must-revalidate, max-age=0" }
          );
        }
        try {
          return jsonResponse(
            await buildSeasonSummaryMomentExtrasPayload(uid),
            200,
            { "cache-control": "no-store, no-cache, must-revalidate, max-age=0" }
          );
        } catch (error) {
          const message = String(error?.message || error || "season summary moments failed");
          const status = /not found|required/i.test(message) ? 404 : 500;
          return jsonResponse(
            { success: false, error: message },
            status,
            { "cache-control": "no-store, no-cache, must-revalidate, max-age=0" }
          );
        }
      }

      let state = await getState(env);
      if (!state) {
        state = await refreshState(env, { full: true });
      }
      state = normalizeStateChipStatus(state);

      if (path === "/api/state") {
        const useFreshH2H = url.searchParams.get("fresh_h2h") === "1";
        let responseState = state;
        if (useFreshH2H) {
          try {
            responseState = normalizeStateChipStatus(await buildFreshHomepageState(state));
          } catch (error) {
            console.error("[state-fresh-h2h-failed]", String(error?.message || error || "unknown"));
            responseState = state;
          }
        } else {
          try {
            const freshDecision = await getHomepageFreshDecision(state);
            if (freshDecision.shouldFresh) {
              responseState = normalizeStateChipStatus(await buildFreshHomepageState(state));
            }
          } catch (error) {
            console.error("[state-auto-fresh-failed]", String(error?.message || error || "unknown"));
            responseState = state;
          }
        }
        return jsonResponse(responseState);
      }
      if (path === "/api/fixtures") return jsonResponse(state.fixtures);
      if (path === "/api/h2h") return jsonResponse(state.h2h);
      if (path === "/api/injuries") {
        return jsonResponse(await getInjuriesPayload(env, {
          force: url.searchParams.get("fresh") === "1",
        }));
      }
      if (path === "/api/player-reference" || path === "/api/player-high-scores") {
        const player = url.searchParams.get("player") || "nikola-jokic";
        return jsonResponse(await getPlayerReferencePayload(env, {
          force: url.searchParams.get("fresh") === "1",
          player,
        }));
      }
      if (path === "/api/team-attack-defense") {
        return jsonResponse(await getTeamAttackDefensePayload(env, {
          force: url.searchParams.get("fresh") === "1",
        }));
      }
      if (path === "/api/player-options") {
        return jsonResponse(await fetchPlayerOptionsPayload());
      }
      if (path === "/api/h2h-standings") return jsonResponse(state.h2h_standings || []);
      if (path === "/api/classic-rankings") return jsonResponse(state.classic_rankings || []);
      if (path.startsWith("/api/fixture/")) {
        const id = Number(path.split("/").pop());
        const currentFixtureIds = new Set((state?.fixtures?.games || []).map((game) => Number(game?.id || 0)).filter(Boolean));
        const isCurrentFixture = currentFixtureIds.has(id);
        let payload = state.fixture_details[String(id)] || state.fixture_details[id] || {};
        if (isCurrentFixture) {
          const freshFixtures = await buildCurrentFixturePayload(state);
          payload = freshFixtures.fixture_details[String(id)] || freshFixtures.fixture_details[id] || payload;
        } else if (!payload || !payload.home_players) {
          const freshFixtures = await buildCurrentFixturePayload(state);
          payload = freshFixtures.fixture_details[String(id)] || freshFixtures.fixture_details[id] || {};
        }
        return jsonResponse(payload);
      }
      if (path.startsWith("/api/picks/")) {
        const uid = normalizeUid(Number(path.split("/").pop()));
        let payload = state.picks_by_uid[uid] || {};
        const forceFresh = url.searchParams.get("fresh") === "1";
        const panelOnly = url.searchParams.get("panel") === "1";
        const eventChanged = Number(payload?.current_event || 0) !== Number(state?.current_event || 0);
        const captainDetailsStale =
          Number(payload?.current_event || 0) === Number(state?.current_event || 0) &&
          !!payload?.chip_status?.captain_used &&
          (
            !payload?.captain_used?.used ||
            !payload?.captain_used?.captain_name
          );
        const panelNeedsFresh =
          panelOnly &&
          (
            forceFresh ||
            eventChanged ||
            !Array.isArray(payload?.transfer_records) ||
            captainDetailsStale
          );
        if (panelNeedsFresh) {
          payload = await buildFreshManagerPanelPayload(state, uid);
        } else if (forceFresh || eventChanged || !payload.players || payload.players.length === 0 || captainDetailsStale) {
          const freshState = await buildState(state, [uid]);
          payload = freshState.picks_by_uid[uid] || {};
        }
        debugUid("api_response", uid, {
          total_live: payload.total_live || 0,
          event_total: payload.event_total || 0,
          players: summarizePlayersForDebug(payload.players || []),
        });
        return jsonResponse(payload);
      }
      if (path === "/api/trends/transfers") {
        return jsonResponse(
          state.transfer_trends || { league: {}, global: {}, ownership_top: [], ownership_manager_count: UID_LIST.length }
        );
      }
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
              effective_average_count: 0,
            },
          }
        );
      }
      if (path === "/api/health") {
        return jsonResponse({
          status: "ok",
          last_update: state.generated_at,
          current_event: state.current_event,
          current_event_name: state.current_event_name,
          refresh_meta: state.refresh_meta || null,
        });
      }

      return jsonResponse({ error: "not found" }, 404);
    } catch (error) {
      return jsonResponse({
        success: false,
        error: String(error?.message || error || "Unknown worker error"),
      }, 500);
    }
  },

  async scheduled(event, env, ctx) {
    const scheduledAt = event?.scheduledTime || Date.now();
    const date = new Date(scheduledAt);
    const utcMinute = Number(new Intl.DateTimeFormat("en-GB", {
      timeZone: "UTC",
      minute: "2-digit",
      hour12: false,
    }).format(date));
    const bjHour = getBeijingHour(scheduledAt);

    if (utcMinute === 0) {
      ctx.waitUntil(getInjuriesPayload(env, { force: true }));
      if (bjHour === 16) {
        ctx.waitUntil(getPlayerReferencePayload(env, { force: true, player: "nikola-jokic" }));
        ctx.waitUntil(getTeamAttackDefensePayload(env, { force: true }));
      }
    }
    ctx.waitUntil((async () => {
      const refreshContext = await getCurrentRefreshWindowContext(scheduledAt);
      let state = await getState(env);
      if (!state) {
        await refreshManagerMetaState(env, null, { lightweightCaptainDetails: true });
        return;
      }
      const currentEventChanged = Number(state?.current_event || 0) !== Number(refreshContext.current_event || 0);
      if (currentEventChanged) {
        state = await refreshManagerMetaState(env, state, { lightweightCaptainDetails: true });
      }
      if (!currentEventChanged && shouldRefreshManagerMeta(state, scheduledAt)) {
        state = await refreshManagerMetaState(env, state, { lightweightCaptainDetails: true });
      }
      if (refreshContext.active) return;
      const finalizedEvent = Number(state?.refresh_meta?.live_finalized_event || 0);
      if (
        refreshContext.window?.after_end &&
        Number(refreshContext.current_event || 0) > 0 &&
        finalizedEvent !== Number(refreshContext.current_event || 0)
      ) {
        const finalState = normalizeStateChipStatus(await buildFreshHomepageState(state));
        const finalizedAt = new Date().toISOString();
        finalState.generated_at = finalizedAt;
        finalState.refresh_meta = {
          ...(state?.refresh_meta || {}),
          live_finalized_event: Number(refreshContext.current_event || 0),
          live_finalized_at: finalizedAt,
        };
        await env.NBA_CACHE.put(CACHE_KEY, JSON.stringify(finalState));
      }
    })());
  },
};
