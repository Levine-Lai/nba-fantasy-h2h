const API_BASE = (window.__API_BASE__ || "").trim().replace(/\/+$/, "");

const ErrorBanner = {
    show(message) {
        let banner = document.getElementById("error-banner");
        if (!banner) {
            banner = document.createElement("div");
            banner.id = "error-banner";
            banner.style.cssText = "display:none;background:#dc3545;color:#fff;padding:10px;text-align:center;position:fixed;top:0;left:0;right:0;z-index:10000;";
            document.body.insertBefore(banner, document.body.firstChild);
        }
        banner.textContent = message;
        banner.style.display = "block";
    },

    hide() {
        const banner = document.getElementById("error-banner");
        if (banner) banner.style.display = "none";
    },
};

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
            ErrorBanner.hide();
            return response;
        } catch (error) {
            console.error(`[API Error] ${url}`, error);
            ErrorBanner.show("Data load failed. Please refresh and try again.");
            throw error;
        }
    },

    async getGames() {
        return (await this.fetch("/api/fixtures")).json();
    },

    async getH2H() {
        return (await this.fetch("/api/h2h")).json();
    },

    async getH2HStandings() {
        return (await this.fetch("/api/h2h-standings")).json();
    },

    async getClassicRankings() {
        return (await this.fetch("/api/classic-rankings")).json();
    },

    async getGameDetail(fixtureId) {
        return (await this.fetch(`/api/fixture/${fixtureId}`)).json();
    },

    async getLineup(uid) {
        return (await this.fetch(`/api/picks/${uid}?fresh=1`)).json();
    },

    async getTransferTrends() {
        return (await this.fetch("/api/trends/transfers")).json();
    },

    async getFdr() {
        return (await this.fetch("/api/fdr")).json();
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

function formatOwnership(player) {
    const percent = Number(player?.ownership_percent);
    if (!Number.isFinite(percent)) return "";
    return `<span class="ownership-badge">${percent.toFixed(1)}%</span>`;
}

function renderTransferRecords(teamName, transferRecords, side = "left", captainUsed = null) {
    const rows = (transferRecords || []).map((record) => `
        <div class="transfer-record ${side === "right" ? "align-right" : ""}">
            <div class="transfer-day">${escapeHtml(record.day_label || "DAY?")}</div>
            <div class="transfer-move">${escapeHtml(record.move || "")}</div>
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

    switchPage(page) {
        document.getElementById("page-home")?.classList.toggle("active", page === "home");
        document.getElementById("page-rankings")?.classList.toggle("active", page === "rankings");
        document.getElementById("nav-home")?.classList.toggle("active", page === "home");
        document.getElementById("nav-rankings")?.classList.toggle("active", page === "rankings");
    },

    transferTrends(data) {
        const transferIn = document.getElementById("trend-overall-in");
        const transferOut = document.getElementById("trend-overall-out");
        const ownership = document.getElementById("ownership-top");
        if (!transferIn || !transferOut || !ownership) return;

        const renderList = (items, emptyText, labelFn, valueFn) => {
            if (!items || items.length === 0) {
                return `<div class="trend-empty">${escapeHtml(emptyText)}</div>`;
            }

            return items.map((item, index) => `
                <div class="trend-item">
                    <span class="trend-rank">#${index + 1}</span>
                    <span class="trend-name">${labelFn(item)}</span>
                    <span class="trend-count">${valueFn(item)}</span>
                </div>
            `).join("");
        };

        const overallIn = data?.overall?.top_in || data?.global?.top_in || [];
        const overallOut = data?.overall?.top_out || data?.global?.top_out || [];
        const ownershipTop = data?.ownership_top || [];
        const managerCount = Number(data?.ownership_manager_count || 26);

        transferIn.innerHTML = renderList(overallIn, "No transfer-in trend data", (item) => escapeHtml(item.name), (item) => escapeHtml(item.count));
        transferOut.innerHTML = renderList(overallOut, "No transfer-out trend data", (item) => escapeHtml(item.name), (item) => escapeHtml(item.count));
        ownership.innerHTML = renderList(
            ownershipTop,
            "No ownership data",
            (item) => `${escapeHtml(item.name)} (${item.holder_count}/${managerCount})`,
            (item) => `${Number(item.ownership_percent || 0).toFixed(1)}%`
        );
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
        this.leagueAverages(data?.daily_averages);
    },

    leagueAverages(data) {
        const avgToday = document.getElementById("avg-today-count");
        const avgEffective = document.getElementById("avg-effective-count");
        if (!avgToday || !avgEffective) return;

        avgToday.textContent = Number.isFinite(Number(data?.today_average_count)) ? Number(data.today_average_count).toFixed(2) : "-";
        avgEffective.textContent = Number.isFinite(Number(data?.effective_average_count)) ? Number(data.effective_average_count).toFixed(2) : "-";
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
                            <span class="game-team">${escapeHtml(game.away_team)}</span>
                            <span class="game-score ${awayClass}">${game.away_score}</span>
                        </div>
                        <div class="game-row">
                            <span class="game-team">${escapeHtml(game.home_team)}</span>
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

        container.innerHTML = matches.map((match) => {
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

            return `
                <div class="match-block">
                    <div class="match-card">
                        <div class="team-side ${leftClass} ${leftMuted} js-transfer-toggle" data-panel-id="${leftPanelId}" data-uid="${match.uid1}" data-team="${escapeHtml(match.t1)}" data-side="left">
                            <div class="team-name">${escapeHtml(match.t1)}</div>
                            <div class="score-main ${leftClass}">${leftScore}</div>
                            <div class="score-sub">Today ${match.today1}</div>
                            <div class="score-prob">Win ${Number(match.win_prob1 || 50)}%</div>
                        </div>
                        <div class="vs-divider js-open-lineup" data-uid1="${match.uid1}" data-name1="${escapeHtml(match.t1)}" data-uid2="${match.uid2}" data-name2="${escapeHtml(match.t2)}">
                            <div class="vs-text">VS</div>
                            <div class="match-diff">Diff: ${Math.abs(Number(match.diff || 0))}</div>
                        </div>
                        <div class="team-side ${rightClass} ${rightMuted} js-transfer-toggle" data-panel-id="${rightPanelId}" data-uid="${match.uid2}" data-team="${escapeHtml(match.t2)}" data-side="right">
                            <div class="team-name">${escapeHtml(match.t2)}</div>
                            <div class="score-main ${rightClass}">${rightScore}</div>
                            <div class="score-sub">Today ${match.today2}</div>
                            <div class="score-prob">Win ${Number(match.win_prob2 || 50)}%</div>
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

    h2hStandings(rows) {
        const body = document.getElementById("rankings-body");
        if (!body) return;

        if (!rows || rows.length === 0) {
            body.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;">No standings data</td></tr>';
            return;
        }

        body.innerHTML = rows.map((row) => `
            <tr class="${row.live_applied ? "live-row" : ""}">
                <td>${row.rank}</td>
                <td class="team-cell">${escapeHtml(row.team_name)}</td>
                <td>${row.played}</td>
                <td>${row.won}</td>
                <td>${row.draw}</td>
                <td>${row.lost}</td>
                <td class="points-cell">${row.points}</td>
            </tr>
        `).join("");
    },

    classicRankings(rows) {
        const overallBody = document.getElementById("overall-rankings-body");
        const weeklyBody = document.getElementById("weekly-rankings-body");
        const overallBadge = document.getElementById("overall-rankings-badge");
        const weeklyBadge = document.getElementById("weekly-rankings-badge");
        if (!overallBody || !weeklyBody) return;

        if (overallBadge) overallBadge.textContent = "League";
        if (weeklyBadge && rows && rows.length > 0) {
            const week = rows[0]?.current_week;
            weeklyBadge.textContent = week ? `GW${week}` : "GW";
        }

        if (!rows || rows.length === 0) {
            overallBody.innerHTML = '<tr><td colspan="3" style="text-align:center;padding:20px;">No ranking data</td></tr>';
            weeklyBody.innerHTML = '<tr><td colspan="3" style="text-align:center;padding:20px;">No ranking data</td></tr>';
            return;
        }

        overallBody.innerHTML = rows.map((row) => `
            <tr>
                <td class="team-cell">${escapeHtml(row.team_name)}</td>
                <td>${row.overall_rank ?? "-"}</td>
                <td>${row.overall_score ?? "-"}</td>
            </tr>
        `).join("");

        const weeklyRows = [...rows].sort((a, b) => {
            const aRank = Number.isFinite(Number(a?.weekly_rank)) && Number(a.weekly_rank) > 0 ? Number(a.weekly_rank) : Number.MAX_SAFE_INTEGER;
            const bRank = Number.isFinite(Number(b?.weekly_rank)) && Number(b.weekly_rank) > 0 ? Number(b.weekly_rank) : Number.MAX_SAFE_INTEGER;
            return aRank - bRank || String(a.team_name || "").localeCompare(String(b.team_name || ""));
        });

        weeklyBody.innerHTML = weeklyRows.map((row) => `
            <tr>
                <td class="team-cell">${escapeHtml(row.team_name)}</td>
                <td>${row.weekly_rank ?? "-"}</td>
                <td>${row.weekly_score ?? "-"}</td>
            </tr>
        `).join("");
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

        const createTable = (players, teamName) => `
            <div class="team-section">
                <h3>${escapeHtml(teamName)}</h3>
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
                ${createTable(data.away_players, data.away_team)}
                ${createTable(data.home_players, data.home_team)}
            </div>
        `;
    },

    lineup(data, name, isDual = false, dualData = null, dualName = null) {
        const body = document.getElementById("lineup-body");
        const title = document.getElementById("lineup-title");
        if (!body) return;
        if (title) title.textContent = isDual ? `${name} VS ${dualName}` : `${name} Lineup`;

        const createPlayerCard = (player) => {
            const isCaptain = player.is_captain && Number(player.multiplier || 1) > 1;
            const badge = isCaptain ? '<span class="captain-badge">C</span>' : "";
            const injuryBadge = player.injury ? `<span class="injury-badge" title="${escapeHtml(player.injury)}">INJ ${escapeHtml(player.injury)}</span>` : "";
            const effectiveClass = player.is_effective ? "effective" : "ineffective";
            const posClass = player.position_name === "BC" ? "pos-BC" : "pos-FC";
            const ownership = formatOwnership(player);
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
                            ${Number(player?.stats?.points || 0)}分
                            ${Number(player?.stats?.rebounds || 0)}板
                            ${Number(player?.stats?.assists || 0)}助
                            ${Number(player?.stats?.steals || 0)}断
                            ${Number(player?.stats?.blocks || 0)}帽
                            ${value.toFixed(1)}value
                            ${ownership}
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

        if (isDual && dualData) {
            body.innerHTML = `
                <div class="dual-lineup-container">
                    ${createLineupSection(data, name)}
                    ${createLineupSection(dualData, dualName)}
                </div>
            `;
            return;
        }

        body.innerHTML = createLineupSection(data, name);
    },
};

const App = {
    lineupCache: new Map(),
    currentPage: "home",

    async getLineupCached(uid) {
        const key = String(uid);
        if (!this.lineupCache.has(key)) {
            this.lineupCache.set(key, API.getLineup(uid));
        }
        return this.lineupCache.get(key);
    },

    async hydrateH2HMatches(matches) {
        const safeMatches = Array.isArray(matches) ? matches.map((match) => ({ ...match })) : [];
        const uidSet = new Set();
        for (const match of safeMatches) {
            if (match?.uid1) uidSet.add(String(match.uid1));
            if (match?.uid2) uidSet.add(String(match.uid2));
        }

        const uidList = [...uidSet];
        const lineupByUid = {};
        const batchSize = 4;

        for (let index = 0; index < uidList.length; index += batchSize) {
            const batch = uidList.slice(index, index + batchSize);
            const batchResults = await Promise.all(batch.map(async (uid) => {
                try {
                    const payload = await API.getLineup(uid);
                    this.lineupCache.set(String(uid), Promise.resolve(payload));
                    return [uid, payload];
                } catch {
                    return [uid, null];
                }
            }));

            for (const [uid, payload] of batchResults) {
                if (payload) lineupByUid[String(uid)] = payload;
            }
        }

        return safeMatches.map((match) => {
            const left = lineupByUid[String(match.uid1)];
            const right = lineupByUid[String(match.uid2)];
            const total1 = Number(left?.event_total ?? match.total1 ?? 0);
            const total2 = Number(right?.event_total ?? match.total2 ?? 0);
            const today1 = Number(left?.total_live ?? match.today1 ?? 0);
            const today2 = Number(right?.total_live ?? match.today2 ?? 0);
            return {
                ...match,
                total1,
                total2,
                today1,
                today2,
                diff: Math.abs(total1 - total2),
            };
        });
    },

    async loadAll() {
        try {
            await Promise.all([
                this.loadGames(),
                this.loadH2H(),
                this.loadTrends(),
                this.loadFdr(),
                this.loadRankings(),
            ]);
            Render.updateTime();
        } catch (error) {
            console.error("LoadAll error:", error);
        }
    },

    async loadGames() {
        try {
            const data = await API.getGames();
            Render.gameCount(data.count || 0);
            if (data.event_name) Render.eventInfo(data.event_name);
            Render.gamesList(data.games || []);
        } catch (error) {
            console.error("Games error:", error);
        }
    },

    async loadH2H() {
        try {
            const data = await API.getH2H();
            const hydrated = await this.hydrateH2HMatches(data || []);
            Render.matchCount(hydrated.length || 0);
            Render.h2hList(hydrated || []);
        } catch (error) {
            console.error("H2H error:", error);
        }
    },

    async loadTrends() {
        try {
            Render.transferTrends(await API.getTransferTrends());
        } catch (error) {
            console.error("Trends error:", error);
        }
    },

    async loadFdr() {
        try {
            Render.fdr(await API.getFdr());
        } catch (error) {
            console.error("FDR error:", error);
            Render.fdr({
                weeks: [],
                html: '<tr><td colspan="5" style="text-align:center;padding:20px;">Load failed</td></tr>',
                daily_averages: { today_average_count: 0, effective_average_count: 0 },
            });
        }
    },

    async loadRankings() {
        try {
            const [h2hStandings, classicRankings] = await Promise.all([
                API.getH2HStandings(),
                API.getClassicRankings(),
            ]);
            Render.h2hStandings(h2hStandings);
            Render.classicRankings(classicRankings);
        } catch (error) {
            console.error("Standings error:", error);
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

    async showLineup(uid, name) {
        Render.modalLoading("lineup-modal", "lineup-body", "lineup-title", `${name} Lineup`);
        try {
            Render.lineup(await this.getLineupCached(uid), name);
        } catch (error) {
            console.error(error);
            Render.modalError("lineup-body");
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

    switchPage(page) {
        this.currentPage = page;
        Render.switchPage(page);
    },

    bindEvents() {
        document.addEventListener("click", (event) => {
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
            this.switchPage(this.currentPage);
            this.loadAll();
            setInterval(() => this.loadAll(), 60000);
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

App.init();
