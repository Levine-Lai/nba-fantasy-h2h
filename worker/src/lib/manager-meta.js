/**
 * Daily manager metadata orchestration.
 * Owns DDL-driven manager summaries without exposing fetch/caching details to route handlers.
 */

export function countGoodCaptainManagers(summary) {
  return (Array.isArray(summary) ? summary : []).reduce((sum, item) => (
    sum + (Array.isArray(item?.managers) ? item.managers.length : 0)
  ), 0);
}

export function shouldRefreshManagerMeta(state, value = Date.now(), deps) {
  const { hasDetailedTrendList } = deps;
  if (!state || typeof state !== "object") return true;
  if (!state?.refresh_meta?.meta_updated_at) return true;
  const currentEvent = Number(state?.current_event || 0);
  const metaEvent = Number(state?.refresh_meta?.meta_event || 0);
  if (!currentEvent || metaEvent !== currentEvent) return true;
  if (!Array.isArray(state?.chips_used_summary) || state.chips_used_summary.length === 0) return true;
  const captainChipSummary = (state.chips_used_summary || []).find((item) => String(item?.key || "") === "captain");
  const expectedCaptainManagers = Number(captainChipSummary?.used_count || 0);
  const actualCaptainManagers = countGoodCaptainManagers(state?.good_captain_summary);
  if (expectedCaptainManagers !== actualCaptainManagers) return true;
  if (!hasDetailedTrendList(state?.transfer_trends?.league?.top_in)) return true;
  if (!Array.isArray(state?.h2h) || state.h2h.length === 0) return true;
  if (!state?.picks_by_uid || typeof state.picks_by_uid !== "object") return true;
  return false;
}

export function buildChipsUsedSummary(picksByUid, deps) {
  const { UID_LIST, buildPersistedChipStatus } = deps;
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

export function buildGoodCaptainSummary(picksByUid, deps) {
  const { UID_LIST, UID_MAP, buildPersistedChipStatus, normalizeUid, uidToNumber } = deps;
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
    const key = `${day || 0}__${captainName}`;
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

export async function refreshManagerMetaState(env, existingState = null, options = {}, deps) {
  const {
    CACHE_KEY,
    UID_LIST,
    UID_MAP,
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
  } = deps;

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
      status: "鍕夊己鍥炴湰",
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
  const chipsUsedSummary = buildChipsUsedSummary(nextPicksByUid, deps);
  const goodCaptainSummary = buildGoodCaptainSummary(nextPicksByUid, deps);
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
    const uid1 = String(match?.uid1 || "");
    const uid2 = String(match?.uid2 || "");
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
