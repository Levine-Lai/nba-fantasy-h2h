var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/index.js
var BASE_URL = "https://nbafantasy.nba.com/api";
var LEAGUE_ID = 1653;
var CURRENT_PHASE = 23;
var CACHE_KEY = "latest_state";
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
var NAME_TO_UID = Object.fromEntries(Object.entries(UID_MAP).map(([k, v]) => [v, Number(k)]));
var NAME_MAP = {
  BigAsGiroud: "\u5927\u5409\u9C81",
  Acidboy: "\u9178\u7537",
  ConanJoe: "\u67EF\u5357",
  KevinXi: "\u51EF\u6587",
  Fitz: "\u6587\u53F2\u54F2",
  Francis: "\u5F17\u8001\u5927",
  Santiago: "\u6851\u8FEA",
  Kusuri: "kusuri",
  "M&M": "\u9A6C\u54E5",
  "\u5FEB\u8239\u603B\u51A0\u519B": "\u8239\u54E5",
  "\u5D07\u660E\u5EA7\u5C71\u96D5": "\u96D5\u54E5",
  "\u7B28\u7B28\u662F\u5927\u9A97\u5B50": "\u7B28\u7B28"
};
var ALL_FIXTURES = [
  [22, "AI", "\u7EAA\u5BFC"],
  [22, "\u5F17\u8001\u5927", "\u67EF\u5357"],
  [22, "\u51EF\u6587", "\u5927\u5409\u9C81"],
  [22, "Kimi", "\u9178\u7537"],
  [22, "kusuri", "\u9B3C\u55E8"],
  [22, "\u9A6C\u54E5", "\u963F\u7518"],
  [22, "Paul", "\u8001\u59DC"],
  [22, "\u6851\u8FEA", "\u7D2B\u8471\u9171"],
  [22, "\u4F0D\u5BB6\u8F89", "\u7B28\u7B28"],
  [22, "\u5821", "\u73ED\u73ED"],
  [22, "\u5C0F\u706B\u9F99", "\u6A58\u961F"],
  [22, "\u5C3C\u5F1F", "\u6587\u53F2\u54F2"],
  [22, "\u96D5\u54E5", "\u8239\u54E5"],
  [23, "\u5C3C\u5F1F", "\u96D5\u54E5"],
  [23, "\u5821", "\u6587\u53F2\u54F2"],
  [23, "Paul", "\u7B28\u7B28"],
  [23, "\u5C0F\u706B\u9F99", "\u8239\u54E5"],
  [23, "\u5F17\u8001\u5927", "\u9178\u7537"],
  [23, "kusuri", "\u8001\u59DC"],
  [23, "\u9A6C\u54E5", "\u7D2B\u8471\u9171"],
  [23, "\u4F0D\u5BB6\u8F89", "\u6A58\u961F"],
  [23, "\u5927\u5409\u9C81", "\u7EAA\u5BFC"],
  [23, "AI", "\u67EF\u5357"],
  [23, "\u6851\u8FEA", "\u73ED\u73ED"],
  [23, "Kimi", "\u963F\u7518"],
  [23, "\u9B3C\u55E8", "\u51EF\u6587"],
  [24, "\u5C3C\u5F1F", "\u5C0F\u706B\u9F99"],
  [24, "\u5821", "\u96D5\u54E5"],
  [24, "Paul", "\u6A58\u961F"],
  [24, "\u6587\u53F2\u54F2", "\u6851\u8FEA"],
  [24, "\u5F17\u8001\u5927", "\u963F\u7518"],
  [24, "kusuri", "\u7B28\u7B28"],
  [24, "\u9A6C\u54E5", "\u73ED\u73ED"],
  [24, "\u4F0D\u5BB6\u8F89", "\u8239\u54E5"],
  [24, "\u5927\u5409\u9C81", "AI"],
  [24, "Kimi", "\u7D2B\u8471\u9171"],
  [24, "\u9B3C\u55E8", "\u7EAA\u5BFC"],
  [24, "\u8001\u59DC", "\u51EF\u6587"],
  [24, "\u9178\u7537", "\u67EF\u5357"],
  [25, "\u5C3C\u5F1F", "\u4F0D\u5BB6\u8F89"],
  [25, "\u5821", "\u5C0F\u706B\u9F99"],
  [25, "\u96D5\u54E5", "\u6851\u8FEA"],
  [25, "Paul", "\u8239\u54E5"],
  [25, "\u6587\u53F2\u54F2", "\u9A6C\u54E5"],
  [25, "\u5F17\u8001\u5927", "\u7D2B\u8471\u9171"],
  [25, "kusuri", "\u6A58\u961F"],
  [25, "\u5927\u5409\u9C81", "\u9B3C\u55E8"],
  [25, "AI", "\u9178\u7537"],
  [25, "\u7B28\u7B28", "\u51EF\u6587"],
  [25, "Kimi", "\u73ED\u73ED"],
  [25, "\u7EAA\u5BFC", "\u8001\u59DC"],
  [25, "\u963F\u7518", "\u67EF\u5357"]
];
var H2H_RANK_BY_UID = {
  2: 1,
  15: 2,
  3455: 3,
  4319: 4,
  5095: 5,
  17: 6,
  10: 7,
  14: 8,
  6: 9,
  5410: 10,
  9: 11,
  189: 12,
  4224: 13,
  5101: 14,
  32: 15,
  16447: 16,
  6441: 17,
  23: 18,
  4: 19,
  11: 20,
  6412: 21,
  22761: 22,
  42: 23,
  5467: 24,
  6562: 25,
  8580: 26
};
function normalizeName(name) {
  if (name === null || name === void 0) return "";
  const text = String(name).trim();
  return NAME_MAP[text] || text;
}
__name(normalizeName, "normalizeName");
function resolveUidByName(name) {
  const normalized = normalizeName(name);
  if (!normalized) return null;
  if (NAME_TO_UID[normalized]) return NAME_TO_UID[normalized];
  const lower = normalized.toLowerCase();
  for (const [uid, displayName] of Object.entries(UID_MAP)) {
    if (String(displayName).toLowerCase() === lower) {
      return Number(uid);
    }
  }
  return null;
}
__name(resolveUidByName, "resolveUidByName");
function buildFdrHtmlFromFixtures(standingsByUid = {}, leagueRankByUid = {}) {
  const weeks = [22, 23, 24, 25];
  const byTeam = {};
  for (const [gw, team1, team2] of ALL_FIXTURES) {
    const t1 = normalizeName(team1);
    const t2 = normalizeName(team2);
    if (!byTeam[t1]) byTeam[t1] = {};
    if (!byTeam[t2]) byTeam[t2] = {};
    byTeam[t1][gw] = t2;
    byTeam[t2][gw] = t1;
  }
  const teams = Object.values(UID_MAP).filter((name) => byTeam[name]);
  const totalTeams = Math.max(1, teams.length);
  const ranked = teams.map((name) => ({
    name,
    uid: resolveUidByName(name)
  })).map((item) => ({
    ...item,
    leagueRank: Number(leagueRankByUid?.[item.uid] || totalTeams),
    h2hRank: Number(H2H_RANK_BY_UID?.[item.uid] || totalTeams)
  })).map((item) => ({
    ...item,
    combinedRank: item.leagueRank * 0.7 + item.h2hRank * 0.3
  })).sort((a, b) => a.combinedRank - b.combinedRank);
  const percentileByName = {};
  const denom = Math.max(1, ranked.length - 1);
  ranked.forEach((item, idx) => {
    percentileByName[item.name] = idx / denom;
  });
  const difficultyClass = /* @__PURE__ */ __name((opponent) => {
    const pct = percentileByName[opponent];
    if (pct === void 0) return 3;
    if (pct < 0.2) return 5;
    if (pct < 0.4) return 4;
    if (pct < 0.6) return 3;
    if (pct < 0.8) return 2;
    return 1;
  }, "difficultyClass");
  return teams.map((team) => {
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
    return {
      team,
      avg: Number(sum / Math.max(1, count)),
      html: `<tr><td class='t-name'>${team}</td>${cells.join("")}<td class='avg-col'>${avg}</td></tr>`
    };
  }).sort((a, b) => a.avg - b.avg || a.team.localeCompare(b.team)).map((row) => row.html).join("");
}
__name(buildFdrHtmlFromFixtures, "buildFdrHtmlFromFixtures");
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
function playerAvatarUrl(playerCode) {
  const code = Number(playerCode || 0);
  if (!code) return "";
  return `https://cdn.nba.com/headshots/nba/latest/260x190/${code}.png`;
}
__name(playerAvatarUrl, "playerAvatarUrl");
function topPlayerListFromIdCounter(counter, elements, limit = 10) {
  return [...counter.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([id, count]) => {
    const elem = elements?.[Number(id)] || {};
    return {
      id: Number(id),
      name: elem.name || `#${id}`,
      count,
      avatar: elem.avatar || ""
    };
  });
}
__name(topPlayerListFromIdCounter, "topPlayerListFromIdCounter");
function buildTransferTrends({
  transfersByUid,
  leagueUids,
  currentWeek,
  eventMetaById,
  elements
}) {
  const globalInCounter = /* @__PURE__ */ new Map();
  const globalOutCounter = /* @__PURE__ */ new Map();
  for (const elem of Object.values(elements)) {
    if (!elem) continue;
    const id = Number(elem.id || 0);
    if (!id) continue;
    const inCount = Number(elem.transfers_in_event || 0);
    const outCount = Number(elem.transfers_out_event || 0);
    if (inCount > 0) globalInCounter.set(id, inCount);
    if (outCount > 0) globalOutCounter.set(id, outCount);
  }
  return {
    overall: {
      top_in: topPlayerListFromIdCounter(globalInCounter, elements, 10),
      top_out: topPlayerListFromIdCounter(globalOutCounter, elements, 10)
    }
  };
}
__name(buildTransferTrends, "buildTransferTrends");
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
async function fetchJsonSafe(path, retries = 3) {
  try {
    const data = await fetchJson(path, retries);
    return { ok: true, data };
  } catch (error) {
    return { ok: false, data: null, error: String(error?.message || error || "fetch failed") };
  }
}
__name(fetchJsonSafe, "fetchJsonSafe");
function extractGwNumber(value) {
  if (value === null || value === void 0) return null;
  const text = String(value);
  const match = text.match(/(\d+)/);
  return match ? Number(match[1]) : null;
}
__name(extractGwNumber, "extractGwNumber");
function getCurrentEvent(events) {
  const current = events.find((e) => e?.is_current);
  if (current) return [current.id, current.name || `GW${current.id}`];
  const now = Date.now();
  let bestActive = null;
  for (const event of events || []) {
    if (!event || event.finished) continue;
    const deadline = Date.parse(event.deadline_time || "");
    if (Number.isNaN(deadline)) continue;
    if (now >= deadline) {
      if (!bestActive || Number(event.id || 0) > Number(bestActive.id || 0)) {
        bestActive = event;
      }
    }
  }
  if (bestActive) return [bestActive.id, bestActive.name || `GW${bestActive.id}`];
  const upcoming = (events || []).filter((e) => e && !e.finished).sort((a, b) => Number(a.id || 0) - Number(b.id || 0))[0];
  if (upcoming) return [upcoming.id, upcoming.name || `GW${upcoming.id}`];
  const last = (events || [])[events.length - 1];
  return [last?.id || 1, last?.name || "GW1"];
}
__name(getCurrentEvent, "getCurrentEvent");
function fantasyScore(stats) {
  return Math.floor(
    (stats?.points_scored || 0) * 1 + (stats?.rebounds || 0) * 1 + (stats?.assists || 0) * 2 + (stats?.steals || 0) * 3 + (stats?.blocks || 0) * 3
  );
}
__name(fantasyScore, "fantasyScore");
function parseInjuryStatus(elem) {
  if (!elem || elem.status !== "i") return null;
  const news = elem.news || "";
  const lower = news.toLowerCase();
  if (lower.includes("expected")) return lower.split("expected")[0].trim() || "OUT";
  return "OUT";
}
__name(parseInjuryStatus, "parseInjuryStatus");
function extractHistoryRecords(historyData) {
  if (!historyData || typeof historyData !== "object") return [];
  for (const key of ["history", "chips", "card_history", "cards", "events", "results"]) {
    if (Array.isArray(historyData[key])) return historyData[key];
  }
  return [];
}
__name(extractHistoryRecords, "extractHistoryRecords");
function parseEventMetaFromName(eventName) {
  const text = String(eventName || "");
  let match = text.match(/gameweek\s*(\d+)\s*-\s*day\s*(\d+)/i);
  if (match) {
    return { gw: Number(match[1]), day: Number(match[2]) };
  }
  match = text.match(/(?:GW)?(\d+)\.(\d+)/i);
  if (match) {
    return { gw: Number(match[1]), day: Number(match[2]) };
  }
  match = text.match(/(?:GW)?(\d+)[\s-]+day\s*(\d+)/i);
  if (match) {
    return { gw: Number(match[1]), day: Number(match[2]) };
  }
  return { gw: extractGwNumber(text), day: null };
}
__name(parseEventMetaFromName, "parseEventMetaFromName");
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
__name(isWildcardActiveFromHistory, "isWildcardActiveFromHistory");
function countTransfersInGw(transfers, currentGw, eventMetaById) {
  let count = 0;
  for (const t of transfers || []) {
    const { gw } = resolveTransferGwDay(t, eventMetaById);
    if (gw === currentGw) count += 1;
  }
  return count;
}
__name(countTransfersInGw, "countTransfersInGw");
function countTransfersInGd1(transfers, currentGw, eventMetaById) {
  let count = 0;
  for (const t of transfers || []) {
    const { gw, day } = resolveTransferGwDay(t, eventMetaById);
    if (gw !== currentGw) continue;
    if (day === 1) count += 1;
  }
  return count;
}
__name(countTransfersInGd1, "countTransfersInGd1");
function calculateTransferPenalty(transferCount, wildcardActive) {
  if (wildcardActive) return 0;
  return Math.max(0, transferCount - 2) * 100;
}
__name(calculateTransferPenalty, "calculateTransferPenalty");
function calculateWeekScoresFromHistory(historyData, currentWeek, currentEvent, eventMetaById) {
  const rows = Array.isArray(historyData?.current) ? historyData.current : [];
  let weeklyPoints = 0;
  let todayPoints = null;
  let hasWeekRows = false;
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
    const day = meta.day || 1;
    if (!pointsByDay[day]) pointsByDay[day] = 0;
    pointsByDay[day] += points;
  }
  return {
    has_week_rows: hasWeekRows,
    weekly_points: Math.round(weeklyPoints),
    today_points: todayPoints,
    points_by_day: pointsByDay
  };
}
__name(calculateWeekScoresFromHistory, "calculateWeekScoresFromHistory");
function getPlayerStats(elementId, liveElements, elements) {
  const live = liveElements[elementId];
  const fallback = 0;
  const stats = live?.stats || null;
  if (!stats) {
    return { points: fallback, rebounds: 0, assists: 0, steals: 0, blocks: 0, minutes: 0, fantasy: fallback };
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
function hasGameToday(elementId, liveElements) {
  const liveInfo = liveElements?.[elementId];
  if (!liveInfo || typeof liveInfo !== "object") return false;
  const stats = liveInfo?.stats || {};
  return typeof stats === "object" && Object.keys(stats).length > 0;
}
__name(hasGameToday, "hasGameToday");
function calculateEffectiveScore(picks, liveElements) {
  for (const p of picks) p.is_effective = false;
  for (const p of picks) p.has_game_today = hasGameToday(p.element_id, liveElements);
  const starters = picks.filter((p) => p.lineup_position <= 5).sort((a, b) => Number(a.lineup_position || 0) - Number(b.lineup_position || 0));
  const bench = picks.filter((p) => p.lineup_position > 5).sort((a, b) => Number(a.lineup_position || 0) - Number(b.lineup_position || 0));
  const buildEffectiveLineup = /* @__PURE__ */ __name((requiredBc, requiredFc) => {
    const effectivePlayers = [];
    const remainingBench = [...bench];
    for (let i = 0; i < 5; i += 1) {
      if (i >= starters.length) break;
      const starter = starters[i];
      if (starter.has_game_today) {
        effectivePlayers.push(starter);
      } else {
        let replacementIndex = -1;
        for (let idx = 0; idx < remainingBench.length; idx += 1) {
          if (remainingBench[idx].position_type === starter.position_type) {
            replacementIndex = idx;
            break;
          }
        }
        if (replacementIndex >= 0) {
          effectivePlayers.push(remainingBench[replacementIndex]);
          remainingBench.splice(replacementIndex, 1);
        }
      }
    }
    const bcPlayers = effectivePlayers.filter((p) => p.position_type === 1);
    const fcPlayers = effectivePlayers.filter((p) => p.position_type === 2);
    while (bcPlayers.length < requiredBc && remainingBench.length) {
      const idx = remainingBench.findIndex((p) => p.position_type === 1);
      if (idx < 0) break;
      bcPlayers.push(remainingBench[idx]);
      remainingBench.splice(idx, 1);
    }
    while (fcPlayers.length < requiredFc && remainingBench.length) {
      const idx = remainingBench.findIndex((p) => p.position_type === 2);
      if (idx < 0) break;
      fcPlayers.push(remainingBench[idx]);
      remainingBench.splice(idx, 1);
    }
    const finalLineup = bcPlayers.slice(0, requiredBc).concat(fcPlayers.slice(0, requiredFc));
    const totalScore = finalLineup.reduce(
      (sum, p) => sum + (p.has_game_today ? Number(p.final_points || 0) : 0),
      0
    );
    return [Math.floor(totalScore), finalLineup];
  }, "buildEffectiveLineup");
  const [score1, lineup1] = buildEffectiveLineup(3, 2);
  const [score2, lineup2] = buildEffectiveLineup(2, 3);
  const chosen = score1 >= score2 ? lineup1 : lineup2;
  for (const p of chosen) p.is_effective = true;
  return [Math.max(score1, score2), chosen, score1 >= score2 ? "3BC+2FC" : "2BC+3FC"];
}
__name(calculateEffectiveScore, "calculateEffectiveScore");
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
async function fetchAllStandingsRows() {
  const allRows = [];
  const seen = /* @__PURE__ */ new Set();
  const maxPages = 20;
  for (let page = 1; page <= maxPages; page += 1) {
    const pageRes = await fetchJsonSafe(
      `/leagues-classic/${LEAGUE_ID}/standings/?phase=${CURRENT_PHASE}&page_standings=${page}`,
      4
    );
    if (!pageRes.ok) break;
    const standings = pageRes.data?.standings || {};
    const rows2 = Array.isArray(standings?.results) ? standings.results : [];
    if (rows2.length === 0) break;
    let added = 0;
    for (const row of rows2) {
      const uid = Number(row?.entry || 0);
      if (!uid || seen.has(uid)) continue;
      seen.add(uid);
      allRows.push(row);
      added += 1;
    }
    if (standings?.has_next === true) continue;
    if (standings?.has_next === false) break;
    if (added === 0 || rows2.length < 50) break;
  }
  if (allRows.length > 0) return allRows;
  const fallback = await fetchJsonSafe(`/leagues-classic/${LEAGUE_ID}/standings/?phase=${CURRENT_PHASE}`, 4);
  if (!fallback.ok) return [];
  const rows = fallback.data?.standings?.results;
  return Array.isArray(rows) ? rows : [];
}
__name(fetchAllStandingsRows, "fetchAllStandingsRows");
async function buildState(previousState = null) {
  const bootstrap = await fetchJson("/bootstrap-static/");
  const events = bootstrap.events || [];
  const [currentEvent, currentEventName] = getCurrentEvent(events);
  const eventMetaById = buildEventMetaById(events);
  const currentMeta = eventMetaById[currentEvent] || parseEventMetaFromName(currentEventName);
  const currentWeek = currentMeta.gw || extractGwNumber(currentEventName) || extractGwNumber(currentEvent) || 22;
  const previousPicksByUid = previousState?.picks_by_uid || {};
  const teams = {};
  for (const t of bootstrap.teams || []) teams[t.id] = t.name;
  const elements = {};
  for (const e of bootstrap.elements || []) {
    elements[e.id] = {
      id: e.id,
      name: e.web_name || `#${e.id}`,
      team: e.team,
      position: e.element_type,
      position_name: e.element_type === 1 ? "BC" : e.element_type === 2 ? "FC" : "UNK",
      code: e.code || 0,
      photo: e.photo || "",
      avatar: playerAvatarUrl(e.code || 0),
      points_scored: e.points_scored || 0,
      total_points: e.total_points || 0,
      status: e.status || "",
      news: e.news || "",
      transfers_in_event: e.transfers_in_event || 0,
      transfers_out_event: e.transfers_out_event || 0
    };
  }
  const [liveRaw, fixturesRaw, standingsRows] = await Promise.all([
    fetchJson(`/event/${currentEvent}/live/`),
    fetchJson(`/fixtures/?event=${currentEvent}`),
    fetchAllStandingsRows()
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
    kickoff: formatKickoffBj(f.kickoff_time)
  }));
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
  const standingsByUid = {};
  const leagueRankByUid = {};
  for (const [index, row] of (standingsRows || []).entries()) {
    const uid = Number(row.entry);
    if (!UID_MAP[uid]) continue;
    leagueRankByUid[uid] = Number(row?.rank_sort || row?.rank || index + 1);
    const previous = previousPicksByUid[String(uid)] || {};
    standingsByUid[uid] = {
      total: Math.floor(Number(row.total || 0) / 10),
      today_live: Number(previous.total_live || 0),
      raw_today_live: Number(previous.raw_total_live || previous.total_live || 0),
      penalty_score: Number(previous.penalty_score || 0),
      transfer_count: Number(previous.transfer_count || 0),
      gd1_transfer_count: Number(previous.gd1_transfer_count || 0),
      gd1_missing_penalty: Number(previous.gd1_missing_penalty || 0),
      wildcard_active: !!previous.wildcard_active,
      picks: Array.isArray(previous.players) ? previous.players : []
    };
  }
  const uids = Object.keys(UID_MAP).map(Number);
  for (const uid of uids) {
    if (standingsByUid[uid]) continue;
    const previous = previousPicksByUid[String(uid)] || {};
    standingsByUid[uid] = {
      total: Number(previous.event_total || 0),
      today_live: Number(previous.total_live || 0),
      raw_today_live: Number(previous.raw_total_live || previous.total_live || 0),
      penalty_score: Number(previous.penalty_score || 0),
      transfer_count: Number(previous.transfer_count || 0),
      gd1_transfer_count: Number(previous.gd1_transfer_count || 0),
      gd1_missing_penalty: Number(previous.gd1_missing_penalty || 0),
      wildcard_active: !!previous.wildcard_active,
      picks: Array.isArray(previous.players) ? previous.players : []
    };
  }
  const transfersByUid = {};
  await mapLimit(uids, 1, async (uid) => {
    const previous = previousPicksByUid[String(uid)] || {};
    let [picksRes, transfersRes, historyRes] = await Promise.all([
      fetchJsonSafe(`/entry/${uid}/event/${currentEvent}/picks/`, 4),
      fetchJsonSafe(`/entry/${uid}/transfers/`, 4),
      fetchJsonSafe(`/entry/${uid}/history/`, 4)
    ]);
    if (!picksRes.ok) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      picksRes = await fetchJsonSafe(`/entry/${uid}/event/${currentEvent}/picks/`, 4);
    }
    if (!historyRes.ok) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      historyRes = await fetchJsonSafe(`/entry/${uid}/history/`, 4);
    }
    if (!transfersRes.ok) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      transfersRes = await fetchJsonSafe(`/entry/${uid}/transfers/`, 4);
    }
    const picksData = picksRes.ok ? picksRes.data : null;
    const transfersData = transfersRes.ok && Array.isArray(transfersRes.data) ? transfersRes.data : [];
    const historyData = historyRes.ok && typeof historyRes.data === "object" && historyRes.data ? historyRes.data : {};
    transfersByUid[uid] = transfersData;
    const canRecomputePenalty = !!transfersRes.ok && !!historyRes.ok;
    const transferCount = canRecomputePenalty ? countTransfersInGw(transfersData, currentWeek, eventMetaById) : Number(previous.transfer_count || 0);
    const gd1TransferCount = canRecomputePenalty ? countTransfersInGd1(transfersData, currentWeek, eventMetaById) : Number(previous.gd1_transfer_count || 0);
    const wildcardActive = canRecomputePenalty ? isWildcardActiveFromHistory(historyData, currentWeek, currentEvent, eventMetaById) : !!previous.wildcard_active;
    const penaltyScore = canRecomputePenalty ? calculateTransferPenalty(transferCount, wildcardActive) : Number(previous.penalty_score || 0);
    const historyWeek = calculateWeekScoresFromHistory(historyData, currentWeek, currentEvent, eventMetaById);
    standingsByUid[uid].penalty_score = penaltyScore;
    standingsByUid[uid].transfer_count = transferCount;
    standingsByUid[uid].gd1_transfer_count = gd1TransferCount;
    standingsByUid[uid].gd1_missing_penalty = 0;
    standingsByUid[uid].wildcard_active = wildcardActive;
    if (!picksData?.picks) {
      let rebuiltPicks = [];
      if (Array.isArray(previous.players) && previous.players.length > 0) {
        rebuiltPicks = previous.players.map((oldPick) => {
          const elementId = Number(oldPick?.element_id || oldPick?.element || 0);
          if (!elementId) return null;
          const elem = elements[elementId] || {};
          const stats = getPlayerStats(elementId, liveElements, elements);
          const multiplier = Number(oldPick?.multiplier || 1);
          const isCaptain = !!oldPick?.is_captain;
          const base = Number(stats?.fantasy || 0);
          return {
            element_id: elementId,
            name: elem.name || oldPick?.name || `#${elementId}`,
            position_type: Number(elem.position || oldPick?.position_type || 0),
            position_name: elem.position_name || oldPick?.position_name || "UNK",
            lineup_position: Number(oldPick?.lineup_position || oldPick?.position || 0),
            is_captain: isCaptain,
            is_vice: !!oldPick?.is_vice,
            multiplier,
            base_points: base,
            final_points: isCaptain ? base * multiplier : base,
            stats,
            injury: parseInjuryStatus(elem),
            team_id: elem.team || oldPick?.team_id || 0,
            is_effective: false
          };
        }).filter(Boolean);
      }
      let todayFallback = Number(previous.raw_total_live || previous.total_live || 0);
      let effectiveScore2 = 0;
      if (rebuiltPicks.length > 0) {
        const [rebuiltScore] = calculateEffectiveScore(rebuiltPicks, liveElements);
        effectiveScore2 = Number(rebuiltScore || 0);
        if (effectiveScore2 > 0) {
          todayFallback = effectiveScore2;
        } else if (historyWeek.today_points !== null && historyWeek.today_points > 0) {
          todayFallback = Number(historyWeek.today_points || 0);
        }
      } else if (historyWeek.today_points !== null) {
        todayFallback = Number(historyWeek.today_points || 0);
      }
      let weekRawTotal2 = 0;
      if (historyWeek.has_week_rows) {
        const historyToday = Number(historyWeek.today_points || 0);
        if (effectiveScore2 === 0 && historyToday > 0) {
          weekRawTotal2 = Number(historyWeek.weekly_points || 0);
        } else {
          weekRawTotal2 = Math.max(0, Number(historyWeek.weekly_points || 0) - historyToday + Number(todayFallback || 0));
        }
      } else {
        weekRawTotal2 = Math.max(
          0,
          Number(previous.event_total || standingsByUid[uid].total || 0) - Number(previous.raw_total_live || previous.total_live || 0) + Number(todayFallback || 0)
        );
      }
      standingsByUid[uid].picks = rebuiltPicks;
      standingsByUid[uid].raw_today_live = Number(todayFallback || 0);
      standingsByUid[uid].today_live = Number(todayFallback || 0);
      standingsByUid[uid].total = Number(weekRawTotal2 || 0);
      standingsByUid[uid].fetch_status = {
        picks_ok: !!picksRes.ok,
        history_ok: !!historyRes.ok,
        transfers_ok: !!transfersRes.ok
      };
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
        is_effective: false
      };
    });
    const [effectiveScore] = calculateEffectiveScore(picks, liveElements);
    let rawTodayLive = Number(effectiveScore || 0);
    if (rawTodayLive === 0 && historyWeek.today_points !== null && historyWeek.today_points > 0) {
      rawTodayLive = historyWeek.today_points;
    }
    const todayLive = rawTodayLive;
    let weekRawTotal = 0;
    if (historyWeek.has_week_rows) {
      const historyToday = Number(historyWeek.today_points || 0);
      if (Number(effectiveScore || 0) === 0 && historyToday > 0) {
        weekRawTotal = Number(historyWeek.weekly_points || 0);
      } else {
        weekRawTotal = Math.max(0, Number(historyWeek.weekly_points || 0) - historyToday + rawTodayLive);
      }
    } else {
      weekRawTotal = Math.max(
        0,
        Number(previous.event_total || standingsByUid[uid].total || 0) - Number(previous.raw_total_live || previous.total_live || 0) + rawTodayLive
      );
    }
    standingsByUid[uid].raw_today_live = rawTodayLive;
    standingsByUid[uid].today_live = todayLive;
    standingsByUid[uid].total = Number(weekRawTotal || 0);
    standingsByUid[uid].picks = picks;
    standingsByUid[uid].fetch_status = {
      picks_ok: true,
      history_ok: !!historyRes.ok,
      transfers_ok: !!transfersRes.ok
    };
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
    const uid1 = resolveUidByName(t1);
    const uid2 = resolveUidByName(t2);
    const s1 = standingsByUid[uid1] || { total: 0, today_live: 0 };
    const s2 = standingsByUid[uid2] || { total: 0, today_live: 0 };
    return {
      gameweek: fixtureWeek,
      t1,
      t2,
      uid1,
      uid2,
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
      wildcard2: !!s2.wildcard_active
    };
  });
  const picksByUid = {};
  for (const uid of Object.keys(UID_MAP)) {
    const uidNum = Number(uid);
    const s = standingsByUid[uidNum] || {};
    const picks = s.picks || [];
    let formation = "N/A";
    if (picks.length) {
      const [, , fmt] = calculateEffectiveScore(picks, liveElements);
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
      formation,
      current_event: currentEvent,
      current_event_name: currentEventName,
      players: picks
    };
  }
  const transferTrends = buildTransferTrends({
    transfersByUid,
    leagueUids: uids,
    currentWeek,
    eventMetaById,
    elements
  });
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
    picks_by_uid: picksByUid,
    transfer_trends: transferTrends,
    fdr_html: buildFdrHtmlFromFixtures(standingsByUid, leagueRankByUid)
  };
}
__name(buildState, "buildState");
async function refreshState(env) {
  const previous = await getState(env);
  const state = await buildState(previous);
  await env.NBA_CACHE.put(CACHE_KEY, JSON.stringify(state));
  return state;
}
__name(refreshState, "refreshState");
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
      const state2 = await refreshState(env);
      return jsonResponse({ success: true, current_event_name: state2.current_event_name });
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
      const uid = String(Number(path.split("/").pop()));
      let payload = state.picks_by_uid[uid] || {};
      if (!payload.players || payload.players.length === 0) {
        state = await refreshState(env);
        payload = state.picks_by_uid[uid] || {};
      }
      return jsonResponse(payload);
    }
    if (path === "/api/trends/transfers") return jsonResponse(state.transfer_trends || { league: {}, global: {} });
    if (path === "/api/fdr") return jsonResponse({ html: state.fdr_html || "" });
    if (path === "/api/health") {
      return jsonResponse({
        status: "ok",
        last_update: state.generated_at,
        current_event: state.current_event,
        current_event_name: state.current_event_name
      });
    }
    return jsonResponse({ error: "not found" }, 404);
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(refreshState(env));
  }
};

// ../../Node.js环境/node_global/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
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

// ../../Node.js环境/node_global/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
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

// .wrangler/tmp/bundle-QLaNr4/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// ../../Node.js环境/node_global/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
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
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-QLaNr4/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
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
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
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
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
