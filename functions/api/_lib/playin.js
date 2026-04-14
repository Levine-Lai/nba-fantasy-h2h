import { fetchJsonUrl } from "../../../worker/src/lib/http.js";
import { PLAYIN_ROSTER_DATA } from "./playin-data.generated.js";

const PLAYIN_SCHEDULE_URL = "https://nba-prod-us-east-1-mediaops-stats.s3.amazonaws.com/NBA/staticData/scheduleLeagueV2_1.json";
const PLAYIN_BOXSCORE_URL_PREFIX = "https://nba-prod-us-east-1-mediaops-stats.s3.amazonaws.com/NBA/liveData/boxscore/boxscore_";
const REMOTE_HEADSHOT_URL_PREFIX = "https://cdn.nba.com/headshots/nba/latest/520x380/";
const CACHE_CONTROL = "no-store, no-cache, must-revalidate, max-age=0";
const TEAM_LOGO_BY_TRICODE = {
  ATL: "/nba-team-logos/hawks.png",
  BOS: "/nba-team-logos/celtics.png",
  BKN: "/nba-team-logos/nets.png",
  CHA: "/nba-team-logos/hornets.png",
  CHI: "/nba-team-logos/bulls.png",
  CLE: "/nba-team-logos/cavaliers.png",
  DAL: "/nba-team-logos/mavericks.png",
  DEN: "/nba-team-logos/nuggets.png",
  DET: "/nba-team-logos/pistons.png",
  GSW: "/nba-team-logos/warriors.png",
  HOU: "/nba-team-logos/rockets.png",
  IND: "/nba-team-logos/pacers.png",
  LAC: "/nba-team-logos/clippers.png",
  LAL: "/nba-team-logos/lakers.png",
  MEM: "/nba-team-logos/grizzlies.png",
  MIA: "/nba-team-logos/heat.png",
  MIL: "/nba-team-logos/bucks.png",
  MIN: "/nba-team-logos/timberwolves.png",
  NOP: "/nba-team-logos/pelicans.png",
  NYK: "/nba-team-logos/knicks.png",
  OKC: "/nba-team-logos/thunder.png",
  ORL: "/nba-team-logos/magic.png",
  PHI: "/nba-team-logos/sixers.png",
  PHX: "/nba-team-logos/suns.png",
  POR: "/nba-team-logos/blazers.png",
  SAC: "/nba-team-logos/kings.png",
  SAS: "/nba-team-logos/spurs.png",
  TOR: "/nba-team-logos/raptors.png",
  UTA: "/nba-team-logos/jazz.png",
  WAS: "/nba-team-logos/wizards.png",
};

function getTeamLogoUrl(team = {}) {
  const tricode = String(team?.teamTricode || team?.tricode || "").trim().toUpperCase();
  return TEAM_LOGO_BY_TRICODE[tricode] || "/nba-team-logos/_.png";
}

function formatBeijingDateTime(value = "") {
  const timestamp = Date.parse(value || "");
  if (!Number.isFinite(timestamp)) {
    return {
      dateLabel: "",
      timeLabel: "",
      fullLabel: "",
    };
  }
  const formatter = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(new Date(timestamp));
  const getValue = (type) => parts.find((item) => item.type === type)?.value || "";
  const month = getValue("month");
  const day = getValue("day");
  const hour = getValue("hour");
  const minute = getValue("minute");
  const dateLabel = month && day ? `${month}/${day}` : "";
  const timeLabel = hour && minute ? `${hour}:${minute}` : "";
  return {
    dateLabel,
    timeLabel,
    fullLabel: dateLabel && timeLabel ? `${dateLabel} ${timeLabel}` : (dateLabel || timeLabel),
  };
}

function normalizeNameKey(value = "") {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function buildNameKeys(value = "") {
  const clean = String(value || "").replace(/[.'’-]+/g, " ").trim();
  const tokens = clean.split(/\s+/).filter(Boolean);
  const keys = new Set();
  const normalized = normalizeNameKey(clean);
  if (normalized) keys.add(normalized);
  if (tokens.length) {
    const first = tokens[0];
    const trailing = tokens.slice(1).join("");
    const last = tokens[tokens.length - 1];
    if (trailing) keys.add(normalizeNameKey(`${first[0]}${trailing}`));
    if (last) keys.add(normalizeNameKey(`${first[0]}${last}`));
    if (tokens.length > 1) keys.add(normalizeNameKey(tokens.slice(1).join("")));
  }
  return [...keys].filter(Boolean);
}

function toDisplayDate(rawDate = "") {
  const match = String(rawDate || "").match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (!match) return rawDate || "";
  const month = Number(match[1]);
  const day = Number(match[2]);
  return `${month}/${day}`;
}

function parseDateParts(rawDate = "") {
  const match = String(rawDate || "").match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (!match) return null;
  return {
    month: Number(match[1]),
    day: Number(match[2]),
    year: Number(match[3]),
    isoDate: `${match[3]}-${match[1]}-${match[2]}`,
  };
}

function buildDateRangeLabel(dateStrings = []) {
  if (!dateStrings.length) return "";
  const labels = dateStrings.map(toDisplayDate);
  if (labels.length === 1) return labels[0];
  return `${labels[0]} - ${labels[labels.length - 1]}`;
}

function normalizeScheduleTeam(team = {}) {
  const city = String(team?.teamCity || "").trim();
  const name = String(team?.teamName || "").trim();
  const fullName = [city, name].filter(Boolean).join(" ").trim() || "TBD";
  return {
    teamId: team?.teamId || null,
    tricode: String(team?.teamTricode || "").trim() || null,
    slug: String(team?.teamSlug || "").trim() || null,
    shortName: name || "TBD",
    fullName,
    score: Number(team?.score || 0),
    logoUrl: getTeamLogoUrl(team),
  };
}

function normalizeScheduleGames(schedulePayload = {}) {
  const rawDates = Array.isArray(schedulePayload?.leagueSchedule?.gameDates)
    ? schedulePayload.leagueSchedule.gameDates
    : [];

  const games = rawDates.flatMap((dateEntry) => {
    const gameDate = String(dateEntry?.gameDate || "");
    const parsedDate = parseDateParts(gameDate);
    return (Array.isArray(dateEntry?.games) ? dateEntry.games : [])
      .filter((game) => /play-in tournament/i.test(String(game?.gameLabel || "")))
      .map((game) => {
        const gameDateTimeUTC = String(game?.gameDateTimeUTC || game?.gameDateTimeEst || "").trim();
        const beijing = formatBeijingDateTime(gameDateTimeUTC);
        return {
          gameId: String(game?.gameId || "").trim(),
          conference: String(game?.gameSubLabel || "").trim() || "Play-In",
          gameLabel: String(game?.gameLabel || "").trim() || "Play-In Tournament",
          gameDate,
          isoDate: parsedDate?.isoDate || "",
          displayDate: toDisplayDate(gameDate),
          gameDateTimeUTC,
          beijingDateLabel: beijing.dateLabel,
          beijingTimeLabel: beijing.timeLabel,
          beijingDateTimeLabel: beijing.fullLabel,
          gameStatus: Number(game?.gameStatus || 0),
          gameStatusText: String(game?.gameStatusText || "").trim(),
          awayTeam: normalizeScheduleTeam(game?.awayTeam),
          homeTeam: normalizeScheduleTeam(game?.homeTeam),
        };
      });
  });

  games.sort((left, right) => {
    const leftValue = Date.parse(left.gameDateTimeUTC || left.isoDate || 0);
    const rightValue = Date.parse(right.gameDateTimeUTC || right.isoDate || 0);
    return leftValue - rightValue || left.conference.localeCompare(right.conference);
  });

  const uniqueDates = [...new Set(games.map((game) => game.isoDate).filter(Boolean))];
  const finalDate = uniqueDates[uniqueDates.length - 1] || null;
  const day1Dates = uniqueDates.length > 1 ? uniqueDates.slice(0, -1) : uniqueDates;
  const day2Dates = finalDate && uniqueDates.length > 1 ? [finalDate] : [];

  for (const game of games) {
    game.bucketKey = day2Dates.includes(game.isoDate) ? "day2" : "day1";
  }

  return {
    games,
    views: {
      total: {
        key: "total",
        label: "总分",
        subtitle: "附加赛前两轮累计",
      },
      day1: {
        key: "day1",
        label: "Day 1",
        subtitle: `第一轮 · ${buildDateRangeLabel(day1Dates.map((value) => value.replace(/-/g, "/").slice(5).replace("/", "/")))}`,
        dates: day1Dates,
      },
      day2: {
        key: "day2",
        label: "Day 2",
        subtitle: `第二轮 · ${buildDateRangeLabel(day2Dates.map((value) => value.replace(/-/g, "/").slice(5).replace("/", "/")))}`,
        dates: day2Dates,
      },
    },
  };
}

function buildDateSubtitle(dates = [], fallback = "") {
  if (!dates.length) return fallback;
  const labels = dates.map((value) => {
    const [year, month, day] = String(value || "").split("-");
    return `${Number(month)}/${Number(day)}`;
  });
  return labels.length === 1 ? labels[0] : `${labels[0]} - ${labels[labels.length - 1]}`;
}

function decorateViews(viewMeta = {}) {
  const day1Dates = Array.isArray(viewMeta?.day1?.dates) ? viewMeta.day1.dates : [];
  const day2Dates = Array.isArray(viewMeta?.day2?.dates) ? viewMeta.day2.dates : [];
  return {
    total: {
      key: "total",
      label: "总分",
      subtitle: "附加赛前两轮累计",
    },
    day1: {
      key: "day1",
      label: "Day 1",
      subtitle: `第一轮 · ${buildDateSubtitle(day1Dates, "待更新")}`,
      dates: day1Dates,
    },
    day2: {
      key: "day2",
      label: "Day 2",
      subtitle: `第二轮 · ${buildDateSubtitle(day2Dates, "待更新")}`,
      dates: day2Dates,
    },
  };
}

function calculateFantasyScore(statistics = {}) {
  const points = Number(statistics?.points || 0);
  const rebounds = Number(statistics?.reboundsTotal || 0);
  const assists = Number(statistics?.assists || 0);
  const steals = Number(statistics?.steals || 0);
  const blocks = Number(statistics?.blocks || 0);
  return Number((points + rebounds + assists * 2 + steals * 3 + blocks * 3).toFixed(1));
}

function toRemoteHeadshotUrl(personId) {
  return personId ? `${REMOTE_HEADSHOT_URL_PREFIX}${personId}.png` : null;
}

function buildBucketPlayers(boxscoreMap, scheduleGames) {
  const buckets = {
    day1: [],
    day2: [],
  };

  const scheduleById = new Map(scheduleGames.map((game) => [game.gameId, game]));

  for (const [gameId, payload] of boxscoreMap.entries()) {
    const scheduleGame = scheduleById.get(gameId);
    if (!scheduleGame) continue;

    const game = payload?.game || {};
    const bucketKey = scheduleGame.bucketKey || "day1";
    const teams = [game?.awayTeam, game?.homeTeam];

    for (const team of teams) {
      for (const player of Array.isArray(team?.players) ? team.players : []) {
        const fullName = String(player?.name || [player?.firstName, player?.familyName].filter(Boolean).join(" ") || "").trim();
        if (!fullName) continue;
        buckets[bucketKey].push({
          fullName,
          keys: buildNameKeys(fullName),
          teamCode: normalizeScheduleTeam(team).tricode,
          personId: String(player?.personId || "").trim() || null,
          played: String(player?.played || "0") === "1",
          fantasyScore: calculateFantasyScore(player?.statistics || {}),
          stats: {
            points: Number(player?.statistics?.points || 0),
            rebounds: Number(player?.statistics?.reboundsTotal || 0),
            assists: Number(player?.statistics?.assists || 0),
            steals: Number(player?.statistics?.steals || 0),
            blocks: Number(player?.statistics?.blocks || 0),
          },
          headshotUrl: toRemoteHeadshotUrl(String(player?.personId || "").trim() || null),
        });
      }
    }
  }

  return buckets;
}

function scoreLiveMatch(playerName, teamCode, bucketPlayer) {
  const targetKeys = buildNameKeys(playerName);
  const targetPrimary = normalizeNameKey(playerName);
  const candidatePrimary = normalizeNameKey(bucketPlayer?.fullName || "");
  let score = 0;

  if (targetPrimary && candidatePrimary) {
    score = Math.max(score, similarity(targetPrimary, candidatePrimary));
  }

  const candidateKeys = Array.isArray(bucketPlayer?.keys) ? bucketPlayer.keys : [];
  for (const left of targetKeys) {
    for (const right of candidateKeys) {
      score = Math.max(score, similarity(left, right));
      if (left === right) score = Math.max(score, 1);
    }
  }

  if (teamCode && bucketPlayer?.teamCode && teamCode === bucketPlayer.teamCode) {
    score += 0.2;
  }

  return score;
}

function similarity(left = "", right = "") {
  if (!left || !right) return 0;
  if (left === right) return 1;
  const longest = Math.max(left.length, right.length);
  if (!longest) return 0;
  let matches = 0;
  for (let index = 0; index < Math.min(left.length, right.length); index += 1) {
    if (left[index] === right[index]) matches += 1;
  }
  return matches / longest;
}

function resolveBucketPlayer(draftedPlayer, bucketPlayers = []) {
  const englishName = String(draftedPlayer?.english_name || "").trim();
  if (!englishName) return null;

  let bestMatch = null;
  let bestScore = 0;

  for (const bucketPlayer of bucketPlayers) {
    const score = scoreLiveMatch(englishName, draftedPlayer?.team_code, bucketPlayer);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = bucketPlayer;
    }
  }

  if (!bestMatch || bestScore < 0.72) return null;
  return bestMatch;
}

function createEmptyBucketLine() {
  return {
    raw: 0,
    effective: 0,
    played: false,
    counted: false,
    subbedInFor: null,
    captainApplied: false,
    status: "dnp",
    stats: {
      points: 0,
      rebounds: 0,
      assists: 0,
      steals: 0,
      blocks: 0,
    },
  };
}

function hydrateRosterForBuckets(manager, bucketPlayers) {
  const roster = (manager?.roster || []).map((player) => ({
    ...player,
    scores: {
      day1: createEmptyBucketLine(),
      day2: createEmptyBucketLine(),
      total: createEmptyBucketLine(),
    },
  }));

  for (const bucketKey of ["day1", "day2"]) {
    const liveMatches = roster.map((player) => {
      const live = resolveBucketPlayer(player, bucketPlayers[bucketKey] || []);
      const base = live?.fantasyScore || 0;
      return {
        player,
        live,
        raw: Number(base.toFixed(1)),
        played: !!live?.played,
      };
    });

    const starters = liveMatches.filter((item) => item.player.role === "starter").sort((a, b) => a.player.slot - b.player.slot);
    const bench = liveMatches.filter((item) => item.player.role === "bench").sort((a, b) => a.player.slot - b.player.slot);
    const availableBench = [...bench];

    for (const starter of starters) {
      if (starter.played) {
        applyBucketScore(starter.player.scores[bucketKey], starter, null);
        continue;
      }
      const replacementIndex = availableBench.findIndex((item) => item.played);
      if (replacementIndex >= 0) {
        const replacement = availableBench.splice(replacementIndex, 1)[0];
        applyBucketScore(replacement.player.scores[bucketKey], replacement, starter.player.slot);
      }
    }

    const bucketTotal = roster.reduce((sum, player) => sum + Number(player.scores[bucketKey].effective || 0), 0);
    manager.scores[bucketKey] = Number(bucketTotal.toFixed(1));
  }

  for (const player of roster) {
    const totalRaw = Number((player.scores.day1.raw + player.scores.day2.raw).toFixed(1));
    const totalEffective = Number((player.scores.day1.effective + player.scores.day2.effective).toFixed(1));
    player.scores.total = {
      raw: totalRaw,
      effective: totalEffective,
      played: player.scores.day1.played || player.scores.day2.played,
      counted: player.scores.day1.counted || player.scores.day2.counted,
      subbedInFor: null,
      captainApplied: player.scores.day1.captainApplied || player.scores.day2.captainApplied,
      status: totalEffective > 0 ? "counted" : (totalRaw > 0 ? "played" : "dnp"),
      stats: {
        points: Number((player.scores.day1.stats.points + player.scores.day2.stats.points).toFixed(1)),
        rebounds: Number((player.scores.day1.stats.rebounds + player.scores.day2.stats.rebounds).toFixed(1)),
        assists: Number((player.scores.day1.stats.assists + player.scores.day2.stats.assists).toFixed(1)),
        steals: Number((player.scores.day1.stats.steals + player.scores.day2.stats.steals).toFixed(1)),
        blocks: Number((player.scores.day1.stats.blocks + player.scores.day2.stats.blocks).toFixed(1)),
      },
    };

    if (!player.headshot_url && player.person_id) {
      player.headshot_url = toRemoteHeadshotUrl(player.person_id);
    }
    if (!player.headshot_url) {
      const liveHeadshot = player.scores.day1._headshotUrl || player.scores.day2._headshotUrl || null;
      if (liveHeadshot) player.headshot_url = liveHeadshot;
    }
    delete player.scores.day1._headshotUrl;
    delete player.scores.day2._headshotUrl;
  }

  manager.roster = roster;
  manager.scores.total = Number((manager.scores.day1 + manager.scores.day2).toFixed(1));
  manager.roster_size = roster.length;
  return manager;
}

function applyBucketScore(target, liveEntry, subbedInFor) {
  const player = liveEntry?.player || {};
  const raw = Number(liveEntry?.raw || 0);
  const captainApplied = !!player?.is_captain;
  const multiplier = captainApplied ? 1.5 : 1;
  const effective = Number((raw * multiplier).toFixed(1));

  target.raw = raw;
  target.effective = effective;
  target.played = !!liveEntry?.played;
  target.counted = true;
  target.subbedInFor = subbedInFor;
  target.captainApplied = captainApplied;
  target.status = subbedInFor ? "sub" : "counted";
  target.stats = liveEntry?.live?.stats || target.stats;
  target._headshotUrl = liveEntry?.live?.headshotUrl || null;
}

function sortManagers(entries = [], viewKey = "total") {
  return [...entries]
    .sort((left, right) => {
      const leftScore = Number(left?.scores?.[viewKey] || 0);
      const rightScore = Number(right?.scores?.[viewKey] || 0);
      if (rightScore !== leftScore) return rightScore - leftScore;
      if (Number(right?.scores?.total || 0) !== Number(left?.scores?.total || 0)) {
        return Number(right?.scores?.total || 0) - Number(left?.scores?.total || 0);
      }
      return String(left?.manager_name || "").localeCompare(String(right?.manager_name || ""), "zh-CN");
    })
    .map((entry, index) => ({
      ...entry,
      ranks: {
        ...(entry.ranks || {}),
        [viewKey]: index + 1,
      },
    }));
}

async function fetchSchedulePayload() {
  return fetchJsonUrl(PLAYIN_SCHEDULE_URL, 1);
}

async function fetchBoxscores(games = []) {
  const payloads = await Promise.all(
    games
      .filter((game) => Number(game?.gameStatus || 0) > 1 && game?.gameId)
      .map(async (game) => {
        try {
          const payload = await fetchJsonUrl(`${PLAYIN_BOXSCORE_URL_PREFIX}${game.gameId}.json`, 1);
          return [game.gameId, payload];
        } catch (error) {
          console.warn(`[playin-boxscore] failed for ${game.gameId}: ${String(error?.message || error || "unknown")}`);
          return [game.gameId, null];
        }
      })
  );
  return new Map(payloads.filter(([, value]) => value));
}

function buildScheduleCards(games = []) {
  return games.map((game) => ({
    gameId: game.gameId,
    bucketKey: game.bucketKey,
    conference: game.conference,
    label: game.gameLabel,
    displayDate: game.displayDate,
    beijingDateLabel: game.beijingDateLabel,
    beijingTimeLabel: game.beijingTimeLabel,
    beijingDateTimeLabel: game.beijingDateTimeLabel,
    status: game.gameStatusText,
    gameStatus: game.gameStatus,
    awayTeam: game.awayTeam,
    homeTeam: game.homeTeam,
  }));
}

function buildPlaceholderPlayerRow(label = "比赛未开始") {
  return {
    name: label,
    position_name: "-",
    points: 0,
    rebounds: 0,
    assists: 0,
    steals: 0,
    blocks: 0,
    fantasy: 0,
  };
}

function normalizeBoxscorePlayer(player = {}) {
  return {
    name: String(player?.name || [player?.firstName, player?.familyName].filter(Boolean).join(" ") || "-").trim() || "-",
    position_name: String(player?.position || "-").trim() || "-",
    points: Number(player?.statistics?.points || 0),
    rebounds: Number(player?.statistics?.reboundsTotal || 0),
    assists: Number(player?.statistics?.assists || 0),
    steals: Number(player?.statistics?.steals || 0),
    blocks: Number(player?.statistics?.blocks || 0),
    fantasy: calculateFantasyScore(player?.statistics || {}),
  };
}

function buildGameTitle(scheduleGame = {}) {
  const away = scheduleGame?.awayTeam?.fullName || "TBD";
  const home = scheduleGame?.homeTeam?.fullName || "TBD";
  return `${away} @ ${home}`;
}

export async function buildPlayInGameDetailPayload(gameId) {
  const normalizedId = String(gameId || "").trim();
  if (!normalizedId) {
    throw new Error("gameId is required");
  }

  const schedulePayload = await fetchSchedulePayload();
  const normalizedSchedule = normalizeScheduleGames(schedulePayload);
  const scheduleGame = normalizedSchedule.games.find((game) => game.gameId === normalizedId);
  if (!scheduleGame) {
    throw new Error("game not found");
  }

  let boxscorePayload = null;
  try {
    boxscorePayload = await fetchJsonUrl(`${PLAYIN_BOXSCORE_URL_PREFIX}${normalizedId}.json`, 1);
  } catch (error) {
    boxscorePayload = null;
  }

  const game = boxscorePayload?.game || {};
  const homeTeamPayload = game?.homeTeam || {};
  const awayTeamPayload = game?.awayTeam || {};
  const homePlayers = Array.isArray(homeTeamPayload?.players) ? homeTeamPayload.players.map(normalizeBoxscorePlayer) : [];
  const awayPlayers = Array.isArray(awayTeamPayload?.players) ? awayTeamPayload.players.map(normalizeBoxscorePlayer) : [];
  const hasPlayerData = homePlayers.length > 0 || awayPlayers.length > 0;

  return {
    success: true,
    game_id: normalizedId,
    title: buildGameTitle(scheduleGame),
    game_status: Number(game?.gameStatus || scheduleGame?.gameStatus || 0),
    game_status_text: String(game?.gameStatusText || scheduleGame?.status || "").trim(),
    game_time_bj: scheduleGame.beijingDateTimeLabel || "",
    home_team: scheduleGame.homeTeam.fullName,
    away_team: scheduleGame.awayTeam.fullName,
    home_logo_url: scheduleGame.homeTeam.logoUrl,
    away_logo_url: scheduleGame.awayTeam.logoUrl,
    home_score: Number(homeTeamPayload?.score ?? scheduleGame.homeTeam.score ?? 0),
    away_score: Number(awayTeamPayload?.score ?? scheduleGame.awayTeam.score ?? 0),
    home_players: hasPlayerData ? homePlayers : [buildPlaceholderPlayerRow()],
    away_players: hasPlayerData ? awayPlayers : [buildPlaceholderPlayerRow()],
  };
}

export async function buildPlayInLeaderboardPayload() {
  const schedulePayload = await fetchSchedulePayload();
  const normalizedSchedule = normalizeScheduleGames(schedulePayload);
  const views = decorateViews(normalizedSchedule.views);
  const boxscoreMap = await fetchBoxscores(normalizedSchedule.games);
  const bucketPlayers = buildBucketPlayers(boxscoreMap, normalizedSchedule.games);

  const managerEntries = (PLAYIN_ROSTER_DATA?.managers || []).map((manager) =>
    hydrateRosterForBuckets(
      {
        ...manager,
        scores: {
          day1: 0,
          day2: 0,
          total: 0,
        },
        ranks: {},
      },
      bucketPlayers
    )
  );

  const rankedDay1 = sortManagers(managerEntries, "day1");
  const rankedDay2 = sortManagers(rankedDay1, "day2");
  const rankedTotal = sortManagers(rankedDay2, "total");
  const finalEntries = rankedTotal.map((entry) => ({
    ...entry,
    is_complete: !!entry.is_complete,
  }));

  const liveGameCount = normalizedSchedule.games.filter((game) => Number(game?.gameStatus || 0) === 2).length;
  const scheduledGameCount = normalizedSchedule.games.filter((game) => Number(game?.gameStatus || 0) === 1).length;
  const completedGameCount = normalizedSchedule.games.filter((game) => Number(game?.gameStatus || 0) === 3).length;
  const refreshMs = liveGameCount > 0 ? 30000 : (scheduledGameCount > 0 ? 120000 : 300000);

  return {
    success: true,
    generated_at: new Date().toISOString(),
    source_generated_at: PLAYIN_ROSTER_DATA?.generated_at || null,
    views,
    schedule: {
      total_games: normalizedSchedule.games.length,
      live_games: liveGameCount,
      scheduled_games: scheduledGameCount,
      completed_games: completedGameCount,
      games: buildScheduleCards(normalizedSchedule.games),
    },
    refresh: {
      interval_ms: refreshMs,
      is_live_window: liveGameCount > 0 || scheduledGameCount > 0,
    },
    entries: finalEntries,
  };
}

export { CACHE_CONTROL };
