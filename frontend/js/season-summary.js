(function () {
    const PAGE_COUNT = 6;
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
                        <div class="season-summary-stat-label">${escapeHtml(item[0])}</div>
                        <div class="season-summary-stat-value">${escapeHtml(item[1])}</div>
                        <div class="season-summary-stat-note">${escapeHtml(item[2] || "")}</div>
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
                        <div class="season-summary-row-key">${escapeHtml(item[0])}</div>
                        <div class="season-summary-row-value">${escapeHtml(item[1])}</div>
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
                        <div class="season-summary-mini-title">${escapeHtml(item[0])}</div>
                        <strong>${escapeHtml(item[1])}</strong>
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
            const x = left + ((event - xMin) / xSpan) * (right - left);
            const y = top + (rank / ySpan) * (bottom - top);
            return {
                x,
                y,
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

    function buildRankTicks(maxRank, count = 5) {
        const safeMax = Math.max(1, Number(maxRank || 0));
        const ticks = [];
        for (let i = 0; i < count; i += 1) {
            ticks.push(Math.round((safeMax * i) / Math.max(1, count - 1)));
        }
        return [...new Set(ticks)];
    }

    function sampleXAxisTicks(points, desiredCount = 7) {
        if (!points.length) return [];
        if (points.length <= desiredCount) return points;
        const sampled = [];
        for (let i = 0; i < desiredCount; i += 1) {
            const index = Math.round((i * (points.length - 1)) / Math.max(1, desiredCount - 1));
            sampled.push(points[index]);
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
        const rankTicks = buildRankTicks(maxRank, 5);
        const xTicks = sampleXAxisTicks(points, 7);

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
                                const y = 42 + (Number(tick || 0) / Math.max(1, maxRank)) * (526 - 42);
                                return `<line x1="64" y1="${y.toFixed(2)}" x2="856" y2="${y.toFixed(2)}"></line>`;
                            }).join("")}
                            ${xTicks.map((point) => `<line x1="${point.x.toFixed(2)}" y1="42" x2="${point.x.toFixed(2)}" y2="526"></line>`).join("")}
                        </g>
                        <line class="season-summary-cover-axis" x1="64" y1="42" x2="64" y2="526"></line>
                        <line class="season-summary-cover-axis" x1="64" y1="42" x2="856" y2="42"></line>
                        ${rankTicks.map((tick) => {
                            const y = 42 + (Number(tick || 0) / Math.max(1, maxRank)) * (526 - 42);
                            return `<text class="season-summary-cover-tick rank" x="48" y="${y + 6}" text-anchor="end">${escapeHtml(tick.toLocaleString("en-US"))}</text>`;
                        }).join("")}
                        ${xTicks.map((point) => `<text class="season-summary-cover-tick gw" x="${point.x.toFixed(2)}" y="28" text-anchor="middle">${escapeHtml(point.gw || "")}</text>`).join("")}
                        <path d="${areaPath}" fill="url(#season-summary-cover-fill)" opacity="0.7"></path>
                        <path d="${linePath}" fill="none" stroke="url(#season-summary-cover-line)" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"></path>
                    </svg>
                </div>
            </aside>
        `;
    }

    function renderCoverPage(profile) {
        const cover = profile?.cover || {};
        const realName = cover.real_name || profile.managerName || "";
        const englishName = [cover.first_name, cover.last_name].filter(Boolean).join(" ").trim() || realName;
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
                                <div class="season-summary-cover-stat-label">${escapeHtml(item[0])}</div>
                                <div class="season-summary-cover-stat-value">${escapeHtml(item[1])}</div>
                            </div>
                        `).join("")}
                    </div>

                    <div class="season-summary-cover-message">${escapeHtml(cover.opening_message || "")}</div>
                </div>

                ${renderOrCurvePanel(profile)}
            </section>
        `;
    }

    function chartPath(values, width, height) {
        const list = Array.isArray(values) && values.length ? values : [48, 54, 51, 60, 57, 63, 67];
        const min = Math.min(...list);
        const max = Math.max(...list);
        const span = Math.max(1, max - min);
        return list.map((value, index) => {
            const x = 22 + (index * (width - 44)) / Math.max(1, list.length - 1);
            const y = height - 18 - ((value - min) / span) * (height - 36);
            return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
        }).join(" ");
    }

    function renderPages(profile) {
        const curvePath = chartPath(profile?.overview?.curve || [], 860, 190);
        return `
            ${renderCoverPage(profile)}

            <section class="season-summary-page">
                <div class="season-summary-main">
                    <div class="season-summary-page-title">赛季总览</div>
                    ${renderStatsGrid(profile.overview?.cards || [])}
                    <div class="season-summary-card">
                        <div class="season-summary-mini-title">Season Curve</div>
                        <div class="season-summary-chart">
                            <svg viewBox="0 0 860 190" preserveAspectRatio="none" aria-hidden="true">
                                <defs>
                                    <linearGradient id="season-summary-line" x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="0%" stop-color="#2563eb"></stop>
                                        <stop offset="100%" stop-color="#10b981"></stop>
                                    </linearGradient>
                                </defs>
                                <path d="${curvePath}" fill="none" stroke="url(#season-summary-line)" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"></path>
                            </svg>
                        </div>
                    </div>
                </div>
                <aside class="season-summary-side">
                    <div class="season-summary-rail">
                        <div class="season-summary-mini-title">${escapeHtml(profile.overview?.sideTitle || "Overview")}</div>
                        ${renderBullets(profile.overview?.sideBullets || [])}
                        ${renderKpis(profile.overview?.sideKpis || [])}
                    </div>
                </aside>
            </section>

            <section class="season-summary-page">
                <div class="season-summary-main">
                    <div class="season-summary-page-title">转会情况</div>
                    ${renderRows(profile.transfers?.rows || [])}
                    <div class="season-summary-quote">${escapeHtml(profile.transfers?.quote || "")}</div>
                </div>
                <aside class="season-summary-side">
                    <div class="season-summary-rail">
                        <div class="season-summary-mini-title">${escapeHtml(profile.transfers?.sideTitle || "Transfers")}</div>
                        ${renderBullets(profile.transfers?.sideBullets || [])}
                    </div>
                </aside>
            </section>

            <section class="season-summary-page">
                <div class="season-summary-main">
                    <div class="season-summary-page-title">队长情况</div>
                    ${renderStatsGrid(profile.captain?.cards || [])}
                    ${renderRows(profile.captain?.rows || [])}
                </div>
                <aside class="season-summary-side">
                    <div class="season-summary-rail">
                        <div class="season-summary-mini-title">${escapeHtml(profile.captain?.sideTitle || "Captain")}</div>
                        ${renderBullets(profile.captain?.sideBullets || [])}
                    </div>
                </aside>
            </section>

            <section class="season-summary-page">
                <div class="season-summary-main">
                    <div class="season-summary-page-title">持有球员情况</div>
                    ${renderRows(profile.roster?.rows || [])}
                    ${renderBadges(profile.roster?.badges || [])}
                </div>
                <aside class="season-summary-side">
                    <div class="season-summary-rail">
                        <div class="season-summary-mini-title">${escapeHtml(profile.roster?.sideTitle || "Roster")}</div>
                        ${renderBullets(profile.roster?.sideBullets || [])}
                    </div>
                </aside>
            </section>

            <section class="season-summary-page">
                <div class="season-summary-main">
                    <div class="season-summary-page-title">高光时刻</div>
                    ${renderStatsGrid(profile.highlights?.cards || [])}
                    <div class="season-summary-quote">${escapeHtml(profile.highlights?.quote || "")}</div>
                </div>
                <aside class="season-summary-side">
                    <div class="season-summary-rail">
                        <div class="season-summary-mini-title">${escapeHtml(profile.highlights?.sideTitle || "Highlights")}</div>
                        ${renderBullets(profile.highlights?.sideBullets || [])}
                        ${renderKpis(profile.highlights?.sideKpis || [])}
                    </div>
                </aside>
            </section>
        `;
    }

    function getLoadErrorMessage(error) {
        const text = String(error?.message || error || "");
        if (/failed to fetch|networkerror|load failed/i.test(text)) {
            return "本地 API 没有连上，请先启动 worker 的 wrangler dev";
        }
        if (/404|not found/i.test(text)) {
            return "这个 Fantasy ID 没查到数据，可以换一个试试";
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
            setStatus("请输入 Fantasy ID", "error");
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

        document.addEventListener("click", (event) => {
            const navButton = event.target.closest(".nav-tab");
            if (!navButton) return;
            const page = String(navButton.dataset.page || "home");
            if (page === "season-summary") {
                updateUrl(state.lastUid || "");
            } else {
                const url = new URL(window.location.href);
                url.searchParams.delete("page");
                url.searchParams.delete("uid");
                window.history.replaceState({}, "", url.toString());
            }
        });

        document.addEventListener("keydown", (event) => {
            const seasonPage = document.getElementById("page-season-summary");
            if (seasonPage && !seasonPage.classList.contains("active")) return;
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
