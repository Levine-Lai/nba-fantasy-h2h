const BASE_URL = "https://nbafantasy.nba.com/api";
const LEAGUE_ID = 1653;
const CURRENT_PHASE = 23;
const CACHE_KEY = "latest_state";
const FDR_HTML = `
<tr><td class='t-name'>尼弟</td><td><div class='box fdr-2'>文史哲</div></td><td><div class='box fdr-3'>雕哥</div></td><td><div class='box fdr-1'>小火龙</div></td><td><div class='box fdr-2'>伍家辉</div></td><td class='avg-col'>2.0</td></tr>
<tr><td class='t-name'>堡</td><td><div class='box fdr-3'>班班</div></td><td><div class='box fdr-2'>文史哲</div></td><td><div class='box fdr-3'>雕哥</div></td><td><div class='box fdr-1'>小火龙</div></td><td class='avg-col'>2.25</td></tr>
<tr><td class='t-name'>雕哥</td><td><div class='box fdr-2'>船哥</div></td><td><div class='box fdr-2'>尼弟</div></td><td><div class='box fdr-4'>堡</div></td><td><div class='box fdr-1'>桑迪</div></td><td class='avg-col'>2.25</td></tr>
<tr><td class='t-name'>Paul</td><td><div class='box fdr-1'>老姜</div></td><td><div class='box fdr-5'>笨笨</div></td><td><div class='box fdr-2'>橘队</div></td><td><div class='box fdr-2'>船哥</div></td><td class='avg-col'>2.5</td></tr>
<tr><td class='t-name'>文史哲</td><td><div class='box fdr-2'>尼弟</div></td><td><div class='box fdr-4'>堡</div></td><td><div class='box fdr-1'>桑迪</div></td><td><div class='box fdr-3'>马哥</div></td><td class='avg-col'>2.5</td></tr>
<tr><td class='t-name'>小火龙</td><td><div class='box fdr-2'>橘队</div></td><td><div class='box fdr-2'>船哥</div></td><td><div class='box fdr-2'>尼弟</div></td><td><div class='box fdr-4'>堡</div></td><td class='avg-col'>2.5</td></tr>
<tr><td class='t-name'>弗老大</td><td><div class='box fdr-1'>柯南</div></td><td><div class='box fdr-4'>酸男</div></td><td><div class='box fdr-2'>阿甘</div></td><td><div class='box fdr-4'>紫葱酱</div></td><td class='avg-col'>2.75</td></tr>
<tr><td class='t-name'>Kusuri</td><td><div class='box fdr-3'>鬼嗨</div></td><td><div class='box fdr-1'>老姜</div></td><td><div class='box fdr-5'>笨笨</div></td><td><div class='box fdr-2'>橘队</div></td><td class='avg-col'>2.75</td></tr>
<tr><td class='t-name'>马哥</td><td><div class='box fdr-2'>阿甘</div></td><td><div class='box fdr-4'>紫葱酱</div></td><td><div class='box fdr-3'>班班</div></td><td><div class='box fdr-2'>文史哲</div></td><td class='avg-col'>2.75</td></tr>
<tr><td class='t-name'>伍家辉</td><td><div class='box fdr-5'>笨笨</div></td><td><div class='box fdr-2'>橘队</div></td><td><div class='box fdr-2'>船哥</div></td><td><div class='box fdr-2'>尼弟</div></td><td class='avg-col'>2.75</td></tr>
<tr><td class='t-name'>橘队</td><td><div class='box fdr-1'>小火龙</div></td><td><div class='box fdr-2'>伍家辉</div></td><td><div class='box fdr-5'>Pau</div></td><td><div class='box fdr-3'>Kus</div></td><td class='avg-col'>2.75</td></tr>
<tr><td class='t-name'>船哥</td><td><div class='box fdr-3'>雕哥</div></td><td><div class='box fdr-1'>小火龙</div></td><td><div class='box fdr-2'>伍家辉</div></td><td><div class='box fdr-5'>Pau</div></td><td class='avg-col'>2.75</td></tr>
<tr><td class='t-name'>大吉鲁</td><td><div class='box fdr-3'>凯文</div></td><td><div class='box fdr-2'>纪导</div></td><td><div class='box fdr-4'>AI</div></td><td><div class='box fdr-3'>鬼嗨</div></td><td class='avg-col'>3.0</td></tr>
<tr><td class='t-name'>AI</td><td><div class='box fdr-2'>纪导</div></td><td><div class='box fdr-1'>柯南</div></td><td><div class='box fdr-5'>大吉鲁</div></td><td><div class='box fdr-4'>酸男</div></td><td class='avg-col'>3.0</td></tr>
<tr><td class='t-name'>桑迪</td><td><div class='box fdr-4'>紫葱酱</div></td><td><div class='box fdr-3'>班班</div></td><td><div class='box fdr-2'>文史哲</div></td><td><div class='box fdr-3'>雕哥</div></td><td class='avg-col'>3.0</td></tr>
<tr><td class='t-name'>笨笨</td><td><div class='box fdr-2'>伍家辉</div></td><td><div class='box fdr-5'>Pau</div></td><td><div class='box fdr-3'>Kus</div></td><td><div class='box fdr-3'>凯文</div></td><td class='avg-col'>3.25</td></tr>
<tr><td class='t-name'>Kimi</td><td><div class='box fdr-4'>酸男</div></td><td><div class='box fdr-2'>阿甘</div></td><td><div class='box fdr-4'>紫葱酱</div></td><td><div class='box fdr-3'>班班</div></td><td class='avg-col'>3.25</td></tr>
<tr><td class='t-name'>紫葱酱</td><td><div class='box fdr-1'>桑迪</div></td><td><div class='box fdr-3'>马哥</div></td><td><div class='box fdr-5'>Kim</div></td><td><div class='box fdr-4'>弗老大</div></td><td class='avg-col'>3.25</td></tr>
<tr><td class='t-name'>班班</td><td><div class='box fdr-4'>堡</div></td><td><div class='box fdr-1'>桑迪</div></td><td><div class='box fdr-3'>马哥</div></td><td><div class='box fdr-5'>Kim</div></td><td class='avg-col'>3.25</td></tr>
<tr><td class='t-name'>鬼嗨</td><td><div class='box fdr-3'>Kus</div></td><td><div class='box fdr-3'>凯文</div></td><td><div class='box fdr-2'>纪导</div></td><td><div class='box fdr-5'>大吉鲁</div></td><td class='avg-col'>3.25</td></tr>
<tr><td class='t-name'>纪导</td><td><div class='box fdr-4'>AI</div></td><td><div class='box fdr-5'>大吉鲁</div></td><td><div class='box fdr-3'>鬼嗨</div></td><td><div class='box fdr-1'>老姜</div></td><td class='avg-col'>3.25</td></tr>
<tr><td class='t-name'>阿甘</td><td><div class='box fdr-3'>马哥</div></td><td><div class='box fdr-5'>Kim</div></td><td><div class='box fdr-4'>弗老大</div></td><td><div class='box fdr-1'>柯南</div></td><td class='avg-col'>3.25</td></tr>
<tr><td class='t-name'>老姜</td><td><div class='box fdr-5'>Pau</div></td><td><div class='box fdr-3'>Kus</div></td><td><div class='box fdr-3'>凯文</div></td><td><div class='box fdr-2'>纪导</div></td><td class='avg-col'>3.25</td></tr>
<tr><td class='t-name'>酸男</td><td><div class='box fdr-5'>Kim</div></td><td><div class='box fdr-4'>弗老大</div></td><td><div class='box fdr-1'>柯南</div></td><td><div class='box fdr-4'>AI</div></td><td class='avg-col'>3.5</td></tr>
<tr><td class='t-name'>凯文</td><td><div class='box fdr-5'>大吉鲁</div></td><td><div class='box fdr-3'>鬼嗨</div></td><td><div class='box fdr-1'>老姜</div></td><td><div class='box fdr-5'>笨笨</div></td><td class='avg-col'>3.5</td></tr>
<tr><td class='t-name'>柯南</td><td><div class='box fdr-4'>弗老大</div></td><td><div class='box fdr-4'>AI</div></td><td><div class='box fdr-4'>酸男</div></td><td><div class='box fdr-2'>阿甘</div></td><td class='avg-col'>3.5</td></tr>
`;

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

const H2H_RANK_BY_UID = {
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
  8580: 26,
};

function normalizeName(name) {
  if (name === null || name === undefined) return "";
  const text = String(name).trim();
  return NAME_MAP[text] || text;
}

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
  const ranked = teams
    .map((name) => ({
      name,
      uid: resolveUidByName(name),
    }))
    .map((item) => ({
      ...item,
      leagueRank: Number(leagueRankByUid?.[item.uid] || totalTeams),
      h2hRank: Number(H2H_RANK_BY_UID?.[item.uid] || totalTeams),
    }))
    .map((item) => ({
      ...item,
      combinedRank: item.leagueRank * 0.7 + item.h2hRank * 0.3,
    }))
    .sort((a, b) => a.combinedRank - b.combinedRank);

  const percentileByName = {};
  const denom = Math.max(1, ranked.length - 1);
  ranked.forEach((item, idx) => {
    percentileByName[item.name] = idx / denom;
  });

  const difficultyClass = (opponent) => {
    const pct = percentileByName[opponent];
    if (pct === undefined) return 3;
    if (pct < 0.2) return 5;
    if (pct < 0.4) return 4;
    if (pct < 0.6) return 3;
    if (pct < 0.8) return 2;
    return 1;
  };

  return teams
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
      return {
        team,
        avg: Number(sum / Math.max(1, count)),
        html: `<tr><td class='t-name'>${team}</td>${cells.join("")}<td class='avg-col'>${avg}</td></tr>`,
      };
    })
    .sort((a, b) => a.avg - b.avg || a.team.localeCompare(b.team))
    .map((row) => row.html)
    .join("");
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

function playerAvatarUrl(playerCode) {
  const code = Number(playerCode || 0);
  if (!code) return "";
  return `https://cdn.nba.com/headshots/nba/latest/260x190/${code}.png`;
}

function topPlayerListFromIdCounter(counter, elements, limit = 10) {
  return [...counter.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id, count]) => {
      const elem = elements?.[Number(id)] || {};
      return {
        id: Number(id),
        name: elem.name || `#${id}`,
        count,
        avatar: elem.avatar || "",
      };
    });
}

function buildTransferTrends({
  transfersByUid,
  leagueUids,
  currentWeek,
  eventMetaById,
  elements,
}) {
  const globalInCounter = new Map();
  const globalOutCounter = new Map();
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
      top_out: topPlayerListFromIdCounter(globalOutCounter, elements, 10),
    },
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
    fantasy: fantasyScore(stats),
  };
}

function hasGameToday(elementId, liveElements) {
  const liveInfo = liveElements?.[elementId];
  if (!liveInfo || typeof liveInfo !== "object") return false;
  const stats = liveInfo?.stats || {};
  return typeof stats === "object" && Object.keys(stats).length > 0;
}

function calculateEffectiveScore(picks, liveElements) {
  for (const p of picks) p.is_effective = false;
  for (const p of picks) p.has_game_today = hasGameToday(p.element_id, liveElements);

  const starters = picks
    .filter((p) => p.lineup_position <= 5)
    .sort((a, b) => Number(a.lineup_position || 0) - Number(b.lineup_position || 0));
  const bench = picks
    .filter((p) => p.lineup_position > 5)
    .sort((a, b) => Number(a.lineup_position || 0) - Number(b.lineup_position || 0));

  const buildEffectiveLineup = (requiredBc, requiredFc) => {
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
  };

  const [score1, lineup1] = buildEffectiveLineup(3, 2);
  const [score2, lineup2] = buildEffectiveLineup(2, 3);
  const chosen = score1 >= score2 ? lineup1 : lineup2;
  for (const p of chosen) p.is_effective = true;
  return [Math.max(score1, score2), chosen, score1 >= score2 ? "3BC+2FC" : "2BC+3FC"];
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

async function fetchAllStandingsRows() {
  const allRows = [];
  const seen = new Set();
  const maxPages = 20;

  for (let page = 1; page <= maxPages; page += 1) {
    const pageRes = await fetchJsonSafe(
      `/leagues-classic/${LEAGUE_ID}/standings/?phase=${CURRENT_PHASE}&page_standings=${page}`,
      4
    );
    if (!pageRes.ok) break;

    const standings = pageRes.data?.standings || {};
    const rows = Array.isArray(standings?.results) ? standings.results : [];
    if (rows.length === 0) break;

    let added = 0;
    for (const row of rows) {
      const uid = Number(row?.entry || 0);
      if (!uid || seen.has(uid)) continue;
      seen.add(uid);
      allRows.push(row);
      added += 1;
    }

    if (standings?.has_next === true) continue;
    if (standings?.has_next === false) break;
    if (added === 0 || rows.length < 50) break;
  }

  if (allRows.length > 0) return allRows;

  const fallback = await fetchJsonSafe(`/leagues-classic/${LEAGUE_ID}/standings/?phase=${CURRENT_PHASE}`, 4);
  if (!fallback.ok) return [];
  const rows = fallback.data?.standings?.results;
  return Array.isArray(rows) ? rows : [];
}

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
      transfers_out_event: e.transfers_out_event || 0,
    };
  }

  const [liveRaw, fixturesRaw, standingsRows] = await Promise.all([
    fetchJson(`/event/${currentEvent}/live/`),
    fetchJson(`/fixtures/?event=${currentEvent}`),
    fetchAllStandingsRows(),
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
      picks: Array.isArray(previous.players) ? previous.players : [],
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
      picks: Array.isArray(previous.players) ? previous.players : [],
    };
  }
  const transfersByUid = {};
  await mapLimit(uids, 1, async (uid) => {
    const previous = previousPicksByUid[String(uid)] || {};

    let [picksRes, transfersRes, historyRes] = await Promise.all([
      fetchJsonSafe(`/entry/${uid}/event/${currentEvent}/picks/`, 4),
      fetchJsonSafe(`/entry/${uid}/transfers/`, 4),
      fetchJsonSafe(`/entry/${uid}/history/`, 4),
    ]);

    // Retry once for failed endpoints to reduce random empty states.
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

    if (!picksData?.picks) {
      let rebuiltPicks = [];
      if (Array.isArray(previous.players) && previous.players.length > 0) {
        rebuiltPicks = previous.players
          .map((oldPick) => {
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
              is_effective: false,
            };
          })
          .filter(Boolean);
      }

      let todayFallback = Number(previous.raw_total_live || previous.total_live || 0);
      if (rebuiltPicks.length > 0) {
        const [rebuiltScore] = calculateEffectiveScore(rebuiltPicks, liveElements);
        todayFallback = Number(rebuiltScore || 0);
      } else if (historyWeek.today_points !== null) {
        todayFallback = Number(historyWeek.today_points || 0);
      }

      let weekRawTotal = 0;
      if (historyWeek.has_week_rows) {
        const historyToday = Number(historyWeek.today_points || 0);
        weekRawTotal = Math.max(0, Number(historyWeek.weekly_points || 0) - historyToday + Number(todayFallback || 0));
      } else {
        weekRawTotal = Math.max(
          0,
          Number(previous.event_total || standingsByUid[uid].total || 0) - Number(previous.raw_total_live || previous.total_live || 0) + Number(todayFallback || 0)
        );
      }

      standingsByUid[uid].picks = rebuiltPicks;
      standingsByUid[uid].raw_today_live = Number(todayFallback || 0);
      standingsByUid[uid].today_live = Number(todayFallback || 0);
      standingsByUid[uid].total = Number(weekRawTotal || 0);
      standingsByUid[uid].fetch_status = {
        picks_ok: !!picksRes.ok,
        history_ok: !!historyRes.ok,
        transfers_ok: !!transfersRes.ok,
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
        is_effective: false,
      };
    });

    const [effectiveScore] = calculateEffectiveScore(picks, liveElements);
    const rawTodayLive = Number(effectiveScore || 0);
    const todayLive = rawTodayLive;

    let weekRawTotal = 0;
    if (historyWeek.has_week_rows) {
      const historyToday = Number(historyWeek.today_points || 0);
      weekRawTotal = Math.max(0, Number(historyWeek.weekly_points || 0) - historyToday + rawTodayLive);
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
      transfers_ok: !!transfersRes.ok,
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
    fdr_html: buildFdrHtmlFromFixtures(standingsByUid, leagueRankByUid),
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
        current_event_name: state.current_event_name,
      });
    }

    return jsonResponse({ error: "not found" }, 404);
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(refreshState(env));
  },
};

