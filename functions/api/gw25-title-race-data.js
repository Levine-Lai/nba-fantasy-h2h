const OFFICIAL_API_BASE = "https://nbafantasy.nba.com/api";
const DEFAULT_GW = 25;

const CONTENDER_CONFIG = [
  {
    uid: 2,
    name: "大吉鲁",
    display_name: "大吉鲁",
    opponent_uid: 5101,
    opponent_name: "鬼嗨",
    base_points: 52,
    color: "#ff5d4d",
  },
  {
    uid: 15,
    name: "笨笨",
    display_name: "笨笨",
    opponent_uid: 189,
    opponent_name: "凯文",
    base_points: 51,
    color: "#22d3ee",
  },
  {
    uid: 4319,
    name: "Kimi",
    display_name: "kimi",
    opponent_uid: 4224,
    opponent_name: "班班",
    base_points: 51,
    color: "#fbbf24",
  },
  {
    uid: 5095,
    name: "AI",
    display_name: "ai",
    opponent_uid: 14,
    opponent_name: "酸男",
    base_points: 51,
    color: "#86efac",
  },
];

const ALL_RELEVANT_UIDS = [...new Set([
  ...CONTENDER_CONFIG.map((item) => Number(item.uid)),
  ...CONTENDER_CONFIG.map((item) => Number(item.opponent_uid)),
])];

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=UTF-8",
      "cache-control": "no-store, no-cache, must-revalidate, max-age=0",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,OPTIONS",
      "access-control-allow-headers": "Content-Type",
    },
  });
}

async function fetchJsonOrThrow(url, init = {}, retries = 2) {
  let lastError = null;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...init,
        headers: {
          accept: "application/json",
          ...(init.headers || {}),
        },
      });
      if (!response.ok) {
        throw new Error(`request failed (${response.status}): ${url}`);
      }
      return response.json();
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 180 * (attempt + 1)));
      }
    }
  }
  throw lastError || new Error(`request failed: ${url}`);
}

async function mapWithLimit(items, limit, worker) {
  const list = Array.isArray(items) ? items : [];
  const safeLimit = Math.max(1, Number(limit || 1));
  const results = new Array(list.length);
  let cursor = 0;

  const run = async () => {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= list.length) return;
      results[index] = await worker(list[index], index);
    }
  };

  const runners = Array.from(
    { length: Math.min(safeLimit, list.length) },
    () => run()
  );
  await Promise.all(runners);
  return results;
}

function extractGwNumber(value) {
  if (value === null || value === undefined) return null;
  const text = String(value);
  const match = text.match(/(\d+)/);
  return match ? Number(match[1]) : null;
}

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

function buildEventMetaById(events) {
  const map = {};
  for (const event of events || []) {
    const eventId = Number(event?.id || 0);
    if (!eventId) continue;
    const parsed = parseEventMetaFromName(event?.name || "");
    map[eventId] = {
      event_id: eventId,
      event_name: event?.name || `Event ${eventId}`,
      gw: Number(parsed?.gw || 0) || null,
      day: Number(parsed?.day || 0) || null,
      deadline_time: event?.deadline_time || null,
      finished: !!event?.finished,
      is_current: !!event?.is_current,
    };
  }
  return map;
}

function getCurrentEvent(events) {
  const current = (events || []).find((event) => !!event?.is_current);
  if (current) return current;
  const firstUnfinished = (events || []).find((event) => !event?.finished);
  if (firstUnfinished) return firstUnfinished;
  return events?.[events.length - 1] || null;
}

function extractChipHistoryRecords(historyData) {
  if (!historyData || typeof historyData !== "object") return [];
  if (Array.isArray(historyData.chips)) return historyData.chips;
  for (const key of ["card_history", "cards", "events", "results", "history"]) {
    if (Array.isArray(historyData[key])) return historyData[key];
  }
  return [];
}

function resolveTransferGwDay(transfer, eventMetaById) {
  const eventId = Number(transfer?.event || 0);
  const eventMeta = eventMetaById?.[eventId] || {};
  const gw = Number(
    transfer?.gw ||
      transfer?.gameweek ||
      eventMeta?.gw ||
      extractGwNumber(transfer?.event) ||
      0
  ) || null;

  let day = null;
  for (const key of ["day", "game_day", "gameday"]) {
    const value = transfer?.[key];
    if (value === null || value === undefined) continue;
    const parsed = Number(value);
    if (!Number.isNaN(parsed) && parsed > 0) {
      day = parsed;
      break;
    }
  }
  if (!day) {
    day = Number(eventMeta?.day || 0) || null;
  }
  if (!day && typeof transfer?.event === "number") {
    const frac = Number(transfer.event) - Math.trunc(Number(transfer.event));
    const parsed = Math.round(frac * 10);
    if (parsed > 0) day = parsed;
  }
  if (!day && typeof transfer?.event === "string" && transfer.event.includes(".")) {
    const part = transfer.event.split(".", 2)[1];
    const match = String(part || "").match(/(\d+)/);
    if (match) day = Number(match[1]);
  }

  return {
    gw,
    day: Number(day || 0) || null,
  };
}

function buildChipDayMap(historyData, targetGw, eventMetaById) {
  const map = {};
  for (const item of extractChipHistoryRecords(historyData)) {
    const rawName = String(item?.name || "").toLowerCase();
    if (!rawName) continue;
    const eventId = Number(item?.event || 0);
    const meta = eventMetaById?.[eventId] || {};
    const gw = Number(item?.gw || item?.gameweek || meta?.gw || extractGwNumber(item?.event) || 0);
    if (gw !== Number(targetGw)) continue;
    const day = Number(meta?.day || item?.day || 0) || null;
    if (!day) continue;
    map[day] = rawName;
  }
  return map;
}

function buildTransferPenaltySummary(transfers, targetGw, eventMetaById, chipDayMap) {
  const weekTransfers = [];
  for (const transfer of transfers || []) {
    const meta = resolveTransferGwDay(transfer, eventMetaById);
    if (Number(meta?.gw || 0) !== Number(targetGw)) continue;
    weekTransfers.push({
      event: Number(transfer?.event || 0),
      day: Number(meta?.day || 0) || null,
    });
  }

  weekTransfers.sort((left, right) => (
    Number(left?.day || 0) - Number(right?.day || 0) ||
    Number(left?.event || 0) - Number(right?.event || 0)
  ));

  let nonWildcardTransferCount = 0;
  let gd1TransferCount = 0;
  for (const transfer of weekTransfers) {
    const chipName = String(chipDayMap?.[Number(transfer?.day || 0)] || "").toLowerCase();
    const isWildcard = chipName === "wildcard" || chipName === "wild_card";
    const isAllStar = chipName === "rich";
    if (isWildcard || isAllStar) continue;
    nonWildcardTransferCount += 1;
    if (Number(transfer?.day || 0) === 1) gd1TransferCount += 1;
  }

  return {
    total_transfer_count: Number(weekTransfers.length || 0),
    penalty_transfer_count: Number(nonWildcardTransferCount || 0),
    gd1_transfer_count: Number(gd1TransferCount || 0),
    penalty_score: Math.max(0, nonWildcardTransferCount - 2) * 100,
    gd1_missing_penalty: Math.max(0, gd1TransferCount - 2) * 100,
  };
}

function buildHistoryPointsByDay(historyData, targetGw, eventMetaById) {
  const pointsByDay = {};
  const transferCostByDay = {};
  const pointsByEvent = {};
  const transferCostByEvent = {};

  for (const row of historyData?.current || []) {
    if (!row || typeof row !== "object") continue;
    const eventId = Number(row?.event || 0);
    if (!eventId) continue;
    const meta = eventMetaById?.[eventId];
    if (!meta || Number(meta?.gw || 0) !== Number(targetGw)) continue;

    const day = Number(meta?.day || 0) || 1;
    const points = Number(row?.points || 0) / 10;
    const transferCost = Number(row?.event_transfers_cost || 0) / 10;

    pointsByDay[day] = Number(pointsByDay[day] || 0) + points;
    transferCostByDay[day] = Number(transferCostByDay[day] || 0) + transferCost;
    pointsByEvent[eventId] = Number(pointsByEvent[eventId] || 0) + points;
    transferCostByEvent[eventId] = Number(transferCostByEvent[eventId] || 0) + transferCost;
  }

  return {
    points_by_day: pointsByDay,
    transfer_cost_by_day: transferCostByDay,
    points_by_event: pointsByEvent,
    transfer_cost_by_event: transferCostByEvent,
  };
}

function computeWeekTotalUntilDay(day, historyByDay, gd1MissingPenalty) {
  const dayNumber = Number(day || 0);
  if (!dayNumber) return null;

  let cumulativePoints = 0;
  let cumulativeTransferCost = 0;
  for (let cursor = 1; cursor <= dayNumber; cursor += 1) {
    cumulativePoints += Number(historyByDay?.points_by_day?.[cursor] || 0);
    cumulativeTransferCost += Number(historyByDay?.transfer_cost_by_day?.[cursor] || 0);
  }

  const recordedDay1Cost = Number(historyByDay?.transfer_cost_by_day?.[1] || 0);
  const manualDay1Penalty = recordedDay1Cost > 0 ? 0 : Number(gd1MissingPenalty || 0);
  const total = cumulativePoints - cumulativeTransferCost - manualDay1Penalty;
  return Math.max(0, Math.round(total));
}

function resolveDayStatus(targetGw, currentGw, day, currentDay, currentEventFinished) {
  if (Number(targetGw) < Number(currentGw)) return "settled";
  if (Number(targetGw) > Number(currentGw)) return "future";
  if (Number(day || 0) < Number(currentDay || 0)) return "settled";
  if (Number(day || 0) === Number(currentDay || 0)) {
    return currentEventFinished ? "settled" : "live";
  }
  return "future";
}

async function fetchLiveWeekTotal(origin, uid) {
  const requestPath = `/api/picks/${encodeURIComponent(String(uid))}?fresh=1&panel=1&_=${Date.now()}`;
  const localUrl = `${origin}${requestPath}`;
  try {
    const payload = await fetchJsonOrThrow(localUrl);
    const eventTotal = Number(payload?.event_total);
    return Number.isFinite(eventTotal) ? eventTotal : null;
  } catch (error) {
    return null;
  }
}

export async function onRequest(context) {
  if (context.request.method === "OPTIONS") {
    return jsonResponse({ ok: true });
  }
  if (context.request.method !== "GET") {
    return jsonResponse({ success: false, error: "method not allowed" }, 405);
  }

  try {
    const requestUrl = new URL(context.request.url);
    const targetGw = Number(requestUrl.searchParams.get("gw") || DEFAULT_GW) || DEFAULT_GW;

    const bootstrap = await fetchJsonOrThrow(`${OFFICIAL_API_BASE}/bootstrap-static/`);
    const events = Array.isArray(bootstrap?.events) ? bootstrap.events : [];
    const eventMetaById = buildEventMetaById(events);
    const currentEvent = getCurrentEvent(events);
    const currentEventMeta = eventMetaById?.[Number(currentEvent?.id || 0)] || null;
    const currentGw = Number(currentEventMeta?.gw || extractGwNumber(currentEvent?.name) || 0) || targetGw;
    const currentDay = Number(currentEventMeta?.day || 0) || 1;
    const currentEventFinished = !!currentEventMeta?.finished;

    const targetDays = events
      .map((event) => {
        const meta = eventMetaById?.[Number(event?.id || 0)] || null;
        if (!meta) return null;
        if (Number(meta?.gw || 0) !== Number(targetGw)) return null;
        return {
          day: Number(meta?.day || 0) || null,
          day_label: meta?.day ? `Day ${meta.day}` : "Day ?",
          event_id: Number(meta?.event_id || 0) || null,
          event_name: meta?.event_name || "",
          deadline_time: meta?.deadline_time || null,
          finished: !!meta?.finished,
        };
      })
      .filter((item) => !!item?.day && !!item?.event_id)
      .sort((left, right) => Number(left?.day || 0) - Number(right?.day || 0));

    const dayFixtureInfoMap = {};
    for (const dayMeta of targetDays) {
      try {
        const fixtures = await fetchJsonOrThrow(`${OFFICIAL_API_BASE}/fixtures/?event=${dayMeta.event_id}`);
        const games = Array.isArray(fixtures) ? fixtures : [];
        dayFixtureInfoMap[dayMeta.day] = {
          games_count: games.length,
          finished_games_count: games.filter((game) => !!game?.finished).length,
        };
      } catch (error) {
        dayFixtureInfoMap[dayMeta.day] = {
          games_count: 0,
          finished_games_count: 0,
          fetch_error: String(error?.message || error || "fixtures fetch failed"),
        };
      }
    }

    const uidPayloads = {};
    const fetchWarnings = [];
    await mapWithLimit(ALL_RELEVANT_UIDS, 3, async (uid) => {
      try {
        const [historyData, transfersData] = await Promise.all([
          fetchJsonOrThrow(`${OFFICIAL_API_BASE}/entry/${uid}/history/`, {}, 3),
          fetchJsonOrThrow(`${OFFICIAL_API_BASE}/entry/${uid}/transfers/`, {}, 3),
        ]);

        const chipDayMap = buildChipDayMap(historyData, targetGw, eventMetaById);
        const transferPenalty = buildTransferPenaltySummary(
          transfersData,
          targetGw,
          eventMetaById,
          chipDayMap
        );
        const historyByDay = buildHistoryPointsByDay(historyData, targetGw, eventMetaById);
        uidPayloads[uid] = {
          history_by_day: historyByDay,
          transfer_penalty: transferPenalty,
        };
      } catch (error) {
        uidPayloads[uid] = {
          history_by_day: {
            points_by_day: {},
            transfer_cost_by_day: {},
            points_by_event: {},
            transfer_cost_by_event: {},
          },
          transfer_penalty: {
            total_transfer_count: 0,
            penalty_transfer_count: 0,
            gd1_transfer_count: 0,
            penalty_score: 0,
            gd1_missing_penalty: 0,
          },
        };
        fetchWarnings.push(`uid ${uid} fetch failed: ${String(error?.message || error)}`);
      }
    });

    const needsLiveOverlay = Number(targetGw) === Number(currentGw) && !currentEventFinished;
    const liveWeekTotalByUid = {};
    if (needsLiveOverlay) {
      await Promise.all(
        ALL_RELEVANT_UIDS.map(async (uid) => {
          liveWeekTotalByUid[uid] = await fetchLiveWeekTotal(requestUrl.origin, uid);
        })
      );
    }

    const dayStatusList = targetDays.map((dayMeta) => {
      const status = resolveDayStatus(targetGw, currentGw, dayMeta.day, currentDay, currentEventFinished);
      const fixtureInfo = dayFixtureInfoMap?.[dayMeta.day] || {};
      return {
        day: Number(dayMeta?.day || 0),
        day_label: dayMeta?.day_label || `Day ${dayMeta?.day || "?"}`,
        event_id: Number(dayMeta?.event_id || 0),
        event_name: dayMeta?.event_name || "",
        deadline_time: dayMeta?.deadline_time || null,
        status,
        finished: !!dayMeta?.finished,
        games_count: Number(fixtureInfo?.games_count || 0),
        finished_games_count: Number(fixtureInfo?.finished_games_count || 0),
      };
    });

    const weekTotalsByUid = {};
    for (const uid of ALL_RELEVANT_UIDS) {
      const payload = uidPayloads?.[uid] || {};
      const historyByDay = payload?.history_by_day || {};
      const gd1MissingPenalty = Number(payload?.transfer_penalty?.gd1_missing_penalty || 0);
      const dayTotals = {};
      for (const dayMeta of dayStatusList) {
        const day = Number(dayMeta?.day || 0);
        const status = String(dayMeta?.status || "future");
        if (status === "future") {
          dayTotals[day] = null;
          continue;
        }
        const historyTotal = computeWeekTotalUntilDay(day, historyByDay, gd1MissingPenalty);
        if (status === "live") {
          const liveRaw = liveWeekTotalByUid?.[uid];
          const liveValue = Number(liveRaw);
          dayTotals[day] = liveRaw !== null && liveRaw !== undefined && Number.isFinite(liveValue)
            ? liveValue
            : historyTotal;
          continue;
        }
        dayTotals[day] = historyTotal;
      }
      weekTotalsByUid[uid] = dayTotals;
    }

    const contenders = CONTENDER_CONFIG.map((config) => {
      const uid = Number(config?.uid || 0);
      const opponentUid = Number(config?.opponent_uid || 0);
      const series = dayStatusList.map((dayMeta) => {
        const day = Number(dayMeta?.day || 0);
        const status = String(dayMeta?.status || "future");
        const myWeekTotal = weekTotalsByUid?.[uid]?.[day];
        const opponentWeekTotal = weekTotalsByUid?.[opponentUid]?.[day];

        let result = null;
        let resultPoints = null;
        let leaguePoints = null;
        let diff = null;
        if (Number.isFinite(myWeekTotal) && Number.isFinite(opponentWeekTotal)) {
          diff = Number(myWeekTotal) - Number(opponentWeekTotal);
          if (diff > 0) {
            result = "W";
            resultPoints = 3;
          } else if (diff < 0) {
            result = "L";
            resultPoints = 0;
          } else {
            result = "D";
            resultPoints = 1;
          }
          leaguePoints = Number(config?.base_points || 0) + Number(resultPoints || 0);
        }

        return {
          day,
          day_label: dayMeta?.day_label || `Day ${day}`,
          status,
          my_week_total: Number.isFinite(myWeekTotal) ? Number(myWeekTotal) : null,
          opponent_week_total: Number.isFinite(opponentWeekTotal) ? Number(opponentWeekTotal) : null,
          diff,
          result,
          result_points: resultPoints,
          league_points: leaguePoints,
        };
      });

      const latest = [...series].reverse().find((item) => Number.isFinite(item?.league_points));
      return {
        uid,
        name: config?.name || String(uid),
        display_name: config?.display_name || config?.name || String(uid),
        opponent_uid: opponentUid,
        opponent_name: config?.opponent_name || String(opponentUid),
        base_points: Number(config?.base_points || 0),
        color: config?.color || "#999999",
        latest_league_points: Number(latest?.league_points || config?.base_points || 0),
        series,
      };
    });

    const availableDayCount = dayStatusList.filter((day) => day.status !== "future").length;
    const latestRankings = contenders
      .map((item) => ({
        uid: item.uid,
        name: item.name,
        display_name: item.display_name,
        league_points: Number(item.latest_league_points || item.base_points || 0),
      }))
      .sort((left, right) =>
        Number(right?.league_points || 0) - Number(left?.league_points || 0) ||
        String(left?.display_name || "").localeCompare(String(right?.display_name || ""))
      );

    return jsonResponse({
      success: true,
      generated_at: new Date().toISOString(),
      source: "official-api+worker-live-overlay",
      gw: targetGw,
      current: {
        event_id: Number(currentEvent?.id || 0) || null,
        event_name: currentEvent?.name || null,
        gw: currentGw,
        day: currentDay,
        event_finished: currentEventFinished,
      },
      days: dayStatusList,
      contenders,
      latest_rankings: latestRankings,
      available_day_count: Number(availableDayCount || 0),
      notes: [
        "Day 已结算数据来自官方 history.current（按 event->GW/Day 映射累加）。",
        "当前进行中的 Day 会优先叠加 /api/picks/{uid}?fresh=1 的实时 week total。",
        "若遇到官方 GD1 扣分漏算，会按 transfer 记录补扣。",
        ...fetchWarnings,
      ],
    });
  } catch (error) {
    return jsonResponse({
      success: false,
      error: String(error?.message || error || "failed to build gw25 title race data"),
    }, 500);
  }
}
