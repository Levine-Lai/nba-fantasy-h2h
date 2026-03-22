const BASE_URL = "https://nbafantasy.nba.com/api";
const LEAGUE_ID = 1653;
const CURRENT_PHASE = 23;
const CACHE_KEY = "latest_state";
const FDR_HTML = "";

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
  "笨笨是大骗子": "笨笨",
  "崇明座山雕": "雕哥",
  "M&M": "马哥",
  "快船总冠军": "船哥",
  Kusuri: "kusuri",
};

const ALL_FIXTURES = [
  [22, "AI", "Fitz"],
  [22, "Francis", "ConanJoe"],
  [22, "KevinXi", "BigAsGiroud"],
  [22, "Kimi", "Acidboy"],
  [22, "Kusuri", "鬼嗨"],
  [22, "M&M", "阿甘"],
  [22, "Paul", "老姜"],
  [22, "Santiago", "紫葱酱"],
  [22, "伍家辉", "笨笨是大骗子"],
  [22, "堡", "班班"],
  [22, "小火龙", "橘队"],
  [22, "尼弟", "文史哲"],
  [22, "崇明座山雕", "快船总冠军"],
  [23, "AI", "ConanJoe"],
  [23, "Fitz", "BigAsGiroud"],
  [23, "Francis", "Acidboy"],
  [23, "KevinXi", "鬼嗨"],
  [23, "Kimi", "阿甘"],
  [23, "Kusuri", "老姜"],
  [23, "M&M", "紫葱酱"],
  [23, "Paul", "笨笨是大骗子"],
  [23, "Santiago", "班班"],
  [23, "伍家辉", "橘队"],
  [23, "堡", "文史哲"],
  [23, "小火龙", "快船总冠军"],
  [23, "尼弟", "崇明座山雕"],
  [24, "AI", "BigAsGiroud"],
  [24, "ConanJoe", "Acidboy"],
  [24, "Fitz", "鬼嗨"],
  [24, "Francis", "阿甘"],
  [24, "KevinXi", "老姜"],
  [24, "Kimi", "紫葱酱"],
  [24, "Kusuri", "笨笨是大骗子"],
  [24, "M&M", "班班"],
  [24, "Paul", "橘队"],
  [24, "Santiago", "文史哲"],
  [24, "伍家辉", "快船总冠军"],
  [24, "堡", "崇明座山雕"],
  [24, "小火龙", "尼弟"],
  [25, "AI", "Acidboy"],
  [25, "BigAsGiroud", "鬼嗨"],
  [25, "ConanJoe", "阿甘"],
  [25, "Fitz", "老姜"],
  [25, "Francis", "紫葱酱"],
  [25, "KevinXi", "笨笨是大骗子"],
  [25, "Kimi", "班班"],
  [25, "Kusuri", "橘队"],
  [25, "M&M", "文史哲"],
  [25, "Paul", "快船总冠军"],
  [25, "Santiago", "崇明座山雕"],
  [25, "伍家辉", "尼弟"],
  [25, "堡", "小火龙"],
];

function normalizeName(name) {
  return NAME_MAP[name] || name;
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

async function fetchJson(path) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "user-agent": "Mozilla/5.0" },
  });
  if (!res.ok) throw new Error(`fetch failed ${path}: ${res.status}`);
  return res.json();
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
  if (!elem || elem.status !== "i") return null;
  const news = elem.news || "";
  const lower = news.toLowerCase();
  if (lower.includes("expected")) return lower.split("expected")[0].trim() || "OUT";
  return "OUT";
}

function extractHistoryRecords(historyData) {
  if (!historyData || typeof historyData !== "object") return [];
  for (const key of ["history", "chips", "card_history", "cards", "events", "results"]) {
    if (Array.isArray(historyData[key])) return historyData[key];
  }
  return [];
}

function isWildcardActiveFromHistory(historyData, currentEvent, currentEventName) {
  const currentGw = extractGwNumber(currentEventName) || extractGwNumber(currentEvent);
  for (const item of extractHistoryRecords(historyData)) {
    const name = String(item?.name || "").toLowerCase();
    if (name !== "wildcard" && name !== "wild_card") continue;
    const itemEvent = item?.event;
    const itemGw = item?.gw || item?.gameweek || extractGwNumber(itemEvent);
    if (itemGw === currentGw || itemEvent === currentEvent) return true;
  }
  return false;
}

function extractTransferDay(transfer) {
  for (const key of ["day", "game_day", "gameday"]) {
    const value = transfer?.[key];
    if (value !== undefined && value !== null) return Number(value);
  }
  const ev = transfer?.event;
  if (typeof ev === "number") {
    const frac = ev - Math.trunc(ev);
    const day = Math.round(frac * 10);
    return day > 0 ? day : null;
  }
  if (typeof ev === "string" && ev.includes(".")) {
    const part = ev.split(".", 2)[1];
    const m = part.match(/(\d+)/);
    return m ? Number(m[1]) : null;
  }
  return null;
}

function countTransfersInGw(transfers, currentEvent, currentEventName) {
  const currentGw = extractGwNumber(currentEventName) || extractGwNumber(currentEvent);
  let count = 0;
  for (const t of transfers || []) {
    const ev = t?.event;
    const gw = t?.gw || t?.gameweek || extractGwNumber(ev);
    if (gw === currentGw || ev === currentEvent) count += 1;
  }
  return count;
}

function countTransfersInGd1(transfers, currentEvent, currentEventName) {
  const currentGw = extractGwNumber(currentEventName) || extractGwNumber(currentEvent);
  let count = 0;
  for (const t of transfers || []) {
    const ev = t?.event;
    const gw = t?.gw || t?.gameweek || extractGwNumber(ev);
    if (gw !== currentGw && ev !== currentEvent) continue;
    if (extractTransferDay(t) === 1) count += 1;
  }
  return count;
}

function calculateTransferPenalty(transferCount, wildcardActive) {
  if (wildcardActive) return 0;
  return Math.max(0, transferCount - 2) * 100;
}

function calculateGd1MissingPenalty(transferCount, gd1TransferCount, wildcardActive) {
  if (wildcardActive) return 0;
  const nonGd1Count = Math.max(0, transferCount - gd1TransferCount);
  const correctPenalty = Math.max(0, transferCount - 2) * 100;
  const websitePenalty = Math.max(0, nonGd1Count - 2) * 100;
  return Math.max(0, correctPenalty - websitePenalty);
}

function getPlayerStats(elementId, liveElements, elements) {
  const live = liveElements[elementId];
  const elem = elements[elementId] || {};
  const fallback = Number(elem.points_scored || elem.total_points || 0);
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
    fantasy: fantasyScore(stats),
  };
}

function hasGameToday(teamId, fixtures, teams) {
  if (!teamId) return false;
  for (const f of fixtures) {
    if (f.team_h === teamId || f.team_a === teamId) return true;
    const homeId = Object.entries(teams).find(([, name]) => name === f.home_team)?.[0];
    const awayId = Object.entries(teams).find(([, name]) => name === f.away_team)?.[0];
    if (Number(homeId) === teamId || Number(awayId) === teamId) return true;
  }
  return false;
}

function isPlayerAvailable(pick, fixtures, teams) {
  if (pick.injury) return false;
  if (pick.team_id && !hasGameToday(pick.team_id, fixtures, teams)) return false;
  return true;
}

function calculateEffectiveScore(picks, fixtures, teams) {
  for (const p of picks) p.is_effective = false;
  const starters = picks.filter((p) => p.lineup_position <= 5);
  const bench = picks.filter((p) => p.lineup_position > 5);

  const availableStarters = starters.filter((p) => isPlayerAvailable(p, fixtures, teams));
  const availableBench = bench.filter((p) => isPlayerAvailable(p, fixtures, teams));

  const sortByScore = (arr, pos) =>
    arr.filter((p) => p.position_type === pos).sort((a, b) => b.final_points - a.final_points);

  const bcStarters = sortByScore(availableStarters, 1);
  const fcStarters = sortByScore(availableStarters, 2);
  const bcBench = sortByScore(availableBench, 1);
  const fcBench = sortByScore(availableBench, 2);

  const combo = (bcCount, fcCount) => [...bcStarters, ...bcBench].slice(0, bcCount).concat([...fcStarters, ...fcBench].slice(0, fcCount));

  const c1 = combo(3, 2);
  const s1 = c1.reduce((sum, p) => sum + p.final_points, 0);
  const c2 = combo(2, 3);
  const s2 = c2.reduce((sum, p) => sum + p.final_points, 0);

  const chosen = s1 >= s2 ? c1 : c2;
  for (const p of chosen) p.is_effective = true;
  return [Math.floor(Math.max(s1, s2)), chosen, s1 >= s2 ? "3BC+2FC" : "2BC+3FC"];
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

async function buildState() {
  const bootstrap = await fetchJson("/bootstrap-static/");
  const events = bootstrap.events || [];
  const [currentEvent, currentEventName] = getCurrentEvent(events);

  const teams = {};
  for (const t of bootstrap.teams || []) teams[t.id] = t.name;

  const elements = {};
  for (const e of bootstrap.elements || []) {
    elements[e.id] = {
      name: e.web_name || `#${e.id}`,
      team: e.team,
      position: e.element_type,
      position_name: e.element_type === 1 ? "BC" : e.element_type === 2 ? "FC" : "UNK",
      points_scored: e.points_scored || 0,
      total_points: e.total_points || 0,
      status: e.status || "",
      news: e.news || "",
    };
  }

  const [liveRaw, fixturesRaw, standingsRaw] = await Promise.all([
    fetchJson(`/event/${currentEvent}/live/`),
    fetchJson(`/fixtures/?event=${currentEvent}`),
    fetchJson(`/leagues-classic/${LEAGUE_ID}/standings/?phase=${CURRENT_PHASE}`),
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
    kickoff: f.kickoff_time ? String(f.kickoff_time).slice(11, 16) : "--:--",
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

  const standingsByUid = {};
  for (const row of standingsRaw?.standings?.results || []) {
    const uid = Number(row.entry);
    if (!UID_MAP[uid]) continue;
    standingsByUid[uid] = {
      total: Math.floor(Number(row.total || 0) / 10),
      today_live: 0,
      raw_today_live: 0,
      penalty_score: 0,
      transfer_count: 0,
      gd1_transfer_count: 0,
      gd1_missing_penalty: 0,
      wildcard_active: false,
      picks: [],
    };
  }

  const uids = Object.keys(standingsByUid).map(Number);
  await mapLimit(uids, 5, async (uid) => {
    const [picksData, transfersData, historyData] = await Promise.all([
      fetchJson(`/entry/${uid}/event/${currentEvent}/picks/`).catch(() => null),
      fetchJson(`/entry/${uid}/transfers/`).catch(() => []),
      fetchJson(`/entry/${uid}/history/`).catch(() => ({})),
    ]);
    if (!picksData?.picks) return;

    const transferCount = countTransfersInGw(transfersData, currentEvent, currentEventName);
    const gd1TransferCount = countTransfersInGd1(transfersData, currentEvent, currentEventName);
    const wildcardActive = isWildcardActiveFromHistory(historyData, currentEvent, currentEventName);
    const penaltyScore = calculateTransferPenalty(transferCount, wildcardActive);
    const gd1MissingPenalty = calculateGd1MissingPenalty(transferCount, gd1TransferCount, wildcardActive);

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

    const [effectiveScore] = calculateEffectiveScore(picks, games, teams);
    const todayLive = effectiveScore - penaltyScore;

    standingsByUid[uid].raw_today_live = effectiveScore;
    standingsByUid[uid].today_live = todayLive;
    standingsByUid[uid].penalty_score = penaltyScore;
    standingsByUid[uid].transfer_count = transferCount;
    standingsByUid[uid].gd1_transfer_count = gd1TransferCount;
    standingsByUid[uid].gd1_missing_penalty = gd1MissingPenalty;
    standingsByUid[uid].wildcard_active = wildcardActive;
    standingsByUid[uid].total = standingsByUid[uid].total - gd1MissingPenalty;
    standingsByUid[uid].picks = picks;
  });

  const currentWeek = extractGwNumber(currentEventName) || extractGwNumber(currentEvent) || 22;
  const weeklyFixtures = ALL_FIXTURES.filter(([gw]) => gw === currentWeek);
  const h2h = weeklyFixtures.map(([gw, raw1, raw2]) => {
    const t1 = normalizeName(raw1);
    const t2 = normalizeName(raw2);
    const uid1 = NAME_TO_UID[t1];
    const uid2 = NAME_TO_UID[t2];
    const s1 = standingsByUid[uid1] || { total: 0, today_live: 0 };
    const s2 = standingsByUid[uid2] || { total: 0, today_live: 0 };
    return {
      gameweek: gw,
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
      wildcard2: !!s2.wildcard_active,
    };
  });

  const picksByUid = {};
  for (const uid of Object.keys(UID_MAP)) {
    const uidNum = Number(uid);
    const s = standingsByUid[uidNum] || {};
    const picks = s.picks || [];
    let formation = "N/A";
    if (picks.length) {
      const [, , fmt] = calculateEffectiveScore(picks, games, teams);
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
      event_total: s.total || 0,
      formation,
      current_event: currentEvent,
      current_event_name: currentEventName,
      players: picks,
    };
  }

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
    fdr_html: FDR_HTML,
  };
}

async function refreshState(env) {
  const state = await buildState();
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
      const uid = String(Number(path.split("/").pop()));
      return jsonResponse(state.picks_by_uid[uid] || {});
    }
    if (path === "/api/fdr") return jsonResponse({ html: state.fdr_html || "" });
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

