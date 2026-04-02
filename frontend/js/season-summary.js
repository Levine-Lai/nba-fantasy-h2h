(function () {
    const PAGE_COUNT = 6;
    const INTRO_EXIT_MS = 720;
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

    function setIntroLeaving(enabled) {
        refs().shell?.classList.toggle("intro-leaving", !!enabled);
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

    function renderPages(profile) {
        const curvePath = chartPath(profile?.overview?.curve || [], 860, 190);
        return `
            <section class="season-summary-page active">
                <div class="season-summary-main">
                    <div class="season-summary-overline">${escapeHtml(profile.seasonLabel || "")}</div>
                    <div class="season-summary-name">${escapeHtml(profile.managerName || "")}</div>
                    <div class="season-summary-team">${escapeHtml(profile.teamName || "")}</div>
                    ${renderStatsGrid(profile.cover?.footer || [])}
                    <div class="season-summary-quote">${escapeHtml(profile.cover?.subtitle || "")}</div>
                </div>
                <aside class="season-summary-side">
                    <div class="season-summary-rail">
                        <div class="season-summary-mini-title">Overview</div>
                        ${renderRows([
                            ["UID", profile.uid],
                            ["赛季", profile.seasonLabel || "-"],
                            ["第几个赛季", `第 ${profile.seasonCount || 1} 季`],
                            ["更新时间", profile.generatedLabel || "-"],
                        ])}
                    </div>
                </aside>
            </section>

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
        state.currentPage = 1;
        updateIndicator();
        setIntroLeaving(true);
        await new Promise((resolve) => window.setTimeout(resolve, INTRO_EXIT_MS));
        setHasProfile(true);
        setIntroLeaving(false);
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
        setIntroLeaving(false);
        setStatus("正在加载中，请稍后", "loading");
        refs().pages.innerHTML = `<div class="season-summary-placeholder"></div>`;

        try {
            const profile = await requestSummary(normalizedUid);
            await playIntroExit(profile, normalizedUid);
        } catch (error) {
            console.error("Season summary load failed:", error);
            setIntroLeaving(false);
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
            if (navButton) {
                const page = String(navButton.dataset.page || "home");
                if (page === "season-summary") {
                    updateUrl(state.lastUid || "");
                } else {
                    const url = new URL(window.location.href);
                    url.searchParams.delete("page");
                    url.searchParams.delete("uid");
                    window.history.replaceState({}, "", url.toString());
                }
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
