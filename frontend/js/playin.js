(function () {
    const API_BASE = (window.__API_BASE__ || "").trim().replace(/\/+$/, "");
    const DEFAULT_VIEW = "total";

    const state = {
        payload: null,
        activeView: DEFAULT_VIEW,
        expandedManagers: new Set(),
        previousRanks: {
            total: {},
            day1: {},
            day2: {},
        },
        currentRanks: {
            total: {},
            day1: {},
            day2: {},
        },
        refreshTimer: null,
    };

    function refs() {
        return {
            board: document.getElementById("playin-board"),
            schedule: document.getElementById("playin-schedule"),
            status: document.getElementById("playin-status"),
            switchRoot: document.getElementById("playin-view-switch"),
            updateTime: document.getElementById("update-time"),
            gameModal: document.getElementById("game-modal"),
            gameBody: document.getElementById("game-body"),
            gameTitle: document.getElementById("game-title"),
        };
    }

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function formatScore(value) {
        const number = Number(value || 0);
        return number.toFixed(number % 1 === 0 ? 0 : 1);
    }

    function formatGameMeta(game) {
        const timeLabel = String(game?.beijingDateTimeLabel || game?.status || "").trim();
        const statusLabel = String(game?.status || "").trim();
        if (Number(game?.gameStatus || 0) === 1) {
            return timeLabel;
        }
        if (timeLabel && statusLabel && timeLabel !== statusLabel) {
            return `${timeLabel} · ${statusLabel}`;
        }
        return timeLabel || statusLabel;
    }

    function initialsFromName(name) {
        const clean = String(name || "").trim();
        if (!clean) return "NBA";
        if (/[\u4e00-\u9fff]/.test(clean)) {
            return clean.slice(-2);
        }
        return clean
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0].toUpperCase())
            .join("");
    }

    function getLeaderboardUrl() {
        return `${API_BASE}/api/playin-leaderboard?_=${Date.now()}`;
    }

    function getGameDetailUrl(gameId) {
        return `${API_BASE}/api/playin-game?gameId=${encodeURIComponent(gameId)}&_=${Date.now()}`;
    }

    function getSortedEntries(viewKey) {
        const entries = Array.isArray(state.payload?.entries) ? state.payload.entries : [];
        return [...entries].sort((left, right) => {
            const leftScore = Number(left?.scores?.[viewKey] || 0);
            const rightScore = Number(right?.scores?.[viewKey] || 0);
            if (rightScore !== leftScore) return rightScore - leftScore;
            return Number(right?.scores?.total || 0) - Number(left?.scores?.total || 0)
                || String(left?.manager_name || "").localeCompare(String(right?.manager_name || ""), "zh-CN");
        });
    }

    function buildRankMap(entries) {
        return entries.reduce((accumulator, entry, index) => {
            accumulator[String(entry?.manager_key || index)] = index + 1;
            return accumulator;
        }, {});
    }

    function getRankDelta(managerKey, viewKey, currentRank) {
        const previousRank = state.previousRanks?.[viewKey]?.[managerKey];
        if (!previousRank) return { text: "NEW", className: "same" };
        const movement = previousRank - currentRank;
        if (movement > 0) return { text: `↑${movement}`, className: "up" };
        if (movement < 0) return { text: `↓${Math.abs(movement)}`, className: "down" };
        return { text: "—", className: "same" };
    }

    function getPlayerBucket(player, viewKey) {
        return player?.scores?.[viewKey] || {
            raw: 0,
            effective: 0,
            played: false,
            counted: false,
            status: "dnp",
            subbedInFor: null,
            captainApplied: false,
            stats: { points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0 },
        };
    }

    function getPlayerCardClass(player, viewKey) {
        if (viewKey === "total") {
            const day1 = getPlayerBucket(player, "day1");
            const day2 = getPlayerBucket(player, "day2");
            if (day1.status === "sub" || day2.status === "sub") return "is-sub";
            if (day1.counted || day2.counted) return "is-counted";
            return "is-dnp";
        }
        const bucket = getPlayerBucket(player, viewKey);
        if (bucket.status === "sub") return "is-sub";
        if (bucket.counted) return "is-counted";
        return "is-dnp";
    }

    function describePlayerStatus(player, viewKey) {
        if (viewKey === "total") {
            const day1 = getPlayerBucket(player, "day1");
            const day2 = getPlayerBucket(player, "day2");
            if (day1.effective > 0 || day2.effective > 0) {
                return `D1 ${formatScore(day1.effective)} · D2 ${formatScore(day2.effective)}`;
            }
            if (day1.raw > 0 || day2.raw > 0) {
                return `未计入 · D1 ${formatScore(day1.raw)} · D2 ${formatScore(day2.raw)}`;
            }
            return "未出场";
        }

        const bucket = getPlayerBucket(player, viewKey);
        if (bucket.status === "sub") {
            return `替补递补 · 顶替首发 #${bucket.subbedInFor}`;
        }
        if (bucket.status === "counted") {
            return bucket.captainApplied ? "计分中 · 队长 1.5x" : "计分中";
        }
        if (bucket.raw > 0) {
            return "已出场 · 未计入";
        }
        return "未出场";
    }

    function renderPlayerCard(player) {
        const bucket = getPlayerBucket(player, state.activeView);
        const displayScore = state.activeView === "total"
            ? player?.scores?.total?.effective
            : (bucket.effective || bucket.raw);

        return `
            <div class="playin-player-card ${getPlayerCardClass(player, state.activeView)}">
                ${player?.is_captain ? '<span class="playin-captain-chip">C</span>' : ""}
                <div class="playin-player-top">
                    ${player?.headshot_url
                        ? `<img class="playin-player-avatar" src="${escapeHtml(player.headshot_url)}" alt="${escapeHtml(player.display_name || "")}" data-fallback="${escapeHtml(initialsFromName(player.display_name || player.english_name || ""))}" loading="lazy" decoding="async" onerror="this.onerror=null;const fallback=document.createElement('span');fallback.className='playin-player-avatar-fallback';fallback.textContent=this.getAttribute('data-fallback')||'NBA';this.replaceWith(fallback);">`
                        : `<span class="playin-player-avatar-fallback">${escapeHtml(initialsFromName(player.display_name || player.english_name || ""))}</span>`}
                    <div class="playin-player-copy">
                        <div class="playin-player-name">${escapeHtml(player?.display_name || player?.english_name || "-")}</div>
                        <div class="playin-player-team">
                            <img src="${escapeHtml(player?.team_logo_url || "/nba-team-logos/_.png")}" alt="" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='/nba-team-logos/_.png';">
                            <span>${escapeHtml(player?.team_name_cn || player?.team_name_en || player?.team_code || "NBA")}</span>
                        </div>
                    </div>
                </div>
                <div class="playin-player-score">
                    <div>
                        <div class="playin-player-score-label">${state.activeView === "total" ? "总计" : "本页计分"}</div>
                        <div class="playin-player-score-value">${escapeHtml(formatScore(displayScore || 0))}</div>
                    </div>
                    <div class="playin-player-score-label">${player?.price ? `$${Number(player.price).toFixed(1)}` : ""}</div>
                </div>
                <div class="playin-player-meta">${escapeHtml(describePlayerStatus(player, state.activeView))}</div>
            </div>
        `;
    }

    function renderRoster(entry) {
        const starters = (entry?.roster || []).filter((player) => player.role === "starter");
        const bench = (entry?.roster || []).filter((player) => player.role === "bench");
        return `
            <div class="playin-drawer">
                <div class="playin-drawer-grid">
                    <section class="playin-roster-block">
                        <div class="playin-roster-title">
                            <div class="playin-roster-heading">首发</div>
                            <div class="playin-roster-note">未出场球员按替补顺序递补</div>
                        </div>
                        <div class="playin-player-row">
                            ${starters.map(renderPlayerCard).join("")}
                        </div>
                    </section>
                    <section class="playin-roster-block">
                        <div class="playin-roster-title">
                            <div class="playin-roster-heading">替补</div>
                            <div class="playin-roster-note">卡片已压缩，移动端保持一行五张</div>
                        </div>
                        <div class="playin-player-row">
                            ${bench.map(renderPlayerCard).join("")}
                        </div>
                    </section>
                </div>
            </div>
        `;
    }

    function renderBoard() {
        const { board } = refs();
        if (!board) return;
        if (!state.payload) {
            board.innerHTML = '<div class="playin-empty">附加赛排行榜加载失败。</div>';
            return;
        }

        const entries = getSortedEntries(state.activeView);
        const subtitle = state.payload?.views?.[state.activeView]?.subtitle || "";

        board.innerHTML = `
            <div class="playin-board-intro">
                <div>
                    <div class="playin-board-title">${escapeHtml(state.payload?.views?.[state.activeView]?.label || "总分")}</div>
                    <div class="playin-board-subtitle">${escapeHtml(subtitle)}</div>
                </div>
            </div>
            ${entries.length ? entries.map((entry, index) => {
                const managerKey = String(entry?.manager_key || index);
                const rank = index + 1;
                const delta = getRankDelta(managerKey, state.activeView, rank);
                const expanded = state.expandedManagers.has(managerKey);
                return `
                    <article class="playin-manager ${expanded ? "is-open" : ""}" data-manager-key="${escapeHtml(managerKey)}">
                        <button class="playin-manager-header" type="button" data-manager-toggle="${escapeHtml(managerKey)}">
                            <div class="playin-rank-badge">
                                <div class="playin-rank-number">#${rank}</div>
                                <div class="playin-rank-delta ${delta.className}">${escapeHtml(delta.text)}</div>
                            </div>
                            <div class="playin-manager-main">
                                <div class="playin-manager-name">
                                    <span>${escapeHtml(entry?.manager_name || "-")}</span>
                                    <span class="playin-pill">${escapeHtml(`${entry?.roster_size || 0}/10`)}</span>
                                    ${entry?.is_complete ? "" : '<span class="playin-pill warn">阵容未满</span>'}
                                </div>
                                <div class="playin-manager-split">
                                    <span>Day 1 ${escapeHtml(formatScore(entry?.scores?.day1 || 0))}</span>
                                    <span>Day 2 ${escapeHtml(formatScore(entry?.scores?.day2 || 0))}</span>
                                </div>
                            </div>
                            <div class="playin-score-panel">
                                <div class="playin-score-label">${escapeHtml(state.payload?.views?.[state.activeView]?.label || "总分")}</div>
                                <div class="playin-score-value">${escapeHtml(formatScore(entry?.scores?.[state.activeView] || 0))}</div>
                                <div class="playin-score-arrow">⌄</div>
                            </div>
                        </button>
                        ${expanded ? renderRoster(entry) : ""}
                    </article>
                `;
            }).join("") : '<div class="playin-empty">当前还没有可展示的附加赛参赛阵容。</div>'}
        `;
    }

    function renderSchedule() {
        const { schedule } = refs();
        if (!schedule) return;
        if (!state.payload?.schedule?.games?.length) {
            schedule.innerHTML = '<div class="playin-empty">官方附加赛赛程暂未发布。</div>';
            return;
        }

        const groups = state.payload.schedule.games.reduce((accumulator, game) => {
            const key = `${game.beijingDateLabel || game.displayDate}-${game.bucketKey}`;
            if (!accumulator[key]) {
                accumulator[key] = {
                    bucketKey: game.bucketKey,
                    dateLabel: game.beijingDateLabel || game.displayDate,
                    games: [],
                };
            }
            accumulator[key].games.push(game);
            return accumulator;
        }, {});

        schedule.innerHTML = Object.values(groups).map((group) => `
            <section class="playin-schedule-group">
                <div class="playin-schedule-day">
                    <div class="playin-schedule-label">${escapeHtml(group.bucketKey === "day2" ? "第二轮" : "第一轮")}</div>
                    <div class="playin-schedule-date">${escapeHtml(`北京时间 ${group.dateLabel}`)}</div>
                </div>
                <div class="playin-schedule-list">
                    ${group.games.map((game) => `
                        <button class="playin-schedule-game ${Number(game?.gameStatus || 0) === 2 ? "is-live" : ""}" type="button" data-playin-game-id="${escapeHtml(game.gameId)}">
                            <div class="playin-schedule-scoreline">
                                <div class="playin-schedule-team-wrap">
                                    <img class="playin-schedule-team-logo" src="${escapeHtml(game.awayTeam?.logoUrl || "/nba-team-logos/_.png")}" alt="" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='/nba-team-logos/_.png';">
                                    <span class="playin-schedule-team-name">${escapeHtml(game.awayTeam?.fullName || "TBD")}</span>
                                </div>
                                <span class="playin-schedule-score">${escapeHtml(String(game.awayTeam?.score ?? 0))}</span>
                            </div>
                            <div class="playin-schedule-scoreline">
                                <div class="playin-schedule-team-wrap">
                                    <img class="playin-schedule-team-logo" src="${escapeHtml(game.homeTeam?.logoUrl || "/nba-team-logos/_.png")}" alt="" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='/nba-team-logos/_.png';">
                                    <span class="playin-schedule-team-name">${escapeHtml(game.homeTeam?.fullName || "TBD")}</span>
                                </div>
                                <span class="playin-schedule-score">${escapeHtml(String(game.homeTeam?.score ?? 0))}</span>
                            </div>
                            <div class="playin-schedule-meta">
                                <span>${escapeHtml(game.conference || "")}</span>
                                <span>${escapeHtml(formatGameMeta(game))}</span>
                            </div>
                        </button>
                    `).join("")}
                </div>
            </section>
        `).join("");
    }

    function updateSwitchState() {
        refs().switchRoot?.querySelectorAll(".playin-switch-btn").forEach((button) => {
            button.classList.toggle("active", button.dataset.playinView === state.activeView);
        });
    }

    function updateHeaderStatus(message) {
        const { status, updateTime } = refs();
        if (status) {
            status.textContent = message;
        }
        if (updateTime) {
            const now = new Date();
            const timeText = now.toLocaleTimeString("zh-CN", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: false,
            });
            updateTime.textContent = `Play-In · ${timeText}`;
        }
    }

    async function fetchJson(url) {
        const response = await fetch(url, { cache: "no-store" });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || payload?.success === false) {
            throw new Error(payload?.error || `Request failed: ${response.status}`);
        }
        return payload;
    }

    function clearRefreshTimer() {
        if (state.refreshTimer) {
            clearTimeout(state.refreshTimer);
            state.refreshTimer = null;
        }
    }

    function scheduleRefresh() {
        clearRefreshTimer();
        const delay = Number(state.payload?.refresh?.interval_ms || 120000);
        state.refreshTimer = window.setTimeout(loadLeaderboard, Math.max(30000, delay));
    }

    function renderGameDetail(payload) {
        const { gameBody, gameTitle, gameModal } = refs();
        if (!gameBody || !gameTitle || !gameModal) return;

        const createTable = (players, teamName, logoUrl) => `
            <div class="team-section">
                <h3 class="team-section-title">
                    <img class="team-section-logo" src="${escapeHtml(logoUrl || "/nba-team-logos/_.png")}" alt="${escapeHtml(teamName)} logo" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='/nba-team-logos/_.png';">
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
                                <td class="player-name">${escapeHtml(player.name || "-")}</td>
                                <td>${escapeHtml(player.position_name || "-")}</td>
                                <td>${escapeHtml(player.points ?? 0)}</td>
                                <td>${escapeHtml(player.rebounds ?? 0)}</td>
                                <td>${escapeHtml(player.assists ?? 0)}</td>
                                <td>${escapeHtml(player.steals ?? 0)}</td>
                                <td>${escapeHtml(player.blocks ?? 0)}</td>
                                <td class="fantasy-score">${escapeHtml(formatScore(player.fantasy ?? 0))}</td>
                            </tr>
                        `).join("")}
                    </tbody>
                </table>
            </div>
        `;

        gameTitle.textContent = payload?.title || "Game Details";
        gameBody.innerHTML = `
            <div class="playin-game-note">
                <span>${escapeHtml(payload?.game_time_bj || "")}</span>
                <span>${escapeHtml(payload?.game_status_text || "")}</span>
                <span>${escapeHtml(`${payload?.away_score ?? 0} - ${payload?.home_score ?? 0}`)}</span>
            </div>
            <div class="game-detail-container">
                ${createTable(payload?.away_players || [], payload?.away_team || "Away", payload?.away_logo_url || "")}
                ${createTable(payload?.home_players || [], payload?.home_team || "Home", payload?.home_logo_url || "")}
            </div>
        `;
        gameModal.classList.add("active");
    }

    async function openGameDetail(gameId) {
        const { gameBody, gameTitle, gameModal } = refs();
        if (!gameBody || !gameTitle || !gameModal) return;
        gameTitle.textContent = "比赛详情";
        gameBody.innerHTML = '<div class="loading"><div class="spinner"></div>Loading...</div>';
        gameModal.classList.add("active");
        try {
            const payload = await fetchJson(getGameDetailUrl(gameId));
            renderGameDetail(payload);
        } catch (error) {
            console.error("Play-in game detail load failed:", error);
            gameBody.innerHTML = '<div class="playin-empty">比赛详情加载失败。</div>';
        }
    }

    async function loadLeaderboard() {
        try {
            updateHeaderStatus("正在同步附加赛实时积分...");
            const payload = await fetchJson(getLeaderboardUrl());
            state.previousRanks = state.currentRanks;
            state.payload = payload;
            state.currentRanks = {
                total: buildRankMap(getSortedEntries("total")),
                day1: buildRankMap(getSortedEntries("day1")),
                day2: buildRankMap(getSortedEntries("day2")),
            };
            renderSchedule();
            updateSwitchState();
            renderBoard();
            updateHeaderStatus(`已更新 ${payload?.schedule?.completed_games || 0}/${payload?.schedule?.total_games || 0} 场附加赛`);
            scheduleRefresh();
        } catch (error) {
            console.error("Play-in leaderboard load failed:", error);
            updateHeaderStatus("附加赛数据加载失败，稍后自动重试");
            if (refs().schedule) refs().schedule.innerHTML = '<div class="playin-empty">附加赛赛程加载失败。</div>';
            if (refs().board) refs().board.innerHTML = '<div class="playin-empty">排行榜暂时不可用，请稍后再试。</div>';
            clearRefreshTimer();
            state.refreshTimer = window.setTimeout(loadLeaderboard, 180000);
        }
    }

    function bindEvents() {
        document.addEventListener("click", (event) => {
            const viewButton = event.target.closest(".playin-switch-btn");
            if (viewButton) {
                state.activeView = viewButton.dataset.playinView || DEFAULT_VIEW;
                updateSwitchState();
                renderBoard();
                return;
            }

            const managerToggle = event.target.closest("[data-manager-toggle]");
            if (managerToggle) {
                const managerKey = managerToggle.dataset.managerToggle;
                if (!managerKey) return;
                if (state.expandedManagers.has(managerKey)) {
                    state.expandedManagers.delete(managerKey);
                } else {
                    state.expandedManagers.add(managerKey);
                }
                renderBoard();
                return;
            }

            const scheduleGame = event.target.closest("[data-playin-game-id]");
            if (scheduleGame) {
                openGameDetail(scheduleGame.dataset.playinGameId);
            }
        });
    }

    function init() {
        if (!refs().board || !refs().schedule) return;
        const eventInfo = document.getElementById("event-info");
        if (eventInfo) {
            eventInfo.textContent = "附加赛排行榜已上线。";
        }
        bindEvents();
        loadLeaderboard();
    }

    window.manualRefresh = () => loadLeaderboard();
    document.addEventListener("DOMContentLoaded", init);
}());
