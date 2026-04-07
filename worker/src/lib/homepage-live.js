/**
 * Homepage live orchestration.
 * Keeps homepage real-time refresh logic together while hiding fetch/score details behind deps.
 */

export async function buildFreshHomepageState(baseState, deps) {
  const {
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
    ALL_FIXTURES,
    UID_MAP,
    uidToNumber,
  } = deps;

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
  const maxFixtureWeek = [...new Set((ALL_FIXTURES || []).map(([gw]) => Number(gw || 0)))].sort((a, b) => a - b).pop() || currentWeek;
  const displayWeek = isWeekResolved ? Math.min(maxFixtureWeek, Number(currentWeek || 0) + 1) : Number(currentWeek || 0);
  const availableWeeks = [...new Set((ALL_FIXTURES || []).map(([gw]) => Number(gw || 0)))].sort((a, b) => a - b);
  let fixtureWeek = displayWeek;
  if (!availableWeeks.includes(fixtureWeek)) {
    fixtureWeek = availableWeeks.filter((w) => w <= displayWeek).pop() || availableWeeks[0] || displayWeek;
  }
  const preferredTopOrder = fixtureWeek === 25
    ? ["4319-4224", "2-5101", "5095-14", "15-189"]
    : [];
  const preferredOrderMap = new Map(preferredTopOrder.map((key, index) => [key, index]));
  const weeklyFixtures = (ALL_FIXTURES || [])
    .filter(([gw]) => Number(gw || 0) === Number(fixtureWeek || 0))
    .sort((left, right) => {
      const leftKey = `${normalizeUid(left?.[1])}-${normalizeUid(left?.[2])}`;
      const rightKey = `${normalizeUid(right?.[1])}-${normalizeUid(right?.[2])}`;
      const leftRank = preferredOrderMap.has(leftKey) ? preferredOrderMap.get(leftKey) : Number.MAX_SAFE_INTEGER;
      const rightRank = preferredOrderMap.has(rightKey) ? preferredOrderMap.get(rightKey) : Number.MAX_SAFE_INTEGER;
      if (leftRank !== rightRank) return leftRank - rightRank;
      return 0;
    });
  const targetUids = [...new Set(
    weeklyFixtures.flatMap((match) => [normalizeUid(match?.[1]), normalizeUid(match?.[2])]).filter(Boolean)
  )];
  if (!targetUids.length) return baseState;
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

  const nextMatches = weeklyFixtures.map(([, rawUid1, rawUid2]) => {
    const uid1 = normalizeUid(rawUid1);
    const uid2 = normalizeUid(rawUid2);
    const match = (baseState?.h2h || []).find((item) =>
      normalizeUid(item?.uid1) === uid1 && normalizeUid(item?.uid2) === uid2
    ) || {};
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
      gameweek: fixtureWeek,
      t1: nextPicksByUid?.[uid1]?.team_name || UID_MAP?.[uidToNumber(uid1)] || uid1,
      t2: nextPicksByUid?.[uid2]?.team_name || UID_MAP?.[uidToNumber(uid2)] || uid2,
      uid1: uidToNumber(uid1),
      uid2: uidToNumber(uid2),
      team1: nextPicksByUid?.[uid1]?.team_name || UID_MAP?.[uidToNumber(uid1)] || uid1,
      team2: nextPicksByUid?.[uid2]?.team_name || UID_MAP?.[uidToNumber(uid2)] || uid2,
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
    display_week: fixtureWeek,
    last_completed_week: Math.max(22, fixtureWeek - 1),
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

export async function getHomepageFreshDecision(state, value = Date.now(), deps) {
  const { fetchJson, getCurrentEvent, getFixtureRefreshWindowInfo } = deps;
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

export async function buildCurrentFixturePayload(baseState = null, deps) {
  const {
    fetchJson,
    getCurrentEvent,
    buildElementsMap,
    buildLiveElementsMap,
    resolveFixtureStatus,
    getTeamVisualMeta,
    formatKickoffBj,
    getPlayerStats,
  } = deps;

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
