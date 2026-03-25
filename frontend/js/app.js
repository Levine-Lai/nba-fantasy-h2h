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
            const res = await fetch(target, options);
            if (!res.ok) {
                if (res.status === 401) throw new Error("未授权访问");
                if (res.status === 500) throw new Error("服务器内部错误");
                throw new Error(`请求失败: ${res.status}`);
            }
            ErrorBanner.hide();
            return res;
        } catch (error) {
            console.error(`[API Error] ${url}`, error);
            ErrorBanner.show("数据加载失败，请刷新重试");
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

    async getGameDetail(fixtureId) {
        return (await this.fetch(`/api/fixture/${fixtureId}`)).json();
    },

    async getLineup(uid) {
        return (await this.fetch(`/api/picks/${uid}`)).json();
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
    return `<span class="ownership-badge">持有 ${percent.toFixed(1)}%</span>`;
}

function renderTransferRecords(teamName, transferRecords) {
    if (!transferRecords || transferRecords.length === 0) {
        return `
            <div class="transfer-panel-title">${escapeHtml(teamName)} 本周转会</div>
            <div class="trend-empty">本周暂无转会记录</div>
        `;
    }

    const rows = transferRecords.map((record) => `
        <div class="transfer-record">
            <div class="transfer-day">${escapeHtml(record.day_label || "DAY?")}</div>
            <div class="transfer-move">${escapeHtml(record.move || "")}</div>
            <div class="transfer-cost ${record.is_free ? "" : "penalty"}">${escapeHtml(record.cost_type || "")}</div>
        </div>
    `).join("");

    return `
        <div class="transfer-panel-title">${escapeHtml(teamName)} 本周转会</div>
        ${rows}
    `;
}

const Render = {
    updateTime() {
        const el = document.getElementById("update-time");
        if (el) {
            el.textContent = new Date().toLocaleTimeString("zh-CN", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
            });
        }
    },

    eventInfo(name) {
        const el = document.getElementById("event-info");
        if (el) el.textContent = `${name} - League #1653`;
    },

    gameCount(count) {
        const el = document.getElementById("game-count");
        if (el) el.textContent = `${count}场`;
    },

    matchCount(count) {
        const el = document.getElementById("match-count");
        if (el) el.textContent = `${count}场`;
    },

    refreshButton(state, text) {
        const btn = document.getElementById("refresh-btn");
        if (!btn) return;
        btn.disabled = state === "loading";
        btn.textContent = text;
    },

    switchPage(page) {
        document.getElementById("page-home")?.classList.toggle("active", page === "home");
        document.getElementById("page-rankings")?.classList.toggle("active", page === "rankings");
        document.getElementById("nav-home")?.classList.toggle("active", page === "home");
        document.getElementById("nav-rankings")?.classList.toggle("active", page === "rankings");
    },

    transferTrends(data) {
        const inEl = document.getElementById("trend-overall-in");
        const outEl = document.getElementById("trend-overall-out");
        const ownershipEl = document.getElementById("ownership-top");
        if (!inEl || !outEl || !ownershipEl) return;

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

        inEl.innerHTML = renderList(overallIn, "No transfer-in trend data", (item) => escapeHtml(item.name), (item) => escapeHtml(item.count));
        outEl.innerHTML = renderList(overallOut, "No transfer-out trend data", (item) => escapeHtml(item.name), (item) => escapeHtml(item.count));
        ownershipEl.innerHTML = renderList(
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
            container.innerHTML = '<div style="text-align:center;padding:40px;color:#999;">暂无比赛</div>';
            return;
        }

        container.innerHTML = games.map((game) => {
            const status = game.status_label || (game.finished ? "已结束" : (game.started ? "进行中" : "未开始"));
            const homeClass = game.home_score > game.away_score ? "winning" : (game.home_score < game.away_score ? "losing" : "");
            const awayClass = game.away_score > game.home_score ? "winning" : (game.away_score < game.home_score ? "losing" : "");

            return `
                <div class="game-item js-game-item" data-fixture-id="${game.id}">
                    <div class="game-teams">
                        <div class="game-row">
                            <span class="game-team">${escapeHtml(game.home_team)}</span>
                            <span class="game-score ${homeClass}">${game.home_score}</span>
                        </div>
                        <div class="game-row">
                            <span class="game-team">${escapeHtml(game.away_team)}</span>
                            <span class="game-score ${awayClass}">${game.away_score}</span>
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
            const isLeftWin = match.total1 > match.total2;
            const isDraw = match.total1 === match.total2;
            const leftClass = isDraw ? "" : (isLeftWin ? "winning" : "losing");
            const rightClass = isDraw ? "" : (isLeftWin ? "losing" : "winning");
            const leftMuted = !isDraw && !isLeftWin ? "is-behind" : "";
            const rightMuted = !isDraw && isLeftWin ? "is-behind" : "";
            const leftPanelId = `transfers-${match.uid1}-${match.uid2}-left`;
            const rightPanelId = `transfers-${match.uid1}-${match.uid2}-right`;

            return `
                <div class="match-card">
                    <div class="team-side ${leftClass} ${leftMuted} js-transfer-toggle" data-panel-id="${leftPanelId}" data-uid="${match.uid1}" data-team="${escapeHtml(match.t1)}">
                        <div class="team-name">${escapeHtml(match.t1)}</div>
                        <div class="score-main ${leftClass}">${match.total1}</div>
                        <div class="score-sub">今日 ${match.today1}</div>
                    </div>
                    <div class="vs-divider js-open-lineup" data-uid1="${match.uid1}" data-name1="${escapeHtml(match.t1)}" data-uid2="${match.uid2}" data-name2="${escapeHtml(match.t2)}">
                        <div>VS</div>
                        <div class="match-diff">DIFF ${Math.abs(match.diff || 0)}</div>
                    </div>
                    <div class="team-side ${rightClass} ${rightMuted} js-transfer-toggle" data-panel-id="${rightPanelId}" data-uid="${match.uid2}" data-team="${escapeHtml(match.t2)}">
                        <div class="team-name">${escapeHtml(match.t2)}</div>
                        <div class="score-main ${rightClass}">${match.total2}</div>
                        <div class="score-sub">今日 ${match.today2}</div>
                    </div>
                </div>
                <div class="match-transfer-wrap">
                    <div id="${leftPanelId}" class="match-transfer-panel"></div>
                    <div id="${rightPanelId}" class="match-transfer-panel"></div>
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
                <td>${row.points}</td>
                <td>${row.won}</td>
                <td>${row.draw}</td>
                <td>${row.lost}</td>
                <td>${row.played}</td>
            </tr>
        `).join("");
    },

    modalLoading(modalId, bodyId, titleId, title) {
        const modal = document.getElementById(modalId);
        const body = document.getElementById(bodyId);
        const titleEl = titleId ? document.getElementById(titleId) : null;
        if (modal) modal.classList.add("active");
        if (body) body.innerHTML = '<div class="loading"><div class="spinner"></div>加载中...</div>';
        if (titleEl && title) titleEl.textContent = title;
    },

    modalError(bodyId, message = "加载失败") {
        const body = document.getElementById(bodyId);
        if (body) body.innerHTML = `<div style="text-align:center;padding:20px;">${escapeHtml(message)}</div>`;
    },

    gameDetail(data) {
        const body = document.getElementById("game-body");
        const title = document.getElementById("game-title");
        if (!data.home_players) {
            this.modalError("game-body", "暂无数据");
            return;
        }

        if (title) title.textContent = `${data.away_team} @ ${data.home_team}`;

        const createTable = (players, teamName) => `
            <div class="team-section">
                <h3>${escapeHtml(teamName)}</h3>
                <table class="stats-table">
                    <thead>
                        <tr>
                            <th>球员</th>
                            <th>位置</th>
                            <th>得分</th>
                            <th>篮板</th>
                            <th>助攻</th>
                            <th>抢断</th>
                            <th>盖帽</th>
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

        if (body) {
            body.innerHTML = `
                <div class="game-detail-container">
                    ${createTable(data.away_players, data.away_team)}
                    ${createTable(data.home_players, data.home_team)}
                </div>
            `;
        }
    },

    lineup(data, name, isDual = false, dualData = null, dualName = null) {
        const body = document.getElementById("lineup-body");
        const title = document.getElementById("lineup-title");
        if (title) title.textContent = isDual ? `${name} VS ${dualName}` : `${name} 的阵容`;

        const createPlayerCard = (player) => {
            const isCaptain = player.is_captain && player.multiplier > 1;
            const badge = isCaptain ? '<span class="captain-badge">C</span>' : "";
            const injuryBadge = player.injury ? `<span class="injury-badge" title="${escapeHtml(player.injury)}">伤 ${escapeHtml(player.injury)}</span>` : "";
            const effectiveClass = player.is_effective ? "effective" : "ineffective";
            const posClass = player.position_name === "BC" ? "pos-BC" : "pos-FC";
            const ownership = formatOwnership(player);

            return `
                <div class="player-card ${effectiveClass}">
                    <div class="pos-badge ${posClass}">${escapeHtml(player.position_name)}</div>
                    <div class="player-info">
                        <div class="player-name-row">
                            <div class="player-name">${escapeHtml(player.name)}</div>
                            ${badge}
                            ${injuryBadge}
                        </div>
                        <div class="player-stats">
                            ${player.stats.points}分 ${player.stats.rebounds}板 ${player.stats.assists}助 ${player.stats.steals}断 ${player.stats.blocks}帽
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
            if (!lineupData.players || lineupData.players.length === 0) {
                return '<div style="text-align:center;padding:20px;">暂无数据</div>';
            }

            const starters = lineupData.players.filter((player) => player.lineup_position <= 5);
            const bench = lineupData.players.filter((player) => player.lineup_position > 5);
            const penaltyLine = lineupData.penalty_score > 0
                ? `<div class="score-sub" style="color:#ff6b6b;">- ${lineupData.penalty_score} Transfer Penalty (${lineupData.transfer_count} transfers)</div>`
                : "";
            const wildcardLine = lineupData.wildcard_active
                ? '<div class="score-sub" style="color:#4ade80;">Wildcard Active</div>'
                : "";

            return `
                <div class="${isDual ? "dual-lineup-side" : ""}">
                    ${isDual ? `
                        <div class="dual-lineup-header">
                            <div class="dual-team-name">${escapeHtml(teamName)}</div>
                            <div class="dual-team-score">${lineupData.total_live}</div>
                            <div class="score-sub">总分 ${lineupData.event_total || 0}</div>
                            ${penaltyLine}
                            ${wildcardLine}
                        </div>
                    ` : `
                        <div class="formation-info">今日得分: ${lineupData.total_live} | 总分: ${lineupData.event_total || 0}</div>
                        ${penaltyLine}
                        ${wildcardLine}
                    `}
                    <div class="lineup-container">
                        <div class="lineup-section starters">
                            <h4>首发</h4>
                            ${starters.map(createPlayerCard).join("")}
                        </div>
                        <div class="lineup-section bench">
                            <h4>替补</h4>
                            ${bench.map(createPlayerCard).join("")}
                        </div>
                    </div>
                </div>
            `;
        };

        if (!body) return;
        if (isDual && dualData) {
            body.innerHTML = `
                <div class="dual-lineup-container">
                    ${createLineupSection(data, name)}
                    ${createLineupSection(dualData, dualName)}
                </div>
            `;
        } else {
            body.innerHTML = createLineupSection(data, name);
        }
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
            Render.matchCount(data.length || 0);
            Render.h2hList(data || []);
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
            Render.h2hStandings(await API.getH2HStandings());
        } catch (error) {
            console.error("Standings error:", error);
        }
    },

    async toggleTransferPanel(event, panelId, uid, teamName) {
        event?.stopPropagation?.();
        const panel = document.getElementById(panelId);
        if (!panel) return;

        const isOpen = panel.classList.contains("active");
        document.querySelectorAll(".match-transfer-panel.active").forEach((item) => item.classList.remove("active"));
        if (isOpen) return;

        try {
            const data = await this.getLineupCached(uid);
            panel.innerHTML = renderTransferRecords(teamName, data.transfer_records || []);
            panel.classList.add("active");
        } catch (error) {
            console.error("Transfer panel error:", error);
            panel.innerHTML = `<div class="transfer-panel-title">${escapeHtml(teamName)} 本周转会</div><div class="trend-empty">加载失败</div>`;
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
        Render.modalLoading("lineup-modal", "lineup-body", "lineup-title", `${name} 的阵容`);
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
        Render.refreshButton("loading", "刷新中...");
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
                    transferTrigger.dataset.team
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
