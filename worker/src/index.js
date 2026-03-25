const BASE_URL = "https://nbafantasy.nba.com/api";
const LEAGUE_ID = 1653;
const CURRENT_PHASE = 23;
const CACHE_KEY = "latest_state";
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
const DEBUG_UIDS = new Set(["5095", "6412", "8580", "16447", "5467", "5410", "6441", "6562", "22761", "5101", "4319"]);
const FDR_TOTAL_WEIGHT = 0.7;
const FDR_H2H_WEIGHT = 0.3;
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

const NAME_TO_UID = Object.fromEntries(Object.entries(UID_MAP).map(([k, v]) => [v, Number(k)]));

const NAME_MAP = {
  BigAsGiroud: "大吉鲁",
  Acidboy: "酸男",
  ConanJoe: "柯南",
  KevinXi: "凯文",
  Fitz: "文史哲",
  Francis: "弗老大",
  Santiago: "桑迪",
  Kusuri: "kusuri",
  "M&M": "马哥",
  "快船总冠军": "船哥",
  "崇明座山雕": "雕哥",
  "笨笨是大骗子": "笨笨",
};

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
      event_total: Number(standing?.total || 0),
      players: Array.isArray(players) ? players : [],
    };
  }

  return migrated;
}

const ALL_FIXTURES = [
  [22, "AI", "纪导"],
  [22, "弗老大", "柯南"],
  [22, "凯文", "大吉鲁"],
  [22, "Kimi", "酸男"],
  [22, "kusuri", "鬼嗨"],
  [22, "马哥", "阿甘"],
  [22, "Paul", "老姜"],
  [22, "桑迪", "紫葱酱"],
  [22, "伍家辉", "笨笨"],
  [22, "堡", "班班"],
  [22, "小火龙", "橘队"],
  [22, "尼弟", "文史哲"],
  [22, "雕哥", "船哥"],
  [23, "尼弟", "雕哥"],
  [23, "堡", "文史哲"],
  [23, "Paul", "笨笨"],
  [23, "小火龙", "船哥"],
  [23, "弗老大", "酸男"],
  [23, "kusuri", "老姜"],
  [23, "马哥", "紫葱酱"],
  [23, "伍家辉", "橘队"],
  [23, "大吉鲁", "纪导"],
  [23, "AI", "柯南"],
  [23, "桑迪", "班班"],
  [23, "Kimi", "阿甘"],
  [23, "鬼嗨", "凯文"],
  [24, "尼弟", "小火龙"],
  [24, "堡", "雕哥"],
  [24, "Paul", "橘队"],
  [24, "文史哲", "桑迪"],
  [24, "弗老大", "阿甘"],
  [24, "kusuri", "笨笨"],
  [24, "马哥", "班班"],
  [24, "伍家辉", "船哥"],
  [24, "大吉鲁", "AI"],
  [24, "Kimi", "紫葱酱"],
  [24, "鬼嗨", "纪导"],
  [24, "老姜", "凯文"],
  [24, "酸男", "柯南"],
  [25, "尼弟", "伍家辉"],
  [25, "堡", "小火龙"],
  [25, "雕哥", "桑迪"],
  [25, "Paul", "船哥"],
  [25, "文史哲", "马哥"],
  [25, "弗老大", "紫葱酱"],
  [25, "kusuri", "橘队"],
  [25, "大吉鲁", "鬼嗨"],
  [25, "AI", "酸男"],
  [25, "笨笨", "凯文"],
  [25, "Kimi", "班班"],
  [25, "纪导", "老姜"],
  [25, "阿甘", "柯南"],
];

function normalizeName(name) {
  if (name === null || name === undefined) return "";
  const text = String(name).trim();
  return NAME_MAP[text] || text;
}

function resolveUidByName(name) {
  const normalized = normalizeName(name);
  if (!normalized) return null;
  if (NAME_TO_UID[normalized] !== undefined) return Number(NAME_TO_UID[normalized]);

  const lower = normalized.toLowerCase();
  for (const [uid, displayName] of Object.entries(UID_MAP)) {
    if (String(displayName).toLowerCase() === lower) {
      return Number(uid);
    }
  }
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
  const byTeam = {};
  for (const [gw, team1, team2] of ALL_FIXTURES) {
    const t1 = normalizeName(team1);
    const t2 = normalizeName(team2);
    if (!byTeam[t1]) byTeam[t1] = {};
    if (!byTeam[t2]) byTeam[t2] = {};
    byTeam[t1][gw] = t2;
    byTeam[t2][gw] = t1;
  }

  const teams = UID_LIST.map((uid) => UID_MAP[uidToNumber(uid)]).filter((name) => byTeam[name]);
  const rankedByTotal = UID_LIST
    .filter((uid) => byTeam[UID_MAP[uidToNumber(uid)]])
    .map((uid) => ({
      uid,
      name: UID_MAP[uidToNumber(uid)],
      overall_total: Number(getMapValueByUid(standingsByUid, uid)?.overall_total || 0),
    }))
    .sort((a, b) => b.overall_total - a.overall_total);

  const totalStrengthByUid = {};
  const totalDenom = Math.max(1, rankedByTotal.length - 1);
  rankedByTotal.forEach((item, idx) => {
    totalStrengthByUid[item.uid] = 1 - idx / totalDenom;
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

  const difficultyClass = (opponent) => {
    const opponentUid = normalizeUid(resolveUidByName(opponent));
    if (!opponentUid) return 3;

    const totalStrength = totalStrengthByUid[opponentUid] ?? 0.5;
    const h2hStrength = h2hStrengthByUid[opponentUid] ?? totalStrength;
    const weightedStrength = totalStrength * FDR_TOTAL_WEIGHT + h2hStrength * FDR_H2H_WEIGHT;

    if (weightedStrength < 0.2) return 1;
    if (weightedStrength < 0.4) return 2;
    if (weightedStrength < 0.6) return 3;
    if (weightedStrength < 0.8) return 4;
    return 5;
  };

  const html = teams
    .map((team) => {
      let sum = 0;
      let count = 0;
      const cells = weeks.map((gw) => {
        const opponent = byTeam[team][gw] || "-";
        const cls = opponent === "-" ? 3 : difficultyClass(opponent);
        sum += cls;
        count += 1;
        return `<td><div class='box fdr-${cls}'>${opponent}</div></td>`;
      });
      const avg = (sum / Math.max(1, count)).toFixed(2).replace(/\.00$/, "");
      return `<tr><td class='t-name'>${team}</td>${cells.join("")}<td class='avg-col'>${avg}</td></tr>`;
    })
    .join("");

  return {
    weeks,
    html,
    uses_h2h: rankedByH2h.length > 0,
    weights: {
      total: FDR_TOTAL_WEIGHT,
      h2h: FDR_H2H_WEIGHT,
    },
  };
}

function formatKickoffBj(isoTime) {
  if (!isoTime) return "--:--";
  const dt = new Date(isoTime);
  if (Number.isNaN(dt.getTime())) return "--:--";
  
  // 只返回北京时间的小时和分钟
  return dt.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Shanghai",
  });
}

function topListFromMap(counter, limit = 10) {
  return [...counter.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}

function buildTransferTrends({
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

  const globalInCounter = new Map();
  const globalOutCounter = new Map();
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
    top_out: topListFromMap(globalOutCounter, 10),
  };

  return {
    league: {
      top_pairs: topListFromMap(pairCounter, 10),
      top_in: topListFromMap(inCounter, 10),
      top_out: topListFromMap(outCounter, 10),
      top_managers: topListFromMap(managerCounter, 10),
    },
    global,
    overall: global,
  };
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "content-type,authorization",
    },
  });
}

async function fetchJson(path, retries = 3) {
  let lastError = null;
  for (let i = 0; i <= retries; i += 1) {
    try {
      const res = await fetch(`${BASE_URL}${path}`, {
        headers: { "user-agent": "Mozilla/5.0" },
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

async function fetchJsonSafe(path, retries = 3) {
  try {
    const data = await fetchJson(path, retries);
    return { ok: true, data };
  } catch (error) {
    return { ok: false, data: null, error: String(error?.message || error || "fetch failed") };
  }
}

async function fetchAllStandings() {
  const rows = [];
  const seenEntries = new Set();

  for (let page = 1; page <= 20; page += 1) {
    const data = await fetchJsonSafe(
      `/leagues-classic/${LEAGUE_ID}/standings/?phase=${CURRENT_PHASE}&page_standings=${page}`,
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

  const fallback = await fetchJsonSafe(`/leagues-classic/${LEAGUE_ID}/standings/?phase=${CURRENT_PHASE}`, 4);
  return Array.isArray(fallback.data?.standings?.results) ? fallback.data.standings.results : [];
}

function extractGwNumber(value) {
  if (value === null || value === undefined) return null;
  const text = String(value);
  const match = text.match(/(\d+)/);
  return match ? Number(match[1]) : null;
}

function getCurrentEvent(events) {
  const current = events.find((e) => e.is_current);
  if (current) return [current.id, current.name || `GW${current.id}`];
  const firstUnfinished = events.find((e) => !e.finished);
  if (firstUnfinished) return [firstUnfinished.id, firstUnfinished.name || `GW${firstUnfinished.id}`];
  const last = events[events.length - 1];
  return [last?.id || 1, last?.name || "GW1"];
}

function fantasyScore(stats) {
  return Math.floor(
    (stats?.points_scored || 0) * 1 +
      (stats?.rebounds || 0) * 1 +
      (stats?.assists || 0) * 2 +
      (stats?.steals || 0) * 3 +
      (stats?.blocks || 0) * 3
  );
}

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

function extractHistoryRecords(historyData) {
  if (!historyData || typeof historyData !== "object") return [];
  for (const key of ["history", "chips", "card_history", "cards", "events", "results"]) {
    if (Array.isArray(historyData[key])) return historyData[key];
  }
  return [];
}

function parseEventMetaFromName(eventName) {
  const text = String(eventName || "");
  // 尝试匹配 "Gameweek 22 - Day 7" 格式
  let match = text.match(/gameweek\s*(\d+)\s*-\s*day\s*(\d+)/i);
  if (match) {
    return { gw: Number(match[1]), day: Number(match[2]) };
  }
  // 尝试匹配 "GW22.7" 或 "22.7" 格式
  match = text.match(/(?:GW)?(\d+)\.(\d+)/i);
  if (match) {
    return { gw: Number(match[1]), day: Number(match[2]) };
  }
  // 尝试匹配 "GW22 Day7" 格式（没有横线）
  match = text.match(/(?:GW)?(\d+)[\s-]+day\s*(\d+)/i);
  if (match) {
    return { gw: Number(match[1]), day: Number(match[2]) };
  }
  return { gw: extractGwNumber(text), day: null };
}

function buildEventMetaById(events) {
  const map = {};
  for (const item of events || []) {
    const id = Number(item?.id);
    if (!id) continue;
    const meta = parseEventMetaFromName(item?.name || "");
    map[id] = {
      gw: meta.gw,
      day: meta.day,
      name: item?.name || "",
    };
  }
  return map;
}

function resolveTransferGwDay(transfer, eventMetaById) {
  const eventId = Number(transfer?.event);
  const eventMeta = eventMetaById?.[eventId] || {};

  const gw =
    Number(transfer?.gw || transfer?.gameweek || eventMeta.gw || extractGwNumber(transfer?.event)) || null;

  let day = null;
  for (const key of ["day", "game_day", "gameday"]) {
    const value = transfer?.[key];
    if (value !== undefined && value !== null) {
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

function isWildcardActiveFromHistory(historyData, currentGw, currentEvent, eventMetaById) {
  for (const item of extractHistoryRecords(historyData)) {
    const name = String(item?.name || "").toLowerCase();
    if (name !== "wildcard" && name !== "wild_card") continue;
    const itemEvent = item?.event;
    const eventMeta = eventMetaById?.[Number(itemEvent)] || {};
    const itemGw = item?.gw || item?.gameweek || eventMeta.gw || extractGwNumber(itemEvent);
    if (itemGw === currentGw || itemEvent === currentEvent) return true;
  }
  return false;
}

function countTransfersInGw(transfers, currentGw, eventMetaById) {
  let count = 0;
  for (const t of transfers || []) {
    const { gw } = resolveTransferGwDay(t, eventMetaById);
    if (gw === currentGw) count += 1;
  }
  return count;
}

function countTransfersInGd1(transfers, currentGw, eventMetaById) {
  let count = 0;
  for (const t of transfers || []) {
    const { gw, day } = resolveTransferGwDay(t, eventMetaById);
    if (gw !== currentGw) continue;
    if (day === 1) count += 1;
  }
  return count;
}

function calculateTransferPenalty(transferCount, wildcardActive) {
  if (wildcardActive) return 0;
  return Math.max(0, transferCount - 2) * 100;
}

function calculateWeekScoresFromHistory(historyData, currentWeek, currentEvent, eventMetaById) {
  const rows = Array.isArray(historyData?.current) ? historyData.current : [];
  let weeklyPoints = 0;
  let todayPoints = null;
  let hasWeekRows = false;
  
  // 按GW和day组织数据，用于计算每日得分
  const pointsByDay = {};

  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const eventId = Number(row.event);
    if (!eventId) continue;

    const points = Number(row.points || 0) / 10;
    if (eventId === currentEvent) {
      todayPoints = Math.round(points);
    }

    const meta = eventMetaById?.[eventId];
    if (!meta || meta.gw !== currentWeek) continue;

    hasWeekRows = true;
    weeklyPoints += points;
    
    // 按天记录得分
    const day = meta.day || 1;
    if (!pointsByDay[day]) pointsByDay[day] = 0;
    pointsByDay[day] += points;
  }

  return {
    has_week_rows: hasWeekRows,
    weekly_points: Math.round(weeklyPoints),
    today_points: todayPoints,
    points_by_day: pointsByDay,
  };
}

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
      fantasy: fallbackFantasy,
    };
  }
  return {
    points: Number(stats.points_scored || 0),
    rebounds: Number(stats.rebounds || 0),
    assists: Number(stats.assists || 0),
    steals: Number(stats.steals || 0),
    blocks: Number(stats.blocks || 0),
    minutes: Number(stats.minutes || 0),
    fantasy: fantasyScore(stats),
  };
}

function buildTeamsPlayingToday(fixtures) {
  const teamIds = new Set();
  for (const fixture of fixtures || []) {
    if (fixture?.team_h) teamIds.add(Number(fixture.team_h));
    if (fixture?.team_a) teamIds.add(Number(fixture.team_a));
  }
  return teamIds;
}

function isPlayerAvailable(pick, teamsPlayingToday) {
  if (pick.injury) return false;
  if (pick.team_id && !teamsPlayingToday.has(Number(pick.team_id))) return false;
  return true;
}

function calculateEffectiveScore(picks, teamsPlayingToday) {
  for (const p of picks) p.is_effective = false;
  const starters = picks
    .filter((p) => p.lineup_position <= 5)
    .sort((a, b) => a.lineup_position - b.lineup_position);
  const bench = picks
    .filter((p) => p.lineup_position > 5)
    .sort((a, b) => a.lineup_position - b.lineup_position);

  const selected = [];
  let bcCount = 0;
  let fcCount = 0;

  const addSelected = (pick) => {
    selected.push(pick);
    if (pick.position_type === 1) bcCount += 1;
    if (pick.position_type === 2) fcCount += 1;
  };

  const allStartersAvailable =
    starters.length === 5 && starters.every((pick) => isPlayerAvailable(pick, teamsPlayingToday));

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

async function buildState(previousState = null) {
  const bootstrap = await fetchJson("/bootstrap-static/");
  const events = bootstrap.events || [];
  const [currentEvent, currentEventName] = getCurrentEvent(events);
  const eventMetaById = buildEventMetaById(events);
  const currentMeta = eventMetaById[currentEvent] || parseEventMetaFromName(currentEventName);
  const currentWeek = currentMeta.gw || extractGwNumber(currentEventName) || extractGwNumber(currentEvent) || 22;
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
      event_points: e.event_points || 0,
      points_scored: e.points_scored || 0,
      total_points: e.total_points || 0,
      status: e.status || "",
      news: e.news || "",
      transfers_in_event: e.transfers_in_event || 0,
      transfers_out_event: e.transfers_out_event || 0,
    };
  }

  const [liveRaw, fixturesRaw, standingsRows] = await Promise.all([
    fetchJson(`/event/${currentEvent}/live/`),
    fetchJson(`/fixtures/?event=${currentEvent}`),
    fetchAllStandings(),
  ]);

  const liveElements = {};
  const rawElements = liveRaw?.elements;
  if (Array.isArray(rawElements)) {
    for (const item of rawElements) liveElements[item.id] = item;
  } else if (rawElements && typeof rawElements === "object") {
    for (const [k, v] of Object.entries(rawElements)) liveElements[Number(k)] = v;
  }

  const games = (fixturesRaw || []).map((f) => ({
    id: f.id,
    team_h: f.team_h,
    team_a: f.team_a,
    home_team: teams[f.team_h] || `Team #${f.team_h}`,
    away_team: teams[f.team_a] || `Team #${f.team_a}`,
    home_score: f.team_h_score || 0,
    away_score: f.team_a_score || 0,
    started: !!f.started,
    finished: !!f.finished,
    kickoff: formatKickoffBj(f.kickoff_time),
  }));
  const teamsPlayingToday = buildTeamsPlayingToday(games);

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
        ...getPlayerStats(elementId, liveElements, elements),
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
      away_players: awayPlayers,
    };
  }

  const standingsRowsByUid = {};
  for (const row of standingsRows || []) {
    const uid = normalizeUid(row?.entry);
    if (!uid || !UID_MAP[uidToNumber(uid)]) continue;
    standingsRowsByUid[uid] = row;
  }

  const standingsByUid = {};
  for (const uid of UID_LIST) {
    const row = standingsRowsByUid[uid] || {};
    const previous = previousPicksByUid[uid] || {};
    standingsByUid[uid] = {
      total: row.entry ? Math.floor(Number(row.total || 0) / 10) : Number(previous.event_total || 0),
      overall_total: row.entry ? Math.floor(Number(row.total || 0) / 10) : Number(previous.overall_total || previous.event_total || 0),
      today_live: Number(previous.total_live || 0),
      raw_today_live: Number(previous.raw_total_live || previous.total_live || 0),
      penalty_score: Number(previous.penalty_score || 0),
      transfer_count: Number(previous.transfer_count || 0),
      gd1_transfer_count: Number(previous.gd1_transfer_count || 0),
      gd1_missing_penalty: Number(previous.gd1_missing_penalty || 0),
      wildcard_active: !!previous.wildcard_active,
      picks: Array.isArray(previous.players) ? previous.players : [],
    };
    debugUid("base_data", uid, {
      row_total: row.entry ? Math.floor(Number(row.total || 0) / 10) : null,
      previous_event_total: Number(previous.event_total || 0),
      previous_total_live: Number(previous.total_live || 0),
      previous_players: Array.isArray(previous.players) ? previous.players.length : 0,
    });
  }

  const uids = [...UID_LIST];
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
    debugUid("fetch_status", uid, {
      picks_ok: !!picksRes.ok,
      transfers_ok: !!transfersRes.ok,
      history_ok: !!historyRes.ok,
      picks_count: Array.isArray(picksData?.picks) ? picksData.picks.length : 0,
      transfer_count_raw: transfersData.length,
      history_rows: Array.isArray(historyData?.current) ? historyData.current.length : 0,
    });
    debugUid("trend_data", uid, null);
    debugUid("avatar_data", uid, null);

    const canRecomputePenalty = !!transfersRes.ok && !!historyRes.ok;
    const transferCount = canRecomputePenalty
      ? countTransfersInGw(transfersData, currentWeek, eventMetaById)
      : Number(previous.transfer_count || 0);
    const gd1TransferCount = canRecomputePenalty
      ? countTransfersInGd1(transfersData, currentWeek, eventMetaById)
      : Number(previous.gd1_transfer_count || 0);
    const wildcardActive = canRecomputePenalty
      ? isWildcardActiveFromHistory(historyData, currentWeek, currentEvent, eventMetaById)
      : !!previous.wildcard_active;
    const penaltyScore = canRecomputePenalty
      ? calculateTransferPenalty(transferCount, wildcardActive)
      : Number(previous.penalty_score || 0);
    const historyWeek = calculateWeekScoresFromHistory(historyData, currentWeek, currentEvent, eventMetaById);

    standingsByUid[uid].penalty_score = penaltyScore;
    standingsByUid[uid].transfer_count = transferCount;
    standingsByUid[uid].gd1_transfer_count = gd1TransferCount;
    standingsByUid[uid].gd1_missing_penalty = 0;
    standingsByUid[uid].wildcard_active = wildcardActive;
    if (historyWeek.has_week_rows) {
      standingsByUid[uid].total = Math.max(0, Number(historyWeek.weekly_points || 0) - penaltyScore);
    }

    if (!picksData?.picks) {
      if (Array.isArray(previous.players) && previous.players.length > 0) {
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
      standingsByUid[uid].fetch_status = {
        picks_ok: !!picksRes.ok,
        history_ok: !!historyRes.ok,
        transfers_ok: !!transfersRes.ok,
      };
      debugUid("final_payload", uid, {
        fallback: true,
        total_live: standingsByUid[uid].today_live,
        event_total: standingsByUid[uid].total,
        players: summarizePlayersForDebug(standingsByUid[uid].picks),
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
        lineup_position: pick.position,
        is_captain: isCaptain,
        is_vice: !!pick.is_vice_captain,
        multiplier: pick.multiplier || 1,
        base_points: base,
        final_points: finalPoints,
        stats,
        injury: parseInjuryStatus(elem),
        team_id: elem.team || 0,
        is_effective: false,
      };
    });

    const [effectiveScore] = calculateEffectiveScore(picks, teamsPlayingToday);
    debugUid("merge_data", uid, {
      players: summarizePlayersForDebug(picks),
      effective_score: effectiveScore,
    });
    const previousEventTotal = Number(previous.event_total);
    const previousRawToday = Number(previous.raw_total_live ?? previous.total_live);

    let weekRawScore = null;
    if (historyWeek.has_week_rows) {
      const settledWeekPoints =
        Number(historyWeek.weekly_points || 0) -
        (historyWeek.today_points !== null ? Number(historyWeek.today_points) : 0);
      weekRawScore = Math.max(0, settledWeekPoints + effectiveScore);
    } else if (Number.isFinite(previousEventTotal)) {
      weekRawScore = Math.max(
        0,
        previousEventTotal + penaltyScore - (Number.isFinite(previousRawToday) ? previousRawToday : 0) + effectiveScore
      );
    } else {
      weekRawScore = Math.max(0, Number(standingsByUid[uid].total || 0) + penaltyScore);
    }

    const todayLive = Number(effectiveScore || 0);
    const rawTodayLive = todayLive;
    const finalWeekTotal = Math.max(0, Number(weekRawScore || 0) - penaltyScore);

    standingsByUid[uid].raw_today_live = rawTodayLive;
    standingsByUid[uid].today_live = todayLive;
    standingsByUid[uid].total = finalWeekTotal;
    standingsByUid[uid].picks = picks;
    standingsByUid[uid].fetch_status = {
      picks_ok: true,
      history_ok: !!historyRes.ok,
      transfers_ok: !!transfersRes.ok,
    };
    debugUid("final_payload", uid, {
      total_live: standingsByUid[uid].today_live,
      raw_total_live: standingsByUid[uid].raw_today_live,
      event_total: standingsByUid[uid].total,
      penalty_score: standingsByUid[uid].penalty_score,
      players: summarizePlayersForDebug(picks),
    });
  });

  const availableWeeks = [...new Set(ALL_FIXTURES.map(([gw]) => gw))].sort((a, b) => a - b);
  let fixtureWeek = currentWeek;
  if (!availableWeeks.includes(fixtureWeek)) {
    fixtureWeek = availableWeeks.filter((w) => w <= currentWeek).pop() || availableWeeks[0] || currentWeek;
  }
  const weeklyFixtures = ALL_FIXTURES.filter(([gw]) => gw === fixtureWeek);

  const h2h = weeklyFixtures.map(([gw, raw1, raw2]) => {
    const t1 = normalizeName(raw1);
    const t2 = normalizeName(raw2);
    const uid1 = normalizeUid(resolveUidByName(t1));
    const uid2 = normalizeUid(resolveUidByName(t2));
    const s1 = standingsByUid[uid1] || { total: 0, today_live: 0 };
    const s2 = standingsByUid[uid2] || { total: 0, today_live: 0 };
    return {
      gameweek: fixtureWeek,
      t1,
      t2,
      uid1: uidToNumber(uid1),
      uid2: uidToNumber(uid2),
      total1: s1.total || 0,
      total2: s2.total || 0,
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
      gd1_transfer_count: s.gd1_transfer_count || 0,
      gd1_missing_penalty: s.gd1_missing_penalty || 0,
      wildcard_active: !!s.wildcard_active,
      fetch_status: s.fetch_status || { picks_ok: true, history_ok: true, transfers_ok: true },
      event_total: s.total || 0,
      overall_total: s.overall_total || s.total || 0,
      formation,
      current_event: currentEvent,
      current_event_name: currentEventName,
      players: picks,
    };
  }

  const transferTrends = buildTransferTrends({
    transfersByUid,
    leagueUids: uids,
    currentWeek,
    eventMetaById,
    elements,
  });
  const fdr = buildFdrPayload({
    standingsByUid,
    currentWeek,
  });

  return {
    generated_at: new Date().toISOString(),
    current_event: currentEvent,
    current_event_name: currentEventName,
    fixtures: {
      event: currentEvent,
      event_name: currentEventName,
      count: games.length,
      games,
    },
    fixture_details: fixtureDetails,
    h2h,
    picks_by_uid: picksByUid,
    transfer_trends: transferTrends,
    fdr,
    fdr_html: fdr.html,
  };
}

async function refreshState(env) {
  const previous = await getState(env);
  const state = await buildState(previous);
  await env.NBA_CACHE.put(CACHE_KEY, JSON.stringify(state));
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

export default {
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
      const state = await refreshState(env);
      return jsonResponse({ success: true, current_event_name: state.current_event_name });
    }

    let state = await getState(env);
    if (!state) {
      state = await refreshState(env);
    }

    if (path === "/api/state") return jsonResponse(state);
    if (path === "/api/fixtures") return jsonResponse(state.fixtures);
    if (path === "/api/h2h") return jsonResponse(state.h2h);
    if (path.startsWith("/api/fixture/")) {
      const id = Number(path.split("/").pop());
      return jsonResponse(state.fixture_details[String(id)] || state.fixture_details[id] || {});
    }
    if (path.startsWith("/api/picks/")) {
      const uid = normalizeUid(Number(path.split("/").pop()));
      let payload = state.picks_by_uid[uid] || {};
      if (!payload.players || payload.players.length === 0) {
        state = await refreshState(env);
        payload = state.picks_by_uid[uid] || {};
      }
      debugUid("api_response", uid, {
        total_live: payload.total_live || 0,
        event_total: payload.event_total || 0,
        players: summarizePlayersForDebug(payload.players || []),
      });
      return jsonResponse(payload);
    }
    if (path === "/api/trends/transfers") return jsonResponse(state.transfer_trends || { league: {}, global: {} });
    if (path === "/api/fdr") {
      return jsonResponse(
        state.fdr || {
          weeks: [],
          html: state.fdr_html || "",
          uses_h2h: false,
          weights: { total: FDR_TOTAL_WEIGHT, h2h: FDR_H2H_WEIGHT },
        }
      );
    }
    if (path === "/api/health") {
      return jsonResponse({
        status: "ok",
        last_update: state.generated_at,
        current_event: state.current_event,
        current_event_name: state.current_event_name,
      });
    }

    return jsonResponse({ error: "not found" }, 404);
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(refreshState(env));
  },
};

