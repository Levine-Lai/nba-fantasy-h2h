import { HEADSHOT_FILE_BY_CODE } from "./headshot-manifest.js";

// Live scoring helpers are the single source of truth for effective-five scoring.
function buildLocalHeadshotUrl(playerCode) {
  const normalizedCode = String(Number(playerCode || 0) || "");
  if (!normalizedCode) return null;
  const filename = HEADSHOT_FILE_BY_CODE[normalizedCode];
  if (!filename) return null;
  return `/nba-headshots-520x380/${encodeURIComponent(filename)}`;
}

export function calculateWeekScoresFromHistory(historyData, currentWeek, currentEvent, eventMetaById) {
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
    current_event_transfer_cost: currentEventTransferCost,
  };
}

export function fantasyScore(stats) {
  return Math.floor(
    (stats?.points_scored || 0) * 1 +
      (stats?.rebounds || 0) * 1 +
      (stats?.assists || 0) * 2 +
      (stats?.steals || 0) * 3 +
      (stats?.blocks || 0) * 3
  );
}

export function parseInjuryStatus(elem) {
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

export function getPlayerStats(elementId, liveElements, elements) {
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

export function buildTeamsPlayingToday(fixtures) {
  const teamIds = new Set();
  for (const fixture of fixtures || []) {
    if (fixture?.team_h) teamIds.add(Number(fixture.team_h));
    if (fixture?.team_a) teamIds.add(Number(fixture.team_a));
  }
  return teamIds;
}

export function hasPlayerRecordedToday(pick) {
  const stats = pick?.stats || {};
  const minutes = Number(stats?.minutes || 0);
  const boxScoreSum =
    Number(stats?.points || 0) +
    Number(stats?.rebounds || 0) +
    Number(stats?.assists || 0) +
    Number(stats?.steals || 0) +
    Number(stats?.blocks || 0);
  const fantasy = Number(stats?.fantasy || pick?.base_points || pick?.final_points || 0);
  return minutes > 0 || boxScoreSum > 0 || fantasy > 0;
}

export function isPlayerAvailable(pick, teamsPlayingToday) {
  if (pick.team_id && !teamsPlayingToday.has(Number(pick.team_id))) return false;
  if (hasPlayerRecordedToday(pick)) return true;
  if (pick.injury) return false;
  return true;
}

export function calculateEffectiveScore(picks, teamsPlayingToday) {
  for (const p of picks) p.is_effective = false;
  const ordered = [...picks].sort((a, b) => Number(a.lineup_position || 0) - Number(b.lineup_position || 0));
  const available = ordered.filter((pick) => isPlayerAvailable(pick, teamsPlayingToday));

  const compareCandidates = (left, right) => {
    if (!left) return right;
    if (!right) return left;
    if (left.selected.length !== right.selected.length) {
      return left.selected.length > right.selected.length ? left : right;
    }
    const leftBalance = Math.min(left.bcCount, 2) + Math.min(left.fcCount, 2);
    const rightBalance = Math.min(right.bcCount, 2) + Math.min(right.fcCount, 2);
    if (leftBalance !== rightBalance) {
      return leftBalance > rightBalance ? left : right;
    }
    if (left.starterCount !== right.starterCount) {
      return left.starterCount > right.starterCount ? left : right;
    }
    const length = Math.min(left.positions.length, right.positions.length);
    for (let index = 0; index < length; index += 1) {
      if (left.positions[index] !== right.positions[index]) {
        return left.positions[index] < right.positions[index] ? left : right;
      }
    }
    return left;
  };

  const search = (index, selected, bcCount, fcCount, starterCount, positions) => {
    if (selected.length > 5 || bcCount > 3 || fcCount > 3) return null;
    if (index >= available.length) {
      return {
        selected: [...selected],
        bcCount,
        fcCount,
        starterCount,
        positions: [...positions],
      };
    }

    const current = available[index];
    let best = search(index + 1, selected, bcCount, fcCount, starterCount, positions);

    const nextBcCount = bcCount + (Number(current?.position_type || 0) === 1 ? 1 : 0);
    const nextFcCount = fcCount + (Number(current?.position_type || 0) === 2 ? 1 : 0);
    if (nextBcCount <= 3 && nextFcCount <= 3) {
      selected.push(current);
      positions.push(Number(current?.lineup_position || 0));
      const withCurrent = search(
        index + 1,
        selected,
        nextBcCount,
        nextFcCount,
        starterCount + (Number(current?.lineup_position || 0) <= 5 ? 1 : 0),
        positions
      );
      positions.pop();
      selected.pop();
      best = compareCandidates(withCurrent, best);
    }

    return best;
  };

  const best = search(0, [], 0, 0, 0, []) || {
    selected: [],
    bcCount: 0,
    fcCount: 0,
  };
  for (const pick of best.selected) pick.is_effective = true;
  const score = best.selected.reduce((sum, pick) => sum + Number(pick.final_points || 0), 0);
  const formation = `${Number(best.bcCount || 0)}BC+${Number(best.fcCount || 0)}FC`;
  return [Math.floor(score), best.selected, formation];
}

export function buildElementsMap(bootstrap) {
  const elements = {};
  for (const e of bootstrap?.elements || []) {
    const playerCode = Number(e.code || 0) || null;
    elements[e.id] = {
      name: e.web_name || `#${e.id}`,
      player_code: playerCode,
      headshot_url: buildLocalHeadshotUrl(playerCode),
      team: e.team,
      position: e.element_type,
      position_name: e.element_type === 1 ? "BC" : e.element_type === 2 ? "FC" : "UNK",
      now_cost: Number(e.now_cost || 0),
      selected_by_percent: Number(e.selected_by_percent || 0),
      form: Number(e.form || 0),
      points_per_game: Number(e.points_per_game || 0),
      ep_next: Number(e.ep_next || 0),
      event_points: e.event_points || 0,
      points_scored: e.points_scored || 0,
      total_points: e.total_points || 0,
      status: e.status || "",
      news: e.news || "",
    };
  }
  return elements;
}

export function buildLiveElementsMap(liveRaw) {
  const liveElements = {};
  const rawElements = liveRaw?.elements;
  if (Array.isArray(rawElements)) {
    for (const item of rawElements) liveElements[item.id] = item;
  } else if (rawElements && typeof rawElements === "object") {
    for (const [k, v] of Object.entries(rawElements)) liveElements[Number(k)] = v;
  }
  return liveElements;
}

export function buildTeamsMetaMap(bootstrap, getTeamVisualMeta) {
  const map = {};
  for (const team of bootstrap?.teams || []) {
    const teamId = Number(team?.id || 0);
    if (!teamId) continue;
    const visual = getTeamVisualMeta(team?.name || "");
    map[teamId] = {
      id: teamId,
      name: team?.name || `Team #${teamId}`,
      short_name: team?.short_name || team?.name || `#${teamId}`,
      color: visual.color,
      logo_url: visual.logo_url,
    };
  }
  return map;
}

export function buildLivePicksFromPicksData(picksData, elements, liveElements, teamsMetaById = {}) {
  return (picksData?.picks || []).map((pick) => {
    const elementId = Number(pick?.element || 0);
    const elem = elements[elementId] || {};
    const teamMeta = teamsMetaById[Number(elem.team || 0)] || {};
    const stats = getPlayerStats(elementId, liveElements, elements);
    const base = Number(stats?.fantasy || 0);
    const isCaptain = !!pick?.is_captain;
    const multiplier = Number(pick?.multiplier || 1) || 1;
    const finalPoints = isCaptain ? base * multiplier : base;
    return {
      element_id: elementId,
      name: elem.name || `#${elementId}`,
      headshot_url: elem.headshot_url || null,
      position_type: elem.position || 0,
      position_name: elem.position_name || "UNK",
      now_cost: Number(elem.now_cost || 0),
      form: Number(elem.form || 0),
      points_per_game: Number(elem.points_per_game || 0),
      ep_next: Number(elem.ep_next || 0),
      lineup_position: Number(pick?.position || 0),
      is_captain: isCaptain,
      is_vice: !!pick?.is_vice_captain,
      multiplier,
      base_points: base,
      final_points: finalPoints,
      stats,
      injury: parseInjuryStatus(elem),
      team_id: elem.team || 0,
      team_name: teamMeta?.name || "",
      team_short: teamMeta?.short_name || "",
      team_logo_url: teamMeta?.logo_url || "/nba-team-logos/_.png",
      is_effective: false,
    };
  });
}

export function rebuildLivePicksFromCachedPlayers(players, elements, liveElements, teamsMetaById = {}) {
  return (Array.isArray(players) ? players : []).map((player) => {
    const elementId = Number(player?.element_id || 0);
    const elem = elements[elementId] || {};
    const teamId = Number(elem.team || player?.team_id || 0);
    const teamMeta = teamsMetaById[teamId] || {};
    const stats = getPlayerStats(elementId, liveElements, elements);
    const base = Number(stats?.fantasy || 0);
    const isCaptain = !!player?.is_captain;
    const multiplier = Number(player?.multiplier || 1) || 1;
    const finalPoints = isCaptain ? base * multiplier : base;
    return {
      ...player,
      element_id: elementId,
      name: elem.name || player?.name || `#${elementId}`,
      headshot_url: elem.headshot_url || player?.headshot_url || null,
      position_type: elem.position || Number(player?.position_type || 0),
      position_name: elem.position_name || player?.position_name || "UNK",
      now_cost: Number(elem.now_cost || player?.now_cost || 0),
      form: Number(elem.form || player?.form || 0),
      points_per_game: Number(elem.points_per_game || player?.points_per_game || 0),
      ep_next: Number(elem.ep_next || player?.ep_next || 0),
      lineup_position: Number(player?.lineup_position || 0),
      is_captain: isCaptain,
      is_vice: !!player?.is_vice,
      multiplier,
      base_points: base,
      final_points: finalPoints,
      stats,
      injury: parseInjuryStatus(elem) || player?.injury || null,
      team_id: teamId,
      team_name: teamMeta?.name || player?.team_name || "",
      team_short: teamMeta?.short_name || player?.team_short || "",
      team_logo_url: teamMeta?.logo_url || player?.team_logo_url || "/nba-team-logos/_.png",
      is_effective: false,
    };
  });
}

export function getFormationFromEffectivePlayers(picks) {
  const effectivePlayers = (Array.isArray(picks) ? picks : []).filter((pick) => !!pick?.is_effective);
  if (!effectivePlayers.length) return "N/A";
  const bcCount = effectivePlayers.filter((pick) => Number(pick?.position_type || 0) === 1).length;
  const fcCount = effectivePlayers.filter((pick) => Number(pick?.position_type || 0) === 2).length;
  return `${bcCount}BC+${fcCount}FC`;
}

export function getBeijingDateKey(value = Date.now()) {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function getBeijingHour(value = Date.now()) {
  const date = value instanceof Date ? value : new Date(value);
  return Number(new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Shanghai",
    hour: "2-digit",
    hour12: false,
  }).format(date));
}

export function buildWeekTotalSummary(historyWeek, currentEvent, gd1MissingPenalty) {
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

  const todayTransferCost = Number(
    historyWeek.current_event_transfer_cost || historyWeek.transfer_cost_by_event?.[currentEventId] || 0
  );
  const recordedDay1Cost = Number(historyWeek.transfer_cost_by_day?.[1] || 0);
  const manualDay1Penalty = recordedDay1Cost > 0 ? 0 : Number(gd1MissingPenalty || 0);

  return {
    settled_points: Number(settledPoints || 0),
    settled_transfer_cost: Number(settledTransferCost || 0),
    current_event_transfer_cost: Number(todayTransferCost || 0),
    manual_day1_penalty: Number(manualDay1Penalty || 0),
  };
}

export function computeWeekTotalFromSummary(summary, todayScore) {
  if (!summary) return null;
  const total =
    Number(summary.settled_points || 0) +
    Number(todayScore || 0) -
    Number(summary.settled_transfer_cost || 0) -
    Number(summary.current_event_transfer_cost || 0) -
    Number(summary.manual_day1_penalty || 0);
  return Math.max(0, Math.round(total));
}
