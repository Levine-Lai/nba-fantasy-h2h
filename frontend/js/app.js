const API_BASE = (window.__API_BASE__ || "").trim().replace(/\/+$/, "");

const API = {
    async fetch(url, options = {}) {
        const target = /^https?:\/\//.test(url) ? url : `${API_BASE}${url}`;
        try {
            const response = await fetch(target, options);
            if (!response.ok) {
                if (response.status === 401) throw new Error("Unauthorized");
                if (response.status === 500) throw new Error("Server error");
                throw new Error(`Request failed: ${response.status}`);
            }
            return response;
        } catch (error) {
            console.error(`[API Error] ${url}`, error);
            throw error;
        }
    },

    async getState() {
        return (await this.fetch("/api/state?fresh_h2h=1")).json();
    },

    async getGameDetail(fixtureId) {
        return (await this.fetch(`/api/fixture/${fixtureId}`)).json();
    },

    async getLineup(uid) {
        return (await this.fetch(`/api/picks/${uid}?fresh=1`)).json();
    },

    async getInjuries() {
        return (await this.fetch("/api/injuries")).json();
    },

    async getPlayerReference(player = "nikola-jokic") {
        return (await this.fetch(`/api/player-reference?player=${encodeURIComponent(player)}`)).json();
    },

    async getTeamAttackDefense() {
        return (await this.fetch("/api/team-attack-defense")).json();
    },

    async getPaceDiffCsv() {
        return (await this.fetch("/data.csv")).text();
    },

    async getPlayerOptions() {
        return (await this.fetch("/api/player-options")).json();
    },

    async refresh() {
        return (await this.fetch("/api/refresh", { method: "POST" })).json();
    },
};

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function formatEo(player) {
    if (player?.today_has_game === false) return "--";
    const direct = Number(player?.eo_percent);
    if (Number.isFinite(direct)) return `${direct.toFixed(1)}%`;
    const ownership = Number(player?.ownership_percent);
    if (!Number.isFinite(ownership)) return "--";
    const eo = player?.is_effective ? 100 - ownership : -ownership;
    return `${eo.toFixed(1)}%`;
}

function normalizeStatusClass(status) {
    return String(status || "").trim().toLowerCase().replace(/[^a-z]+/g, "-");
}

function getWinMoodEmoji(probability) {
    const prob = Number(probability || 0);
    if (prob >= 95) return "😄";
    if (prob >= 75) return "😎";
    if (prob >= 55) return "🙂";
    if (prob > 45) return "😐";
    if (prob > 20) return "😟";
    if (prob > 0) return "😢";
    return "😭";
}

function renderChipStatusCards(status) {
    const chips = [
        { label: "Captain", used: !!status?.captain_used },
        { label: "WC", used: !!status?.wildcard_used },
        { label: "AS", used: !!status?.all_stars_used },
    ];
    return `
        <div class="score-chip-row">
            ${chips.map((chip) => `
                <span class="score-chip-status ${chip.used ? "used" : "unused"}">
                    <span class="score-chip-label">${chip.label}</span>
                    <span class="score-chip-icon">${chip.used ? "✕" : "✓"}</span>
                </span>
            `).join("")}
        </div>
    `;
}

function sortInjuriesForView(items) {
    const order = {
        available: 0,
        probable: 1,
        questionable: 2,
        doubtful: 3,
        out: 4,
    };
    return [...(items || [])].sort((a, b) => {
        const left = Number(order[String(a?.status_short || a?.status || "").toLowerCase()] ?? 99);
        const right = Number(order[String(b?.status_short || b?.status || "").toLowerCase()] ?? 99);
        return left - right || String(a?.player_name || "").localeCompare(String(b?.player_name || ""));
    });
}

function hexToRgba(hex, alpha = 0.14) {
    const raw = String(hex || "").trim();
    const normalized = raw.startsWith("#") ? raw.slice(1) : raw;
    if (!/^[0-9a-f]{6}$/i.test(normalized)) {
        return `rgba(15, 23, 42, ${alpha})`;
    }
    const r = parseInt(normalized.slice(0, 2), 16);
    const g = parseInt(normalized.slice(2, 4), 16);
    const b = parseInt(normalized.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getManagerLogoUrl(name) {
    return `/players-logos/${encodeURIComponent(String(name || "").trim())}.jpg`;
}

function getTeamLogoUrl(teamName, providedUrl = "") {
    if (providedUrl) return providedUrl;
    const key = String(teamName || "").trim().toLowerCase();
    const logoMap = {
        "atlanta hawks": "hawks.png",
        "boston celtics": "celtics.png",
        "brooklyn nets": "nets.png",
        "charlotte hornets": "hornets.png",
        "chicago bulls": "bulls.png",
        "cleveland cavaliers": "cavaliers.png",
        "dallas mavericks": "mavericks.png",
        "denver nuggets": "nuggets.png",
        "detroit pistons": "pistons.png",
        "golden state warriors": "warriors.png",
        "houston rockets": "rockets.png",
        "indiana pacers": "pacers.png",
        "los angeles clippers": "clippers.png",
        "los angeles lakers": "lakers.png",
        "memphis grizzlies": "grizzlies.png",
        "miami heat": "heat.png",
        "milwaukee bucks": "bucks.png",
        "minnesota timberwolves": "timberwolves.png",
        "new orleans pelicans": "pelicans.png",
        "new york knicks": "knicks.png",
        "oklahoma city thunder": "thunder.png",
        "orlando magic": "magic.png",
        "philadelphia 76ers": "sixers.png",
        "phoenix suns": "suns.png",
        "portland trail blazers": "blazers.png",
        "sacramento kings": "kings.png",
        "san antonio spurs": "spurs.png",
        "toronto raptors": "raptors.png",
        "utah jazz": "jazz.png",
        "washington wizards": "wizards.png",
    };
    return `/nba-team-logos/${logoMap[key] || "_.png"}`;
}

function parseSeasonPaceDiffCsv(csvText) {
    const text = String(csvText || "").trim();
    if (!text) return [];
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) return [];
    const headers = lines[0].split(",");
    const teamIndex = headers.indexOf("Team");
    const nrtgIndex = headers.indexOf("NRtg");
    const paceIndex = headers.indexOf("Pace");
    if (teamIndex === -1 || nrtgIndex === -1 || paceIndex === -1) return [];

    return lines.slice(1)
        .map((line) => {
            const cols = line.split(",");
            const teamName = String(cols[teamIndex] || "").replace(/\*+/g, "").trim();
            if (!teamName || /league average/i.test(teamName)) return null;
            const pace = Number(String(cols[paceIndex] || "").trim());
            const nRtg = Number(String(cols[nrtgIndex] || "").replace(/^\+/, "").trim());
            if (!Number.isFinite(pace) || !Number.isFinite(nRtg)) return null;
            return {
                team_name: teamName,
                logo_url: getTeamLogoUrl(teamName),
                pace: Number(pace.toFixed(1)),
                n_rtg: Number(nRtg.toFixed(1)),
                abs_n_rtg: Number(Math.abs(nRtg).toFixed(1)),
            };
        })
        .filter(Boolean)
        .sort((a, b) =>
            a.abs_n_rtg - b.abs_n_rtg ||
            b.pace - a.pace ||
            String(a.team_name || "").localeCompare(String(b.team_name || ""))
        );
}

function renderTransferRecords(teamName, transferRecords, side = "left", captainUsed = null) {
    const rows = (transferRecords || []).map((record) => `
        <div class="transfer-record ${side === "right" ? "align-right" : ""}">
            <div class="transfer-day">${escapeHtml(record.day_label || "DAY?")}</div>
            <div class="transfer-move">${record.out_name && record.in_name
                ? `${escapeHtml(record.out_name)}<span class="transfer-arrow">-></span>${escapeHtml(record.in_name)}`
                : escapeHtml(record.move || "")}</div>
            <div class="transfer-cost ${record.is_free ? "" : "penalty"} ${record.is_wildcard ? "wildcard" : ""} ${record.is_rich ? "rich" : ""}">
                ${escapeHtml(record.cost_type || "")}
            </div>
        </div>
    `).join("");

    const captainLabel = captainUsed?.used
        ? `${captainUsed?.day ? `DAY${captainUsed.day}` : "DAY?"} ${captainUsed?.captain_name || "None"} ${Number(captainUsed?.captain_points || 0)}`
        : "None";

    return `
        <div class="transfer-panel-title">${escapeHtml(teamName)} This Week</div>
        ${rows || '<div class="trend-empty">No transfers this week</div>'}
        <div class="transfer-captain ${side === "right" ? "align-right" : ""}">
            <span class="transfer-captain-label">Captain Used:</span>
            <span class="transfer-captain-value">${escapeHtml(captainLabel)}</span>
        </div>
    `;
}

function getBeijingHour(date = new Date()) {
    return Number(new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Shanghai",
        hour: "2-digit",
        hour12: false,
    }).format(date));
}

function getNextRefreshDelay(fixtures) {
    const games = Array.isArray(fixtures?.games) ? fixtures.games : [];
    if (!games.length) return null;

    const bjHour = getBeijingHour(new Date());
    const inRefreshWindow = bjHour >= 7 && bjHour < 14;
    const hasUnfinishedGames = games.some((game) => !game?.finished);
    if (!inRefreshWindow || !hasUnfinishedGames) return null;

    const kickoffTimes = games
        .map((game) => (game?.kickoff_time ? Date.parse(game.kickoff_time) : NaN))
        .filter((value) => Number.isFinite(value));
    const earliestKickoff = kickoffTimes.length ? Math.min(...kickoffTimes) : null;
    const now = Date.now();

    if (earliestKickoff && now < earliestKickoff) {
        return Math.max(30000, earliestKickoff - now);
    }

    return 120000;
}

const Render = {
    updateTime() {
        const element = document.getElementById("update-time");
        if (!element) return;
        element.textContent = new Date().toLocaleTimeString("zh-CN", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        });
    },

    eventInfo(name) {
        const element = document.getElementById("event-info");
        if (element) element.textContent = `${name} - League #1653`;
    },

    gameCount(count) {
        const element = document.getElementById("game-count");
        if (element) element.textContent = `${count}`;
    },

    matchCount(count) {
        const element = document.getElementById("match-count");
        if (element) element.textContent = `${count}`;
    },

    refreshButton(state, text) {
        const button = document.getElementById("refresh-btn");
        if (!button) return;
        button.disabled = state === "loading";
        button.textContent = text;
    },

    transferTrends(data) {
        const transferTable = document.getElementById("trend-transfer-table");
        const ownership = document.getElementById("ownership-top");
        if (!transferTable || !ownership) return;

        const formatOneDecimal = (value) => {
            const num = Number(value);
            return Number.isFinite(num) && num > 0 ? num.toFixed(1) : "--";
        };

        const weeklyIn = data?.overall?.top_in || data?.global?.top_in || [];
        const weeklyOut = data?.overall?.top_out || data?.global?.top_out || [];
        const ownershipTop = data?.ownership_top || [];
        const managerCount = Number(data?.ownership_manager_count || 26);
        const direction = App.transferDirection === "out" ? "out" : "in";
        const activeItems = direction === "out" ? weeklyOut : weeklyIn;

        transferTable.innerHTML = activeItems.length
            ? activeItems.map((item) => `
                <div class="trend-table-row">
                    <span class="trend-player-name">${escapeHtml(item.name)}</span>
                    <span class="trend-cell-number">${formatOneDecimal(item.cost)}</span>
                    <span class="trend-cell-number">${formatOneDecimal(item.form)}</span>
                    <span class="trend-cell-number">${formatOneDecimal(item.value)}</span>
                    <span class="trend-number">${Number(item.transfers || item.count || 0)}</span>
                </div>
            `).join("")
            : '<div class="trend-empty">No weekly transfer trend data</div>';
        ownership.innerHTML = ownershipTop.length
            ? ownershipTop.map((item) => `
                <div class="trend-table-row ownership-row">
                    <span class="trend-player-name">${escapeHtml(item.name)}</span>
                    <span class="trend-cell-number">${formatOneDecimal(item.cost)}</span>
                    <span class="trend-number">${Number(item.holder_count || 0)}/${managerCount}</span>
                    <span class="trend-number">${Number(item.ownership_percent || 0).toFixed(1)}%</span>
                </div>
            `).join("")
            : '<div class="trend-empty">No ownership data</div>';
    },

    fdr(data) {
        const headerRow = document.getElementById("fdr-header-row");
        const badge = document.getElementById("fdr-week-badge");
        const body = document.getElementById("fdr-body");
        if (!headerRow || !badge || !body) return;

        const weeks = Array.isArray(data?.weeks) ? data.weeks : [];
        headerRow.innerHTML = `<th class="t-name">TEAM</th>${weeks.map((week) => `<th>${week}</th>`).join("")}<th class="avg-col">AVG</th>`;
        badge.textContent = weeks.length ? `GW ${weeks.join("-")}` : "Auto GW";
        body.innerHTML = data?.html || '<tr><td colspan="5" style="text-align:center;padding:20px;">No FDR data</td></tr>';
    },

    injuries(data) {
        const badge = document.getElementById("injury-date-badge");
        const subtitle = document.getElementById("injury-subtitle");
        const container = document.getElementById("injury-list");
        if (!badge || !subtitle || !container) return;

        subtitle.style.display = "block";
        badge.textContent = data?.target_date || "No Date";
        subtitle.textContent = data?.next_event_name
            ? `${data.next_event_name} · 更新 ${data?.updated_at ? new Date(data.updated_at).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }) : "--:--"}`
            : "暂无下一日伤病数据";

        const teams = Array.isArray(data?.teams) ? data.teams : [];
        if (!teams.length) {
            container.innerHTML = '<div class="trend-empty">No injury data for the next fantasy day</div>';
            return;
        }

        container.innerHTML = teams.map((team) => `
            <div class="injury-card" style="--team-color:${escapeHtml(team.team_color || "#334155")}">
                <div class="injury-card-head">
                    <div class="injury-team-wrap">
                        <img class="injury-team-logo" src="${escapeHtml(team.logo_url || "/nba-team-logos/_.png")}" alt="${escapeHtml(team.team_name)} logo" decoding="async" width="34" height="34" loading="lazy" onerror="this.onerror=null;this.src='/nba-team-logos/_.png';">
                        <div class="injury-team">${escapeHtml(team.team_name)}</div>
                    </div>
                </div>
                ${Array.isArray(team.injuries) && team.injuries.length
                    ? `<div class="injury-rows">${sortInjuriesForView(team.injuries).map((item) => `
                        <div class="injury-row">
                            <div class="injury-line">
                                <span class="injury-player">${escapeHtml(item.player_name)}</span>
                                <span class="injury-status ${normalizeStatusClass(item.status_short || item.status || "")}">${escapeHtml(item.status_short || item.status || "-")}</span>
                            </div>
                        </div>
                    `).join("")}</div>`
                    : '<div class="injury-healthy">全员健康</div>'}
            </div>
        `).join("");
    },

    playerReference(data) {
        const badge = document.getElementById("player-reference-badge");
        const subtitle = document.getElementById("player-reference-subtitle");
        const container = document.getElementById("player-reference-list");
        if (!badge || !subtitle || !container) return;

        badge.textContent = data?.web_name || "Player";
        subtitle.style.display = "none";
        subtitle.textContent = "";

        const opponents = Array.isArray(data?.opponents) ? data.opponents : [];
        if (!opponents.length) {
            container.innerHTML = '<div class="trend-empty">No matchup reference data</div>';
            return;
        }

        container.innerHTML = opponents.map((item) => `
            <div class="reference-card" style="--team-color:${escapeHtml(item.team_color || "#334155")};--team-color-soft:${escapeHtml(hexToRgba(item.team_color || "#334155", 0.14))};">
                <div class="reference-card-head">
                    <div class="reference-team-wrap">
                        <img class="reference-team-logo" src="${escapeHtml(item.logo_url || "/nba-team-logos/_.png")}" alt="${escapeHtml(item.opponent_team || "-")} logo" decoding="async" width="34" height="34" loading="lazy" onerror="this.onerror=null;this.src='/nba-team-logos/_.png';">
                        <div class="reference-team">${escapeHtml(item.opponent_team || "-")}</div>
                    </div>
                </div>
                <div class="reference-games">
                    ${(Array.isArray(item.games) ? item.games : []).map((game) => game
                        ? `
                            <div class="reference-game-row">
                                <div class="reference-game-copy">
                                    <div class="reference-game-date">${escapeHtml(game.date_label || "-")} ${escapeHtml(game.venue_label || "")}</div>
                                    <div class="reference-game-meta">
                                        ${Number(game.minutes || 0) > 0 ? `${Math.round(Number(game.minutes || 0))}分钟 ` : ""}
                                        ${Math.round(Number(game.points_scored || 0))}分
                                        ${Math.round(Number(game.rebounds || 0))}板
                                        ${Math.round(Number(game.assists || 0))}助
                                        ${Math.round(Number(game.steals || 0))}断
                                        ${Math.round(Number(game.blocks || 0))}帽
                                    </div>
                                </div>
                                <div class="reference-score-chip">${Math.round(Number(game.fantasy_points || 0))}分</div>
                            </div>
                        `
                        : `
                            <div class="reference-game-row reference-placeholder">
                                <div class="reference-game-copy">
                                    <div class="reference-game-date">--</div>
                                    <div class="reference-game-meta">--</div>
                                </div>
                                <div class="reference-score-chip">--</div>
                            </div>
                        `).join("")}
                    <div class="reference-average-row">
                        ${item.averages
                            ? `
                                <div class="reference-average-copy">
                                    <div class="reference-average-label">场均</div>
                                    <div class="reference-average-meta">
                                        ${Number(item.averages.minutes || 0) > 0 ? `${Number(item.averages.minutes || 0).toFixed(1)}分钟 ` : ""}
                                        ${Number(item.averages.points_scored || 0).toFixed(1)}分
                                        ${Number(item.averages.rebounds || 0).toFixed(1)}板
                                        ${Number(item.averages.assists || 0).toFixed(1)}助
                                        ${Number(item.averages.steals || 0).toFixed(1)}断
                                        ${Number(item.averages.blocks || 0).toFixed(1)}帽
                                    </div>
                                </div>
                                <div class="reference-score-chip average-chip">${Number(item.averages.fantasy_points || 0).toFixed(1)}分</div>
                            `
                            : `
                                <div class="reference-average-copy">
                                    <div class="reference-average-label">场均</div>
                                    <div class="reference-average-meta">暂无数据</div>
                                </div>
                                <div class="reference-score-chip average-chip">--</div>
                            `}
                    </div>
                </div>
            </div>
        `).join("");
    },

    gamesList(games) {
        const container = document.getElementById("game-list");
        if (!container) return;

        if (!games || games.length === 0) {
            container.innerHTML = '<div style="text-align:center;padding:40px;color:#999;">No games today</div>';
            return;
        }

        container.innerHTML = games.map((game) => {
            const status = game.status_label || (game.finished ? "Finished" : (game.started ? "Live" : "Upcoming"));
            const homeClass = game.home_score > game.away_score ? "winning" : (game.home_score < game.away_score ? "losing" : "");
            const awayClass = game.away_score > game.home_score ? "winning" : (game.away_score < game.home_score ? "losing" : "");

            return `
                <div class="game-item js-game-item" data-fixture-id="${game.id}">
                    <div class="game-teams">
                        <div class="game-row">
                            <span class="game-team-wrap">
                                <img class="game-team-logo" src="${escapeHtml(getTeamLogoUrl(game.away_team, game.away_logo_url))}" alt="${escapeHtml(game.away_team)} logo" decoding="async" width="24" height="24" loading="lazy" onerror="this.onerror=null;this.src='/nba-team-logos/_.png';">
                                <span class="game-team">${escapeHtml(game.away_team)}</span>
                            </span>
                            <span class="game-score ${awayClass}">${game.away_score}</span>
                        </div>
                        <div class="game-row">
                            <span class="game-team-wrap">
                                <img class="game-team-logo" src="${escapeHtml(getTeamLogoUrl(game.home_team, game.home_logo_url))}" alt="${escapeHtml(game.home_team)} logo" decoding="async" width="24" height="24" loading="lazy" onerror="this.onerror=null;this.src='/nba-team-logos/_.png';">
                                <span class="game-team">${escapeHtml(game.home_team)}</span>
                            </span>
                            <span class="game-score ${homeClass}">${game.home_score}</span>
                        </div>
                    </div>
                    <div class="game-meta">
                        <div class="game-time">${escapeHtml(game.kickoff)}</div>
                        <div class="game-status">${escapeHtml(status)}</div>
                    </div>
                </div>
            `;
        }).join("");
    },

    h2hList(matches) {
        const container = document.getElementById("h2h-list");
        if (!container) return;

        const highestWeekTotal = (matches || []).reduce((max, match) => {
            return Math.max(max, Number(match?.total1 || 0), Number(match?.total2 || 0));
        }, 0);

        container.innerHTML = (matches || []).map((match) => {
            const leftScore = Number(match.total1 || 0);
            const rightScore = Number(match.total2 || 0);
            const isLeftWin = leftScore > rightScore;
            const isDraw = leftScore === rightScore;
            const leftClass = isDraw ? "" : (isLeftWin ? "winning" : "losing");
            const rightClass = isDraw ? "" : (isLeftWin ? "losing" : "winning");
            const leftMuted = !isDraw && !isLeftWin ? "is-behind" : "";
            const rightMuted = !isDraw && isLeftWin ? "is-behind" : "";
            const leftPanelId = `transfers-${match.uid1}-${match.uid2}-left`;
            const rightPanelId = `transfers-${match.uid1}-${match.uid2}-right`;
            const leftHasCrown = leftScore === highestWeekTotal && highestWeekTotal > 0;
            const rightHasCrown = rightScore === highestWeekTotal && highestWeekTotal > 0;
            const leftWinProb = Number(match.win_prob1 ?? 50);
            const rightWinProb = Number(match.win_prob2 ?? 50);
            const leftMood = getWinMoodEmoji(leftWinProb);
            const rightMood = getWinMoodEmoji(rightWinProb);
            const leftChipStatus = match.chip_status1 || {};
            const rightChipStatus = match.chip_status2 || {};

            return `
                <div class="match-block">
                    <div class="match-card">
                        <div class="team-side ${leftClass} ${leftMuted} js-transfer-toggle" data-panel-id="${leftPanelId}" data-uid="${match.uid1}" data-team="${escapeHtml(match.t1)}" data-side="left">
                            <div class="team-head">
                                <div class="manager-logo-wrap">
                                    ${leftHasCrown ? '<span class="manager-crown" aria-hidden="true">👑</span>' : ''}
                                    <img class="manager-logo" src="${escapeHtml(getManagerLogoUrl(match.t1))}" alt="${escapeHtml(match.t1)} logo" decoding="async" width="40" height="40" loading="lazy" onerror="this.onerror=null;this.src='/LOGO.png';">
                                </div>
                                <div class="team-name">${escapeHtml(match.t1)}</div>
                            </div>
                            <div class="score-main ${leftClass}">${leftScore}</div>
                            <div class="score-sub">Today ${match.today1}</div>
                            <div class="score-prob">Win ${leftWinProb}% <span class="score-mood">${leftMood}</span></div>
                            ${renderChipStatusCards(leftChipStatus)}
                        </div>
                        <div class="vs-divider js-open-lineup" data-uid1="${match.uid1}" data-name1="${escapeHtml(match.t1)}" data-uid2="${match.uid2}" data-name2="${escapeHtml(match.t2)}">
                            <div class="vs-text">VS</div>
                            <div class="match-diff">Diff: ${Math.abs(Number(match.diff || 0))}</div>
                        </div>
                        <div class="team-side ${rightClass} ${rightMuted} js-transfer-toggle" data-panel-id="${rightPanelId}" data-uid="${match.uid2}" data-team="${escapeHtml(match.t2)}" data-side="right">
                            <div class="team-head">
                                <div class="manager-logo-wrap">
                                    ${rightHasCrown ? '<span class="manager-crown" aria-hidden="true">👑</span>' : ''}
                                    <img class="manager-logo" src="${escapeHtml(getManagerLogoUrl(match.t2))}" alt="${escapeHtml(match.t2)} logo" decoding="async" width="40" height="40" loading="lazy" onerror="this.onerror=null;this.src='/LOGO.png';">
                                </div>
                                <div class="team-name">${escapeHtml(match.t2)}</div>
                            </div>
                            <div class="score-main ${rightClass}">${rightScore}</div>
                            <div class="score-sub">Today ${match.today2}</div>
                            <div class="score-prob">Win ${rightWinProb}% <span class="score-mood">${rightMood}</span></div>
                            ${renderChipStatusCards(rightChipStatus)}
                        </div>
                    </div>
                    <div class="match-transfer-wrap">
                        <div id="${leftPanelId}" class="match-transfer-panel left-panel"></div>
                        <div id="${rightPanelId}" class="match-transfer-panel right-panel"></div>
                    </div>
                </div>
            `;
        }).join("");
    },

    modalLoading(modalId, bodyId, titleId, title) {
        const modal = document.getElementById(modalId);
        const body = document.getElementById(bodyId);
        const titleElement = titleId ? document.getElementById(titleId) : null;
        if (modal) modal.classList.add("active");
        if (body) body.innerHTML = '<div class="loading"><div class="spinner"></div>Loading...</div>';
        if (titleElement && title) titleElement.textContent = title;
    },

    modalError(bodyId, message = "Load failed") {
        const body = document.getElementById(bodyId);
        if (body) body.innerHTML = `<div style="text-align:center;padding:20px;">${escapeHtml(message)}</div>`;
    },

    gameDetail(data) {
        const body = document.getElementById("game-body");
        const title = document.getElementById("game-title");
        if (!body) return;

        if (!data.home_players) {
            this.modalError("game-body", "No data");
            return;
        }

        if (title) title.textContent = `${data.away_team} @ ${data.home_team}`;

        const createTable = (players, teamName, logoUrl) => `
            <div class="team-section">
                <h3 class="team-section-title">
                    <img class="team-section-logo" src="${escapeHtml(getTeamLogoUrl(teamName, logoUrl))}" alt="${escapeHtml(teamName)} logo" decoding="async" width="28" height="28" loading="lazy" onerror="this.onerror=null;this.src='/nba-team-logos/_.png';">
                    <span>${escapeHtml(teamName)}</span>
                </h3>
                <table class="stats-table">
                    <thead>
                        <tr>
                            <th>Player</th>
                            <th>Pos</th>
                            <th>PTS</th>
                            <th>REB</th>
                            <th>AST</th>
                            <th>STL</th>
                            <th>BLK</th>
                            <th>Fantasy</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${(players || []).map((player) => `
                            <tr>
                                <td class="player-name">${escapeHtml(player.name)}</td>
                                <td>${escapeHtml(player.position_name)}</td>
                                <td>${player.points}</td>
                                <td>${player.rebounds}</td>
                                <td>${player.assists}</td>
                                <td>${player.steals}</td>
                                <td>${player.blocks}</td>
                                <td class="fantasy-score">${player.fantasy}</td>
                            </tr>
                        `).join("")}
                    </tbody>
                </table>
            </div>
        `;

        body.innerHTML = `
            <div class="game-detail-container">
                ${createTable(data.away_players, data.away_team, data.away_logo_url)}
                ${createTable(data.home_players, data.home_team, data.home_logo_url)}
            </div>
        `;
    },

    lineup(data, name, isDual = false, dualData = null, dualName = null) {
        const body = document.getElementById("lineup-body");
        const title = document.getElementById("lineup-title");
        const modalCard = document.querySelector("#lineup-modal .modal");
        if (!body) return;
        if (modalCard) modalCard.classList.toggle("lineup-wide", Boolean(isDual));
        if (title) title.textContent = isDual ? `${name} VS ${dualName}` : `${name} Lineup`;

        const createPlayerCard = (player) => {
            const isCaptain = player.is_captain && Number(player.multiplier || 1) > 1;
            const badge = isCaptain ? '<span class="captain-badge">C</span>' : "";
            const injuryBadge = player.injury ? `<span class="injury-badge" title="${escapeHtml(player.injury)}">INJ ${escapeHtml(player.injury)}</span>` : "";
            const effectiveClass = player.is_effective ? "effective" : "ineffective";
            const posClass = player.position_name === "BC" ? "pos-BC" : "pos-FC";
            const eo = formatEo(player);
            const price = Number(player?.now_cost || 0) / 10;
            const value = price > 0 ? Number(player?.final_points || 0) / price : 0;

            return `
                <div class="player-card ${effectiveClass}">
                    <div class="pos-badge ${posClass}">${escapeHtml(player.position_name)}</div>
                    <div class="player-info">
                        <div class="player-name-row">
                            <div class="player-name">${escapeHtml(player.name)} (${price > 0 ? `$${price.toFixed(1)}` : "$0.0"})</div>
                            ${badge}
                            ${injuryBadge}
                        </div>
                        <div class="player-stats">
                            <span>Value ${value.toFixed(1)}</span>
                            <span>EO ${escapeHtml(eo)}</span>
                        </div>
                    </div>
                    <div class="player-score">
                        <div class="score-final">${player.final_points}</div>
                    </div>
                </div>
            `;
        };

        const createLineupSection = (lineupData, teamName) => {
            const players = Array.isArray(lineupData?.players) ? lineupData.players : [];
            if (players.length === 0) {
                return '<div style="text-align:center;padding:20px;">No lineup data</div>';
            }

            const starters = players.filter((player) => Number(player.lineup_position) <= 5);
            const bench = players.filter((player) => Number(player.lineup_position) > 5);
            const wildcardLine = lineupData.wildcard_day
                ? `<div class="score-sub" style="color:#4ade80;">WC Day ${lineupData.wildcard_day}</div>`
                : (lineupData.wildcard_active ? '<div class="score-sub" style="color:#4ade80;">Wildcard Active</div>' : "");
            const richLine = lineupData.rich_day
                ? `<div class="score-sub" style="color:#38bdf8;">All-Star Day ${lineupData.rich_day}</div>`
                : "";
            const economy = lineupData.lineup_economy || {};
            const economyPanel = `
                <div class="lineup-economy">
                    <div class="economy-row"><span>今日球员总价</span><strong>${Number(economy.effective_total_cost || 0).toFixed(1)}</strong></div>
                    <div class="economy-row"><span>回本线</span><strong>${Number(economy.breakeven_line || 0).toFixed(1)}</strong></div>
                    <div class="economy-row"><span>状态</span><strong>${escapeHtml(economy.status || "-")}</strong></div>
                </div>
            `;

            return `
                <div class="${isDual ? "dual-lineup-side" : ""}">
                    ${isDual ? `
                        <div class="dual-lineup-header">
                            <div class="dual-team-name">${escapeHtml(teamName)}</div>
                            <div class="dual-team-score">${lineupData.total_live}</div>
                            <div class="score-sub">Week ${lineupData.event_total || 0}</div>
                            ${wildcardLine}
                            ${richLine}
                        </div>
                    ` : `
                        <div class="formation-info">Today: ${lineupData.total_live} | Week: ${lineupData.event_total || 0}</div>
                        ${wildcardLine}
                        ${richLine}
                    `}
                    <div class="lineup-container">
                        <div class="lineup-section starters">
                            <h4>Starters</h4>
                            ${starters.map(createPlayerCard).join("")}
                        </div>
                        <div class="lineup-section bench">
                            <h4>Bench</h4>
                            ${bench.map(createPlayerCard).join("")}
                        </div>
                    </div>
                    ${economyPanel}
                </div>
            `;
        };

        const createFutureCompareSection = (lineupData, teamName) => {
            const schedule = lineupData?.future_schedule || {};
            const days = Array.isArray(schedule?.days) ? schedule.days : [];
            const summary = Array.isArray(schedule?.summary) ? schedule.summary : [];
            const groups = Array.isArray(schedule?.groups) ? schedule.groups : [];

            if (!days.length || !groups.length) {
                return `
                    <div class="future-schedule-panel">
                        <div class="future-team-header">
                            <div class="future-team-name">${escapeHtml(teamName)}</div>
                            <div class="future-team-sub">当前阵容未来 7 天赛程</div>
                        </div>
                        <div class="trend-empty">No future schedule data</div>
                    </div>
                `;
            }

            const columnStyle = `style="grid-template-columns:minmax(116px, 1.06fr) repeat(${days.length}, minmax(46px, 1fr));"`;
            const tableMinWidth = Math.max(438, 128 + days.length * 50);
            return `
                <div class="future-schedule-panel">
                    <div class="future-team-header">
                        <div class="future-team-name">${escapeHtml(teamName)}</div>
                        <div class="future-team-sub">当前阵容未来 7 天赛程 · 左右滑动查看</div>
                    </div>
                    <div class="future-schedule-scroll">
                        <div class="future-schedule-matrix" style="min-width:${tableMinWidth}px;">
                            <div class="future-table-head" ${columnStyle}>
                                <div class="future-head-player">PLAYER</div>
                                ${days.map((day) => `<div class="future-head-day">${escapeHtml(day.day_label || "DAY?")}</div>`).join("")}
                            </div>
                            <div class="future-summary-row" ${columnStyle}>
                                <div class="future-summary-label">人数</div>
                                ${summary.map((day) => `
                                    <div class="future-summary-cell">
                                        <div class="future-summary-top">${Number(day.raw_active_count || 0)}</div>
                                        <div class="future-summary-bottom">有效 ${Number(day.effective_count || 0)}</div>
                                    </div>
                                `).join("")}
                            </div>
                            ${groups.map((group) => `
                                <div class="future-group">
                                    <div class="future-group-title ${group.position === "FC" ? "fc" : "bc"}">${escapeHtml(group.label || group.position || "")}</div>
                                    <div class="future-group-rows">
                                        ${group.players.map((player) => `
                                            <div class="future-player-row" ${columnStyle}>
                                                <div class="future-player-cell ${player.is_effective ? "effective" : ""}">
                                                    <div class="future-player-name">${escapeHtml(player.name)}</div>
                                                    <div class="future-player-meta">${escapeHtml(player.team_short || "")} ${escapeHtml(player.position_name || "")}</div>
                                                </div>
                                                ${player.cells.map((cell) => cell?.has_game
                                                    ? `
                                                        <div class="future-match-cell">
                                                            <img class="future-match-logo" src="${escapeHtml(cell.opponent_logo_url || "/nba-team-logos/_.png")}" alt="${escapeHtml(cell.opponent_name || "-")} logo" decoding="async" width="28" height="28" loading="lazy" onerror="this.onerror=null;this.src='/nba-team-logos/_.png';">
                                                            <div class="future-match-venue">${escapeHtml(cell.venue_label || "")}</div>
                                                        </div>
                                                    `
                                                    : `<div class="future-match-cell empty">-</div>`
                                                ).join("")}
                                            </div>
                                        `).join("")}
                                    </div>
                                </div>
                            `).join("")}
                        </div>
                    </div>
                </div>
            `;
        };

        if (isDual && dualData) {
            body.innerHTML = `
                <div class="lineup-view-switch">
                    <button class="lineup-mode-btn active" data-lineup-mode="today" type="button" onclick="setLineupMode('today')">今日阵容</button>
                    <button class="lineup-mode-btn" data-lineup-mode="future" type="button" onclick="setLineupMode('future')">未来 7 天</button>
                </div>
                <div class="lineup-mode-panel active" data-lineup-panel="today">
                    <div class="dual-lineup-container">
                        ${createLineupSection(data, name)}
                        ${createLineupSection(dualData, dualName)}
                    </div>
                </div>
                <div class="lineup-mode-panel" data-lineup-panel="future">
                    <div class="future-compare-scroll">
                        <div class="future-compare-board">
                            ${createFutureCompareSection(data, name)}
                            ${createFutureCompareSection(dualData, dualName)}
                        </div>
                    </div>
                </div>
            `;
            return;
        }

        body.innerHTML = createLineupSection(data, name);
    },

    teamAttackDefense(data, csvPaceTeams = []) {
        const badge = document.getElementById("other-badge");
        const subtitle = document.getElementById("other-subtitle");
        const container = document.getElementById("other-chart-wrap");
        if (!badge || !subtitle || !container) return;

        const teams = Array.isArray(data?.teams) ? data.teams : [];
        const paceTeams = Array.isArray(csvPaceTeams) ? csvPaceTeams : [];
        const periodLabel = data?.period_label || "近30天";
        badge.textContent = periodLabel;
        subtitle.textContent = `${periodLabel}攻防图 · ${data?.start_date || "--"} 至 ${data?.end_date || "--"} | 节奏图：赛季 Pace / |NRtg|`;

        if (!teams.length) {
            container.innerHTML = '<div class="trend-empty">No attack/defence data</div>';
            return;
        }

        const pointsFor = teams.map((team) => Number(team.points_for || 0));
        const pointsAgainst = teams.map((team) => Number(team.points_against || 0));
        const minFor = Math.min(...pointsFor);
        const maxFor = Math.max(...pointsFor);
        const minAgainst = Math.min(...pointsAgainst);
        const maxAgainst = Math.max(...pointsAgainst);
        const viewportWidth = Math.max(320, window.innerWidth || 1280);
        const containerWidth = Math.max(280, Math.floor(container.getBoundingClientRect().width || viewportWidth));
        const compact = viewportWidth <= 768;
        const gridGap = compact ? 16 : 20;
        const maxGridWidth = compact ? containerWidth : Math.min(containerWidth, 1120);
        const cardWidth = compact ? maxGridWidth : Math.max(420, Math.floor((maxGridWidth - gridGap) / 2));
        const plotWidth = compact ? Math.max(280, cardWidth - 8) : Math.min(cardWidth, 520);
        const plotHeight = compact ? Math.round(plotWidth * 0.92) : Math.round(plotWidth * 0.78);
        const padLeft = compact ? 42 : 52;
        const padRight = compact ? 18 : 22;
        const padTop = compact ? 24 : 26;
        const padBottom = compact ? 44 : 48;
        const innerWidth = plotWidth - padLeft - padRight;
        const innerHeight = plotHeight - padTop - padBottom;
        const pointHalf = compact ? 11 : 14;
        const attackAxisLabel = compact ? "Attack PPG" : "Attack: points per game";
        const defenceAxisLabel = compact ? "Defense: opponent points per game" : "Defense: opponent points per game";
        const xPos = (value) => padLeft + (((value - minFor) / Math.max(1, maxFor - minFor))) * innerWidth;
        const yPos = (value) => padTop + (((value - minAgainst) / Math.max(1, maxAgainst - minAgainst))) * innerHeight;
        const midpointFor = ((minFor + maxFor) / 2).toFixed(1);
        const midpointAgainst = ((minAgainst + maxAgainst) / 2).toFixed(1);
        const paceValues = paceTeams.map((team) => Number(team.pace || 0)).filter((value) => Number.isFinite(value));
        const diffValues = paceTeams.map((team) => Number(team.abs_n_rtg || 0)).filter((value) => Number.isFinite(value));
        const minPace = paceValues.length ? Math.min(...paceValues) : 0;
        const maxPace = paceValues.length ? Math.max(...paceValues) : 1;
        const minDiff = diffValues.length ? Math.min(...diffValues) : 0;
        const maxDiff = diffValues.length ? Math.max(...diffValues) : 1;
        const paceAxisLabel = compact ? "Pace" : "Pace per game";
        const marginAxisLabel = compact ? "|NRtg|" : "Absolute net rating difference";
        const paceXPos = (value) => padLeft + (((value - minPace) / Math.max(1, maxPace - minPace))) * innerWidth;
        const paceYPos = (value) => padTop + ((((maxDiff - value)) / Math.max(1, maxDiff - minDiff))) * innerHeight;
        const midpointPace = ((minPace + maxPace) / 2).toFixed(1);
        const midpointDiff = ((minDiff + maxDiff) / 2).toFixed(1);

        container.innerHTML = `
            <div class="other-charts-grid">
                <div class="attack-defense-card">
                    <div class="attack-defense-title">近30天球队攻防对比图</div>
                    <div class="attack-defense-plot" style="--plot-w:${plotWidth}px;--plot-h:${plotHeight}px;">
                        <div class="attack-defense-grid v" style="left:${padLeft + innerWidth * 0.25}px"></div>
                        <div class="attack-defense-grid v" style="left:${padLeft + innerWidth * 0.5}px"></div>
                        <div class="attack-defense-grid v" style="left:${padLeft + innerWidth * 0.75}px"></div>
                        <div class="attack-defense-grid h" style="top:${padTop + innerHeight * 0.25}px"></div>
                        <div class="attack-defense-grid h" style="top:${padTop + innerHeight * 0.5}px"></div>
                        <div class="attack-defense-grid h" style="top:${padTop + innerHeight * 0.75}px"></div>
                        <div class="attack-defense-axis attack-defense-axis-left">${defenceAxisLabel}</div>
                        <div class="attack-defense-axis attack-defense-axis-bottom">${attackAxisLabel}</div>
                        ${compact ? "" : '<div class="attack-defense-note good">Great attack,<br>great defence</div>'}
                        ${compact ? "" : '<div class="attack-defense-note bad">Poor attack,<br>poor defence</div>'}
                        <div class="attack-defense-scale" style="left:${padLeft - 38}px;top:${padTop - 6}px">${minAgainst.toFixed(1)}</div>
                        <div class="attack-defense-scale" style="left:${padLeft - 38}px;top:${padTop + innerHeight / 2 - 6}px">${midpointAgainst}</div>
                        <div class="attack-defense-scale" style="left:${padLeft - 38}px;top:${padTop + innerHeight - 6}px">${maxAgainst.toFixed(1)}</div>
                        <div class="attack-defense-scale" style="left:${padLeft - 6}px;bottom:${padBottom - 28}px">${minFor.toFixed(1)}</div>
                        <div class="attack-defense-scale" style="left:${padLeft + innerWidth / 2 - 10}px;bottom:${padBottom - 28}px">${midpointFor}</div>
                        <div class="attack-defense-scale" style="right:${padRight - 4}px;bottom:${padBottom - 28}px">${maxFor.toFixed(1)}</div>
                        ${teams.map((team) => `
                            <div class="attack-defense-point" style="left:${xPos(Number(team.points_for || 0)) - pointHalf}px;top:${yPos(Number(team.points_against || 0)) - pointHalf}px" title="${escapeHtml(team.team_name)} | PPG ${Number(team.points_for || 0).toFixed(1)} | Opp PPG ${Number(team.points_against || 0).toFixed(1)}">
                                <img src="${escapeHtml(team.logo_url || "/nba-team-logos/_.png")}" alt="${escapeHtml(team.team_name)} logo" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='/nba-team-logos/_.png';">
                            </div>
                        `).join("")}
                    </div>
                </div>
                <div class="attack-defense-card">
                    <div class="attack-defense-title">球队节奏与分差对比图</div>
                    <div class="attack-defense-plot" style="--plot-w:${plotWidth}px;--plot-h:${plotHeight}px;">
                        <div class="attack-defense-grid v" style="left:${padLeft + innerWidth * 0.25}px"></div>
                        <div class="attack-defense-grid v" style="left:${padLeft + innerWidth * 0.5}px"></div>
                        <div class="attack-defense-grid v" style="left:${padLeft + innerWidth * 0.75}px"></div>
                        <div class="attack-defense-grid h" style="top:${padTop + innerHeight * 0.25}px"></div>
                        <div class="attack-defense-grid h" style="top:${padTop + innerHeight * 0.5}px"></div>
                        <div class="attack-defense-grid h" style="top:${padTop + innerHeight * 0.75}px"></div>
                        <div class="attack-defense-axis attack-defense-axis-left">${marginAxisLabel}</div>
                        <div class="attack-defense-axis attack-defense-axis-bottom">${paceAxisLabel}</div>
                        ${compact ? "" : '<div class="attack-defense-note good">Fast pace,<br>close games</div>'}
                        ${compact ? "" : '<div class="attack-defense-note bad">Slow pace,<br>blowout risk</div>'}
                        <div class="attack-defense-scale" style="left:${padLeft - 38}px;top:${padTop - 6}px">${maxDiff.toFixed(1)}</div>
                        <div class="attack-defense-scale" style="left:${padLeft - 38}px;top:${padTop + innerHeight / 2 - 6}px">${midpointDiff}</div>
                        <div class="attack-defense-scale" style="left:${padLeft - 38}px;top:${padTop + innerHeight - 6}px">${minDiff.toFixed(1)}</div>
                        <div class="attack-defense-scale" style="left:${padLeft - 6}px;bottom:${padBottom - 28}px">${minPace.toFixed(1)}</div>
                        <div class="attack-defense-scale" style="left:${padLeft + innerWidth / 2 - 10}px;bottom:${padBottom - 28}px">${midpointPace}</div>
                        <div class="attack-defense-scale" style="right:${padRight - 4}px;bottom:${padBottom - 28}px">${maxPace.toFixed(1)}</div>
                        ${paceTeams.map((team) => {
                            const paceValue = Number(team.pace || 0);
                            const diffValue = Number(team.abs_n_rtg || 0);
                            const tooltip = `${escapeHtml(team.team_name)} | Pace ${paceValue.toFixed(1)} | |NRtg| ${diffValue.toFixed(1)}`;
                            return `
                            <div class="attack-defense-point" style="left:${paceXPos(paceValue) - pointHalf}px;top:${paceYPos(diffValue) - pointHalf}px" title="${tooltip}">
                                <img src="${escapeHtml(team.logo_url || "/nba-team-logos/_.png")}" alt="${escapeHtml(team.team_name)} logo" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='/nba-team-logos/_.png';">
                            </div>
                        `;
                        }).join("")}
                    </div>
                </div>
            </div>
        `;
    },
};

function setLineupMode(mode = "today") {
    document.querySelectorAll(".lineup-mode-btn").forEach((button) => {
        button.classList.toggle("active", button.dataset.lineupMode === mode);
    });
    document.querySelectorAll(".lineup-mode-panel").forEach((panel) => {
        panel.classList.toggle("active", panel.dataset.lineupPanel === mode);
    });
}

const App = {
    lineupCache: new Map(),
    refreshTimer: null,
    injuriesLoaded: false,
    playerReferenceLoaded: false,
    otherLoaded: false,
    playerOptionsLoaded: false,
    playerOptions: [],
    referencePositionFilter: "ALL",
    referenceSearchQuery: "",
    transferDirection: "in",
    latestTransferTrends: null,

    async getLineupCached(uid) {
        const key = String(uid);
        if (!this.lineupCache.has(key)) {
            this.lineupCache.set(key, API.getLineup(uid));
        }
        return this.lineupCache.get(key);
    },

    clearRefreshTimer() {
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
            this.refreshTimer = null;
        }
    },

    scheduleAutoRefresh(state) {
        this.clearRefreshTimer();
        const delay = getNextRefreshDelay(state?.fixtures);
        if (!delay) return;

        this.refreshTimer = setTimeout(() => {
            this.loadAll();
        }, delay);
    },

    async loadAll() {
        try {
            const state = await API.getState();
            this.latestTransferTrends = state?.transfer_trends || {};
            Render.eventInfo(state?.current_event_name || "Loading...");
            Render.gameCount(state?.fixtures?.count || 0);
            Render.gamesList(state?.fixtures?.games || []);
            Render.matchCount(Array.isArray(state?.h2h) ? state.h2h.length : 0);
            Render.h2hList(state?.h2h || []);
            Render.transferTrends(this.latestTransferTrends);
            Render.fdr(state?.fdr || {
                weeks: [],
                html: '<tr><td colspan="5" style="text-align:center;padding:20px;">Load failed</td></tr>',
            });
            Render.updateTime();
            this.scheduleAutoRefresh(state);
        } catch (error) {
            console.error("LoadAll error:", error);
            this.clearRefreshTimer();
        }
    },

    async toggleTransferPanel(event, panelId, uid, teamName, side = "left") {
        event?.stopPropagation?.();
        const panel = document.getElementById(panelId);
        if (!panel) return;

        const isOpen = panel.classList.contains("active");
        document.querySelectorAll(".match-transfer-panel.active").forEach((item) => item.classList.remove("active"));
        if (isOpen) return;

        try {
            const data = await this.getLineupCached(uid);
            panel.innerHTML = renderTransferRecords(teamName, data.transfer_records || [], side, data.captain_used || null);
            panel.classList.add("active");
        } catch (error) {
            console.error("Transfer panel error:", error);
            panel.innerHTML = `<div class="transfer-panel-title">${escapeHtml(teamName)} This Week</div><div class="trend-empty">Load failed</div>`;
            panel.classList.add("active");
        }
    },

    async showGameDetail(fixtureId) {
        Render.modalLoading("game-modal", "game-body", "game-title");
        try {
            Render.gameDetail(await API.getGameDetail(fixtureId));
        } catch (error) {
            console.error(error);
            Render.modalError("game-body");
        }
    },

    async showLineupDual(uid1, name1, uid2, name2) {
        Render.modalLoading("lineup-modal", "lineup-body", "lineup-title", `${name1} VS ${name2}`);
        try {
            const [data1, data2] = await Promise.all([this.getLineupCached(uid1), this.getLineupCached(uid2)]);
            Render.lineup(data1, name1, true, data2, name2);
        } catch (error) {
            console.error(error);
            Render.modalError("lineup-body");
        }
    },

    async manualRefresh() {
        Render.refreshButton("loading", "Refreshing...");
        this.clearRefreshTimer();
        try {
            const data = await API.refresh();
            if (data.current_event_name) Render.eventInfo(data.current_event_name);
            this.lineupCache.clear();
            await this.loadAll();
        } catch (error) {
            console.error(error);
        } finally {
            Render.refreshButton("idle", "Refresh");
        }
    },

    showPage(page) {
        document.querySelectorAll(".nav-tab").forEach((button) => {
            button.classList.toggle("active", button.dataset.page === page);
        });
        document.querySelectorAll(".page-view").forEach((view) => {
            view.classList.toggle("active", view.id === `page-${page}`);
        });
    },

    async loadInjuries(force = false) {
        if (this.injuriesLoaded && !force) return;
        const container = document.getElementById("injury-list");
        if (container) {
            container.innerHTML = '<div class="loading"><div class="spinner"></div>Loading...</div>';
        }
        try {
            const data = await API.getInjuries();
            Render.injuries(data);
            this.injuriesLoaded = true;
        } catch (error) {
            console.error("Injuries load error:", error);
            if (container) {
                container.innerHTML = '<div class="trend-empty">Load failed</div>';
            }
        }
    },

    async loadPlayerReference(force = false) {
        if (this.playerReferenceLoaded && !force) return;
        const container = document.getElementById("player-reference-list");
        if (container) {
            container.innerHTML = '<div class="loading"><div class="spinner"></div>Loading...</div>';
        }
        try {
            const data = await API.getPlayerReference("nikola-jokic");
            Render.playerReference(data);
            this.playerReferenceLoaded = true;
        } catch (error) {
            console.error("Player reference load error:", error);
            if (container) {
                container.innerHTML = '<div class="trend-empty">Load failed</div>';
            }
        }
    },

    async loadOther(force = false) {
        if (this.otherLoaded && !force) return;
        const container = document.getElementById("other-chart-wrap");
        if (container) {
            container.innerHTML = '<div class="loading"><div class="spinner"></div>Loading...</div>';
        }
        try {
            const [data, paceCsv] = await Promise.all([
                API.getTeamAttackDefense(),
                API.getPaceDiffCsv(),
            ]);
            Render.teamAttackDefense(data, parseSeasonPaceDiffCsv(paceCsv));
            this.otherLoaded = true;
        } catch (error) {
            console.error("Other page load error:", error);
            if (container) {
                container.innerHTML = '<div class="trend-empty">Load failed</div>';
            }
        }
    },

    populateReferencePlayers(teamId, preferredPlayer = "") {
        const playerSelect = document.getElementById("reference-player-select");
        if (!playerSelect) return;
        const team = this.playerOptions.find((item) => String(item.id) === String(teamId));
        const allPlayers = Array.isArray(team?.players) ? team.players : [];
        const players = allPlayers.filter((player) => (
            this.referencePositionFilter === "ALL" || String(player?.position_name || "") === this.referencePositionFilter
        ));
        playerSelect.innerHTML = players.map((player) => `
            <option value="${escapeHtml(player.id)}">${escapeHtml(player.name || player.web_name || "-")} (${(Number(player.now_cost || 0) / 10).toFixed(1)})</option>
        `).join("");
        if (preferredPlayer && players.some((player) => String(player.id) === String(preferredPlayer))) {
            playerSelect.value = preferredPlayer;
        } else if (players[0]) {
            playerSelect.value = String(players[0].id);
        }
        this.renderReferenceSearchResults();
    },

    getReferenceSearchMatches(query) {
        const keyword = String(query || "").trim().toLowerCase();
        if (!keyword) return [];
        const matches = [];
        for (const team of this.playerOptions || []) {
            for (const player of team?.players || []) {
                const position = String(player?.position_name || "");
                if (this.referencePositionFilter !== "ALL" && position !== this.referencePositionFilter) continue;
                const name = String(player?.name || player?.web_name || "").trim();
                const searchText = `${name} ${player?.web_name || ""} ${team?.name || ""}`.toLowerCase();
                if (!searchText.includes(keyword)) continue;
                matches.push({
                    team_id: team.id,
                    team_name: team.name,
                    player_id: player.id,
                    name,
                    position_name: position,
                    now_cost: Number(player?.now_cost || 0),
                });
            }
        }
        return matches
            .sort((a, b) =>
                a.name.localeCompare(b.name) ||
                b.now_cost - a.now_cost
            )
            .slice(0, 8);
    },

    renderReferenceSearchResults() {
        const input = document.getElementById("reference-player-search");
        const results = document.getElementById("reference-search-results");
        if (!input || !results) return;
        const matches = this.getReferenceSearchMatches(input.value);
        if (!matches.length) {
            results.innerHTML = "";
            results.classList.remove("active");
            return;
        }
        results.innerHTML = matches.map((item) => `
            <button class="reference-search-item" type="button"
                data-team-id="${escapeHtml(item.team_id)}"
                data-player-id="${escapeHtml(item.player_id)}"
                data-player-name="${escapeHtml(item.name)}">
                <span class="reference-search-name">${escapeHtml(item.name)}</span>
                <span class="reference-search-meta">${escapeHtml(item.team_name)} · ${escapeHtml(item.position_name)} · $${(Number(item.now_cost || 0) / 10).toFixed(1)}</span>
            </button>
        `).join("");
        results.classList.add("active");
    },

    applyReferenceSearchSelection(teamId, playerId, playerName = "") {
        const teamSelect = document.getElementById("reference-team-select");
        const playerSelect = document.getElementById("reference-player-select");
        const input = document.getElementById("reference-player-search");
        const results = document.getElementById("reference-search-results");
        if (teamSelect) teamSelect.value = String(teamId);
        this.populateReferencePlayers(teamId, playerId);
        if (playerSelect) playerSelect.value = String(playerId);
        if (input) input.value = playerName;
        if (results) {
            results.innerHTML = "";
            results.classList.remove("active");
        }
    },

    renderReferencePlayerButtons(players) {
        return players;
    },

    async loadPlayerOptions(force = false) {
        if (this.playerOptionsLoaded && !force) return;
        const teamSelect = document.getElementById("reference-team-select");
        if (!teamSelect) return;
        try {
            const data = await API.getPlayerOptions();
            this.playerOptions = Array.isArray(data?.teams) ? data.teams : [];
            teamSelect.innerHTML = this.playerOptions.map((team) => `
                <option value="${escapeHtml(team.id)}">${escapeHtml(team.name || "-")}</option>
            `).join("");
            const defaultTeam = this.playerOptions.find((team) => /denver nuggets/i.test(String(team.name || ""))) || this.playerOptions[0];
            if (defaultTeam) {
                teamSelect.value = String(defaultTeam.id);
                const defaultPlayer = (defaultTeam.players || []).find((player) => /nikola jokic/i.test(String(player.name || "")));
                this.populateReferencePlayers(defaultTeam.id, defaultPlayer?.id || "");
            }
            this.playerOptionsLoaded = true;
            this.renderReferenceSearchResults();
        } catch (error) {
            console.error("Player options load error:", error);
        }
    },

    async searchPlayerReference() {
        const playerSelect = document.getElementById("reference-player-select");
        const container = document.getElementById("player-reference-list");
        if (!playerSelect || !playerSelect.value) return;
        if (container) {
            container.innerHTML = '<div class="loading"><div class="spinner"></div>Loading...</div>';
        }
        try {
            const data = await API.getPlayerReference(playerSelect.value);
            Render.playerReference(data);
            this.playerReferenceLoaded = true;
        } catch (error) {
            console.error("Player reference search error:", error);
            if (container) {
                container.innerHTML = '<div class="trend-empty">Load failed</div>';
            }
        }
    },

    bindEvents() {
        document.addEventListener("click", (event) => {
            const navButton = event.target.closest(".nav-tab");
            if (navButton) {
                const page = navButton.dataset.page || "home";
                this.showPage(page);
                if (page === "injuries") {
                    this.loadInjuries();
                } else if (page === "reference") {
                    this.loadPlayerOptions();
                    this.loadPlayerReference();
                } else if (page === "other") {
                    this.loadOther();
                }
                return;
            }

            if (event.target.closest("#reference-search-btn")) {
                this.searchPlayerReference();
                return;
            }

            const searchItem = event.target.closest(".reference-search-item");
            if (searchItem) {
                this.applyReferenceSearchSelection(
                    searchItem.dataset.teamId,
                    searchItem.dataset.playerId,
                    searchItem.dataset.playerName || ""
                );
                return;
            }

            const transferDirectionButton = event.target.closest(".trend-switch-btn");
            if (transferDirectionButton) {
                this.transferDirection = String(transferDirectionButton.dataset.transferDirection || "in");
                document.querySelectorAll(".trend-switch-btn").forEach((button) => {
                    button.classList.toggle("active", button.dataset.transferDirection === this.transferDirection);
                });
                Render.transferTrends(this.latestTransferTrends || {});
                return;
            }

            const positionButton = event.target.closest(".reference-pos-btn");
            if (positionButton) {
                this.referencePositionFilter = String(positionButton.dataset.referencePosition || "ALL");
                document.querySelectorAll(".reference-pos-btn").forEach((button) => {
                    button.classList.toggle("active", button.dataset.referencePosition === this.referencePositionFilter);
                });
                const teamSelect = document.getElementById("reference-team-select");
                this.populateReferencePlayers(teamSelect?.value || "");
                return;
            }

            const lineupModeButton = event.target.closest(".lineup-mode-btn");
            if (lineupModeButton) {
                const mode = lineupModeButton.dataset.lineupMode || "today";
                setLineupMode(mode);
                return;
            }

            const gameItem = event.target.closest(".js-game-item");
            if (gameItem) {
                this.showGameDetail(gameItem.dataset.fixtureId);
                return;
            }

            const lineupTrigger = event.target.closest(".js-open-lineup");
            if (lineupTrigger) {
                this.showLineupDual(
                    lineupTrigger.dataset.uid1,
                    lineupTrigger.dataset.name1,
                    lineupTrigger.dataset.uid2,
                    lineupTrigger.dataset.name2
                );
                return;
            }

            const transferTrigger = event.target.closest(".js-transfer-toggle");
            if (transferTrigger) {
                this.toggleTransferPanel(
                    event,
                    transferTrigger.dataset.panelId,
                    transferTrigger.dataset.uid,
                    transferTrigger.dataset.team,
                    transferTrigger.dataset.side || "left"
                );
            }
        });

        document.addEventListener("change", (event) => {
            if (event.target?.id === "reference-team-select") {
                this.populateReferencePlayers(event.target.value);
            }
        });

        document.addEventListener("input", (event) => {
            if (event.target?.id === "reference-player-search") {
                this.renderReferenceSearchResults();
            }
        });

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                document.getElementById("lineup-modal")?.classList.remove("active");
                document.getElementById("game-modal")?.classList.remove("active");
            }
        });
    },

    init() {
        document.addEventListener("DOMContentLoaded", () => {
            this.bindEvents();
            this.loadAll();
        });
    },
};

function closeModal(event, modalId) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById(modalId)?.classList.remove("active");
}

window.App = App;
window.closeModal = closeModal;
window.manualRefresh = () => App.manualRefresh();
window.setLineupMode = setLineupMode;

App.init();

