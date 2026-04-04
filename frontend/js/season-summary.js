(function () {
    const PAGE_COUNT = 5;
    const INTRO_EXIT_MS = 860;
    const state = {
        currentPage: 0,
        lastUid: "",
    };

    function isStandalonePage() {
        return /\/season-summary\/?$/.test(window.location.pathname);
    }

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function refs() {
        return {
            shell: document.getElementById("season-summary-shell"),
            form: document.getElementById("season-summary-search-form"),
            uidInput: document.getElementById("season-summary-uid"),
            status: document.getElementById("season-summary-status"),
            pages: document.getElementById("season-summary-pages"),
            prevBtn: document.getElementById("season-summary-prev-btn"),
            nextBtn: document.getElementById("season-summary-next-btn"),
        };
    }

    function setStatus(message = "", type = "") {
        const { status } = refs();
        if (!status) return;
        status.className = `season-summary-status${type ? ` ${type}` : ""}`;
        status.textContent = message;
    }

    function setHasProfile(enabled) {
        refs().shell?.classList.toggle("has-profile", !!enabled);
    }

    function setIntroReady() {
        refs().shell?.classList.add("intro-ready");
    }

    function setIntroLoading(enabled) {
        refs().shell?.classList.toggle("intro-loading", !!enabled);
    }

    function setIntroLeaving(enabled) {
        refs().shell?.classList.toggle("intro-leaving", !!enabled);
    }

    function setProfileEntering(enabled) {
        refs().shell?.classList.toggle("profile-entering", !!enabled);
    }

    function updateIndicator() {
        document.querySelectorAll(".season-summary-page").forEach((page, index) => {
            page.classList.toggle("active", index === state.currentPage);
        });
        const { prevBtn, nextBtn } = refs();
        if (prevBtn) prevBtn.disabled = state.currentPage <= 0;
        if (nextBtn) nextBtn.disabled = state.currentPage >= PAGE_COUNT - 1;
    }

    function goToPage(nextPage) {
        state.currentPage = Math.max(0, Math.min(PAGE_COUNT - 1, Number(nextPage || 0)));
        updateIndicator();
    }

    function updateUrl(uid = "") {
        const url = new URL(window.location.href);
        if (isStandalonePage()) {
            url.searchParams.delete("page");
        } else {
            url.searchParams.set("page", "season-summary");
        }
        if (uid) {
            url.searchParams.set("uid", uid);
        } else {
            url.searchParams.delete("uid");
        }
        window.history.replaceState({}, "", url.toString());
    }

    async function requestSummary(uid) {
        const base = (window.__API_BASE__ || "").trim().replace(/\/+$/, "");
        const target = `${base}/api/season-summary?uid=${encodeURIComponent(uid)}`;
        const response = await fetch(target);
        const data = await response.json().catch(() => ({}));
        if (!response.ok || data?.success === false) {
            throw new Error(data?.error || `Request failed: ${response.status}`);
        }
        return data;
    }

    function renderStatsGrid(cards) {
        return `
            <div class="season-summary-grid-3">
                ${(Array.isArray(cards) ? cards : []).map((item) => `
                    <div class="season-summary-card">
                        <div class="season-summary-stat-label">${escapeHtml(item?.[0])}</div>
                        <div class="season-summary-stat-value">${escapeHtml(item?.[1])}</div>
                        <div class="season-summary-stat-note">${escapeHtml(item?.[2] || "")}</div>
                    </div>
                `).join("")}
            </div>
        `;
    }

    function renderRows(rows) {
        return `
            <div class="season-summary-row-list">
                ${(Array.isArray(rows) ? rows : []).map((item) => `
                    <div class="season-summary-row">
                        <div class="season-summary-row-key">${escapeHtml(item?.[0])}</div>
                        <div class="season-summary-row-value">${escapeHtml(item?.[1])}</div>
                    </div>
                `).join("")}
            </div>
        `;
    }

    function renderBullets(items) {
        return `<ul>${(Array.isArray(items) ? items : []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
    }

    function renderKpis(items) {
        return `
            <div class="season-summary-kpi-grid">
                ${(Array.isArray(items) ? items : []).map((item) => `
                    <div class="season-summary-kpi">
                        <div class="season-summary-mini-title">${escapeHtml(item?.[0])}</div>
                        <strong>${escapeHtml(item?.[1])}</strong>
                    </div>
                `).join("")}
            </div>
        `;
    }

    function renderBadges(items) {
        return `
            <div class="season-summary-badges">
                ${(Array.isArray(items) ? items : []).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
            </div>
        `;
    }

    function buildCurvePoints(points, options = {}) {
        const list = Array.isArray(points) && points.length ? points : [];
        if (!list.length) return [];
        const left = Number(options.left ?? 64);
        const right = Number(options.right ?? 856);
        const top = Number(options.top ?? 42);
        const bottom = Number(options.bottom ?? 526);
        const xMin = Math.min(...list.map((item) => Number(item?.event || 0)));
        const xMax = Math.max(...list.map((item) => Number(item?.event || 0)));
        const yMax = Number(options.yMax ?? Math.max(...list.map((item) => Number(item?.rank || 0)), 1));
        const xSpan = Math.max(1, xMax - xMin);
        const ySpan = Math.max(1, yMax);

        return list.map((item) => {
            const event = Number(item?.event || 0);
            const rank = Number(item?.rank || 0);
            return {
                x: left + ((event - xMin) / xSpan) * (right - left),
                y: top + (rank / ySpan) * (bottom - top),
                event,
                rank,
                gw: Number(item?.gw || 0) || null,
            };
        });
    }

    function buildLinePath(points) {
        return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ");
    }

    function buildAreaPath(points, bottom = 526) {
        if (!points.length) return "";
        const line = buildLinePath(points);
        const first = points[0];
        const last = points[points.length - 1];
        return `${line} L ${last.x.toFixed(2)} ${bottom} L ${first.x.toFixed(2)} ${bottom} Z`;
    }

    function buildNiceTicks(maxValue, targetTickCount = 5) {
        const safeMax = Math.max(1, Number(maxValue || 0));
        const roughStep = safeMax / Math.max(1, targetTickCount - 1);
        const magnitude = 10 ** Math.max(0, Math.floor(Math.log10(Math.max(1, roughStep))));
        const candidates = [1, 2, 5, 10].map((factor) => factor * magnitude);
        const step = candidates.find((value) => value >= roughStep) || candidates[candidates.length - 1];
        const ceiling = Math.ceil(safeMax / step) * step;
        const ticks = [];
        for (let value = 0; value <= ceiling; value += step) {
            ticks.push(value);
        }
        return ticks;
    }

    function sampleXAxisTicks(points, desiredCount = 7) {
        if (!points.length) return [];
        if (points.length <= desiredCount) return points;
        const sampled = [];
        for (let index = 0; index < desiredCount; index += 1) {
            const pointIndex = Math.round((index * (points.length - 1)) / Math.max(1, desiredCount - 1));
            sampled.push(points[pointIndex]);
        }
        return sampled;
    }

    function renderOrCurvePanel(profile) {
        const rawPoints = Array.isArray(profile?.cover?.or_curve) && profile.cover.or_curve.length
            ? profile.cover.or_curve
            : [
                { event: 1, gw: 1, rank: 1800 },
                { event: 20, gw: 4, rank: 1500 },
                { event: 45, gw: 8, rank: 1300 },
                { event: 78, gw: 12, rank: 980 },
                { event: 101, gw: 16, rank: 860 },
                { event: 126, gw: 20, rank: 720 },
                { event: 154, gw: 24, rank: 698 },
            ];
        const maxRank = Math.max(...rawPoints.map((item) => Number(item?.rank || 0)), 1);
        const points = buildCurvePoints(rawPoints, { yMax: maxRank, left: 64, right: 856, top: 42, bottom: 526 });
        const linePath = buildLinePath(points);
        const areaPath = buildAreaPath(points, 526);
        const rankTicks = buildNiceTicks(maxRank, 5);
        const xTicks = sampleXAxisTicks(points, 7);
        const yMax = Math.max(1, rankTicks[rankTicks.length - 1] || maxRank);

        return `
            <aside class="season-summary-cover-panel">
                <div class="season-summary-cover-chart">
                    <svg viewBox="0 0 880 560" preserveAspectRatio="none" aria-label="OR season curve">
                        <defs>
                            <linearGradient id="season-summary-cover-line" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stop-color="#93c5fd"></stop>
                                <stop offset="50%" stop-color="#60a5fa"></stop>
                                <stop offset="100%" stop-color="#2563eb"></stop>
                            </linearGradient>
                            <linearGradient id="season-summary-cover-fill" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stop-color="rgba(96, 165, 250, 0.28)"></stop>
                                <stop offset="100%" stop-color="rgba(96, 165, 250, 0)"></stop>
                            </linearGradient>
                        </defs>
                        <g class="season-summary-cover-grid">
                            ${rankTicks.map((tick) => {
                                const y = 42 + (Number(tick || 0) / yMax) * (526 - 42);
                                return `<line x1="64" y1="${y.toFixed(2)}" x2="856" y2="${y.toFixed(2)}"></line>`;
                            }).join("")}
                            ${xTicks.map((point) => `<line x1="${point.x.toFixed(2)}" y1="42" x2="${point.x.toFixed(2)}" y2="526"></line>`).join("")}
                        </g>
                        <line class="season-summary-cover-axis" x1="64" y1="42" x2="64" y2="526"></line>
                        <line class="season-summary-cover-axis" x1="64" y1="42" x2="856" y2="42"></line>
                        ${rankTicks.map((tick) => {
                            const y = 42 + (Number(tick || 0) / yMax) * (526 - 42);
                            return `<text class="season-summary-cover-tick rank" x="48" y="${y + 6}" text-anchor="end">${escapeHtml(Number(tick || 0).toLocaleString("en-US"))}</text>`;
                        }).join("")}
                        ${xTicks.map((point) => `<text class="season-summary-cover-tick gw" x="${point.x.toFixed(2)}" y="28" text-anchor="middle">${escapeHtml(point.gw || "")}</text>`).join("")}
                        <path d="${areaPath}" fill="url(#season-summary-cover-fill)" opacity="0.58"></path>
                        <path d="${linePath}" fill="none" stroke="url(#season-summary-cover-line)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"></path>
                    </svg>
                </div>
            </aside>
        `;
    }

    function renderCoverPage(profile) {
        const cover = profile?.cover || {};
        const englishName = [cover.first_name, cover.last_name].filter(Boolean).join(" ").trim() || profile.managerName || "";
        const stats = Array.isArray(cover.stats) ? cover.stats : [];

        return `
            <section class="season-summary-page active season-summary-page-cover">
                <div class="season-summary-cover-main">
                    <div class="season-summary-overline season-summary-cover-overline">${escapeHtml(cover.season_mark || profile.seasonLabel || "")}</div>
                    <div class="season-summary-cover-title">${escapeHtml(cover.display_name || profile.teamName || profile.managerName || "")}</div>
                    <div class="season-summary-cover-subtitle">${escapeHtml(englishName)}</div>

                    <div class="season-summary-cover-stats">
                        ${stats.map((item) => `
                            <div class="season-summary-cover-stat">
                                <div class="season-summary-cover-stat-label">${escapeHtml(item?.[0])}</div>
                                <div class="season-summary-cover-stat-value">${escapeHtml(item?.[1])}</div>
                            </div>
                        `).join("")}
                    </div>

                    <div class="season-summary-cover-message">${escapeHtml(cover.opening_message || "")}</div>
                </div>

                ${renderOrCurvePanel(profile)}
            </section>
        `;
    }

    function buildTransferLabel(item, mode) {
        if (mode === "day") {
            const dayNumber = Number(item?.day || 0);
            return dayNumber > 0 ? String(dayNumber) : "-";
        }
        return String(item?.label || "");
    }

    function renderTransferBarChart(items, options = {}) {
        const entries = (Array.isArray(items) && items.length
            ? items
            : [{ label: "-", count: 0 }]
        ).map((item) => ({
            label: buildTransferLabel(item, options.mode || "time"),
            count: Number(item?.count || 0),
        }));

        const maxCount = Math.max(...entries.map((item) => item.count), 1);
        const ticks = buildNiceTicks(maxCount, 4);
        const tickCeiling = Math.max(1, ticks[ticks.length - 1] || maxCount);
        const viewWidth = 480;
        const viewHeight = 286;
        const left = 52;
        const right = 452;
        const top = 32;
        const bottom = 208;
        const plotWidth = right - left;
        const plotHeight = bottom - top;
        const slotWidth = plotWidth / Math.max(entries.length, 1);
        const barWidth = Math.max(16, Math.min(48, slotWidth * 0.6));
        const radius = Math.min(barWidth / 2, 14);
        const title = options.title || "";
        const xAxisLabel = options.xAxisLabel || "";
        const yAxisLabel = options.yAxisLabel || "";

        return `
            <div class="season-summary-transfer-panel season-summary-transfer-panel-${escapeHtml(options.theme || "purple")}">
                <div class="season-summary-transfer-panel-body">
                    <svg viewBox="0 0 ${viewWidth} ${viewHeight}" preserveAspectRatio="none" aria-hidden="true">
                        <g class="season-summary-transfer-grid">
                            ${ticks.map((tick) => {
                                const y = top + (1 - (Number(tick || 0) / tickCeiling)) * plotHeight;
                                return `<line x1="${left}" y1="${y.toFixed(2)}" x2="${right}" y2="${y.toFixed(2)}"></line>`;
                            }).join("")}
                        </g>
                        <line class="season-summary-transfer-axis" x1="${left}" y1="${top}" x2="${left}" y2="${bottom}"></line>
                        <line class="season-summary-transfer-axis" x1="${left}" y1="${bottom}" x2="${right}" y2="${bottom}"></line>
                        <text class="season-summary-transfer-axis-label y" x="${left}" y="${top - 12}" text-anchor="start">${escapeHtml(yAxisLabel)}</text>
                        <text class="season-summary-transfer-axis-label x" x="${right}" y="${bottom + 44}" text-anchor="end">${escapeHtml(xAxisLabel)}</text>
                        ${ticks.map((tick) => {
                            const y = top + (1 - (Number(tick || 0) / tickCeiling)) * plotHeight;
                            return `<text class="season-summary-transfer-tick y" x="${left - 10}" y="${y + 4}" text-anchor="end">${escapeHtml(tick)}</text>`;
                        }).join("")}
                        ${entries.map((item, index) => {
                            const centerX = left + slotWidth * index + slotWidth / 2;
                            const height = item.count > 0 ? Math.max(8, (item.count / tickCeiling) * plotHeight) : 0;
                            const rectX = centerX - barWidth / 2;
                            const rectY = bottom - height;
                            const countY = Math.max(top + 10, rectY - 8);
                            return `
                                <g class="season-summary-transfer-bar">
                                    <text class="season-summary-transfer-bar-value" x="${centerX}" y="${countY}" text-anchor="middle">${escapeHtml(item.count)}</text>
                                    <rect x="${rectX.toFixed(2)}" y="${rectY.toFixed(2)}" width="${barWidth.toFixed(2)}" height="${height.toFixed(2)}" rx="${radius.toFixed(2)}" ry="${radius.toFixed(2)}"></rect>
                                    <text class="season-summary-transfer-tick x" x="${centerX}" y="${bottom + 20}" text-anchor="middle">${escapeHtml(item.label)}</text>
                                </g>
                            `;
                        }).join("")}
                    </svg>
                </div>
                <div class="season-summary-transfer-panel-title">${escapeHtml(title)}</div>
            </div>
        `;
    }

    function renderHoldRankingChart(items) {
        const rows = (Array.isArray(items) ? items : []).slice(0, 8).map((item) => ({
            player_name: String(item?.player_name || ""),
            days_held: Number(item?.days_held || 0),
        }));
        const maxDays = Math.max(...rows.map((item) => item.days_held), 1);
        const ticks = buildNiceTicks(maxDays, 4);
        const tickCeiling = Math.max(1, ticks[ticks.length - 1] || maxDays);
        const axisColumns = `repeat(${Math.max(2, ticks.length)}, minmax(0, 1fr))`;
        return `
            <div class="season-summary-transfer-panel season-summary-transfer-panel-pink season-summary-transfer-panel-table">
                <div class="season-summary-transfer-panel-body season-summary-transfer-panel-body-wide">
                    <div class="season-summary-transfer-axis-label-row">
                        <span class="season-summary-transfer-axis-label y">球员</span>
                    </div>
                    <div class="season-summary-transfer-hold-list">
                        ${rows.map((item) => {
                            const widthPercent = Math.max(0, Math.min(100, (item.days_held / tickCeiling) * 100));
                            return `
                                <div class="season-summary-transfer-hold-row">
                                    <div class="season-summary-transfer-hold-player">${escapeHtml(item.player_name)}</div>
                                    <div class="season-summary-transfer-hold-bar-track">
                                        <div class="season-summary-transfer-hold-bar" style="width:${widthPercent.toFixed(2)}%"></div>
                                    </div>
                                    <div class="season-summary-transfer-hold-value">${escapeHtml(item.days_held)}</div>
                                </div>
                            `;
                        }).join("")}
                    </div>
                    <div class="season-summary-transfer-hold-axis" style="grid-template-columns:${axisColumns}">
                        ${ticks.map((tick) => `<span>${escapeHtml(tick)}</span>`).join("")}
                    </div>
                    <div class="season-summary-transfer-axis-label-row bottom">
                        <span class="season-summary-transfer-axis-label x">${escapeHtml("天数")}</span>
                    </div>
                </div>
                <div class="season-summary-transfer-panel-title">（持有球员天数）</div>
            </div>
        `;
    }

    function renderTransferSummary(rows) {
        const compactRows = (Array.isArray(rows) ? rows : []).slice(0, 4);
        return `
            <div class="season-summary-transfer-summary-grid">
                ${compactRows.map((item) => `
                    <div class="season-summary-transfer-summary-card">
                        <div class="season-summary-transfer-summary-label">${escapeHtml(item?.[0])}</div>
                        <div class="season-summary-transfer-summary-value">${escapeHtml(item?.[1])}</div>
                    </div>
                `).join("")}
            </div>
        `;
    }

    function renderTransferPage(profile) {
        const transfers = profile?.transfers || {};
        return `
            <section class="season-summary-page season-summary-page-transfer">
                <div class="season-summary-main season-summary-transfer-main">
                    ${renderTransferSummary(transfers.rows || [])}
                    <div class="season-summary-transfer-copy-space"></div>
                </div>
                <aside class="season-summary-side season-summary-transfer-dashboard">
                    ${renderTransferBarChart(transfers.day_distribution || [], { theme: "purple", mode: "day", title: "（转会Gameday分布）", xAxisLabel: "Day", yAxisLabel: "次数" })}
                    ${renderTransferBarChart(transfers.time_distribution || [], { theme: "blue", mode: "time", title: "（转会时间段分布）", xAxisLabel: "北京时间", yAxisLabel: "次数" })}
                    ${renderHoldRankingChart(transfers.hold_ranking || [])}
                </aside>
            </section>
        `;
    }

    function renderPages(profile) {
        return `
            ${renderCoverPage(profile)}

            ${renderTransferPage(profile)}

            <section class="season-summary-page">
                <div class="season-summary-main">
                    <div class="season-summary-page-title">队长情况</div>
                    ${renderStatsGrid(profile?.captain?.cards || [])}
                    ${renderRows(profile?.captain?.rows || [])}
                </div>
                <aside class="season-summary-side">
                    <div class="season-summary-rail">
                        <div class="season-summary-mini-title">${escapeHtml(profile?.captain?.sideTitle || "Captain")}</div>
                        ${renderBullets(profile?.captain?.sideBullets || [])}
                    </div>
                </aside>
            </section>

            <section class="season-summary-page">
                <div class="season-summary-main">
                    <div class="season-summary-page-title">持有球员情况</div>
                    ${renderRows(profile?.roster?.rows || [])}
                    ${renderBadges(profile?.roster?.badges || [])}
                </div>
                <aside class="season-summary-side">
                    <div class="season-summary-rail">
                        <div class="season-summary-mini-title">${escapeHtml(profile?.roster?.sideTitle || "Roster")}</div>
                        ${renderBullets(profile?.roster?.sideBullets || [])}
                    </div>
                </aside>
            </section>

            <section class="season-summary-page">
                <div class="season-summary-main">
                    <div class="season-summary-page-title">高光时刻</div>
                    ${renderStatsGrid(profile?.highlights?.cards || [])}
                    <div class="season-summary-quote">${escapeHtml(profile?.highlights?.quote || "")}</div>
                </div>
                <aside class="season-summary-side">
                    <div class="season-summary-rail">
                        <div class="season-summary-mini-title">${escapeHtml(profile?.highlights?.sideTitle || "Highlights")}</div>
                        ${renderBullets(profile?.highlights?.sideBullets || [])}
                        ${renderKpis(profile?.highlights?.sideKpis || [])}
                    </div>
                </aside>
            </section>
        `;
    }

    function getLoadErrorMessage(error) {
        const text = String(error?.message || error || "");
        if (/failed to fetch|networkerror|load failed/i.test(text)) {
            return "本地 API 没有连上，请先启动 worker 的 wrangler dev。";
        }
        if (/404|not found|required/i.test(text)) {
            return "这个 Fantasy ID 没有查到数据，可以换一个再试。";
        }
        return text || "加载失败";
    }

    async function playIntroExit(profile, normalizedUid) {
        refs().pages.innerHTML = renderPages(profile);
        state.currentPage = 0;
        updateIndicator();
        setIntroLeaving(true);
        setHasProfile(true);
        setProfileEntering(true);
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                setProfileEntering(false);
            });
        });
        await new Promise((resolve) => window.setTimeout(resolve, INTRO_EXIT_MS));
        setIntroLeaving(false);
        setIntroLoading(false);
        setStatus("");
        updateUrl(normalizedUid);
    }

    async function loadSummary(uid) {
        const normalizedUid = String(uid || "").trim();
        if (!normalizedUid) {
            setStatus("请输入你的 Fantasy ID", "error");
            refs().uidInput?.focus();
            return;
        }

        state.lastUid = normalizedUid;
        setHasProfile(false);
        setIntroLoading(true);
        setIntroLeaving(false);
        setStatus("正在加载中，请稍后", "loading");
        refs().pages.innerHTML = `<div class="season-summary-placeholder"></div>`;

        try {
            const profile = await requestSummary(normalizedUid);
            await playIntroExit(profile, normalizedUid);
        } catch (error) {
            console.error("Season summary load failed:", error);
            setIntroLeaving(false);
            setIntroLoading(false);
            setProfileEntering(false);
            setHasProfile(false);
            setStatus(getLoadErrorMessage(error), "error");
        }
    }

    function bindEvents() {
        const { form, uidInput, prevBtn, nextBtn } = refs();

        form?.addEventListener("submit", (event) => {
            event.preventDefault();
            loadSummary(uidInput?.value || "");
        });

        prevBtn?.addEventListener("click", () => {
            goToPage(state.currentPage - 1);
        });

        nextBtn?.addEventListener("click", () => {
            goToPage(state.currentPage + 1);
        });

        document.addEventListener("keydown", (event) => {
            if (event.key === "ArrowLeft") goToPage(state.currentPage - 1);
            if (event.key === "ArrowRight") goToPage(state.currentPage + 1);
        });
    }

    function initFromUrl() {
        const params = new URLSearchParams(window.location.search);
        const page = params.get("page");
        const uid = params.get("uid");
        updateIndicator();
        if (!isStandalonePage() && page === "season-summary" && window.App?.showPage) {
            window.App.showPage("season-summary");
        }
        if (uid) {
            if (refs().uidInput) refs().uidInput.value = uid;
            loadSummary(uid);
        }
    }

    document.addEventListener("DOMContentLoaded", () => {
        requestAnimationFrame(() => setIntroReady());
        bindEvents();
        initFromUrl();
    });

    window.SeasonSummaryPage = {
        load: loadSummary,
        goToPage,
    };
}());
