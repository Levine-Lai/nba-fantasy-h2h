(function () {
    const DEFAULT_PAGE_COUNT = 5;
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

    function getPageCount() {
        return Math.max(1, document.querySelectorAll(".season-summary-page").length || DEFAULT_PAGE_COUNT);
    }

    function updateIndicator() {
        const pageCount = getPageCount();
        document.querySelectorAll(".season-summary-page").forEach((page, index) => {
            page.classList.toggle("active", index === state.currentPage);
        });
        const { prevBtn, nextBtn } = refs();
        if (prevBtn) prevBtn.disabled = state.currentPage <= 0;
        if (nextBtn) nextBtn.disabled = state.currentPage >= pageCount - 1;
    }

    function goToPage(nextPage) {
        const pageCount = getPageCount();
        state.currentPage = Math.max(0, Math.min(pageCount - 1, Number(nextPage || 0)));
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
        return String(item?.full_label || item?.label || "");
    }

    function renderTransferBarChart(items, options = {}) {
        const entries = (Array.isArray(items) && items.length ? items : [{ label: "-", count: 0 }]).map((item) => ({
            label: buildTransferLabel(item, options.mode || "time"),
            count: Number(item?.count || 0),
        }));
        const maxCount = Math.max(...entries.map((item) => item.count), 1);
        const ticks = buildNiceTicks(maxCount, 4);
        const tickCeiling = Math.max(1, ticks[ticks.length - 1] || maxCount);
        const viewWidth = 480;
        const viewHeight = 304;
        const left = 56;
        const right = 452;
        const top = 44;
        const bottom = 226;
        const plotWidth = right - left;
        const plotHeight = bottom - top;
        const slotWidth = plotWidth / Math.max(entries.length, 1);
        const barWidth = Math.max(16, Math.min(42, slotWidth * 0.52));
        const radius = Math.min(barWidth / 2, 14);

        return `
            <div class="season-summary-transfer-panel season-summary-transfer-panel-${escapeHtml(options.theme || "purple")}${options.panelClass ? ` ${escapeHtml(options.panelClass)}` : ""}">
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
                        <text class="season-summary-transfer-axis-label y" x="${left}" y="${top - 16}" text-anchor="start">${escapeHtml(options.yAxisLabel || "")}</text>
                        <text class="season-summary-transfer-axis-label x" x="${right}" y="${bottom + 48}" text-anchor="end">${escapeHtml(options.xAxisLabel || "")}</text>
                        ${ticks.map((tick) => {
                            const y = top + (1 - (Number(tick || 0) / tickCeiling)) * plotHeight;
                            return `<text class="season-summary-transfer-tick y" x="${left - 10}" y="${y + 4}" text-anchor="end">${escapeHtml(tick)}</text>`;
                        }).join("")}
                        ${entries.map((item, index) => {
                            const centerX = left + slotWidth * index + slotWidth / 2;
                            const height = item.count > 0 ? Math.max(8, (item.count / tickCeiling) * plotHeight) : 0;
                            const rectX = centerX - barWidth / 2;
                            const rectY = bottom - height;
                            const countY = Math.max(24, rectY - 10);
                            return `
                                <g class="season-summary-transfer-bar">
                                    <text class="season-summary-transfer-bar-value" x="${centerX}" y="${countY}" text-anchor="middle">${escapeHtml(item.count)}</text>
                                    <rect x="${rectX.toFixed(2)}" y="${rectY.toFixed(2)}" width="${barWidth.toFixed(2)}" height="${height.toFixed(2)}" rx="${radius.toFixed(2)}" ry="${radius.toFixed(2)}"></rect>
                                    <text class="season-summary-transfer-tick x" x="${centerX}" y="${bottom + 22}" text-anchor="middle">${escapeHtml(item.label)}</text>
                                </g>
                            `;
                        }).join("")}
                    </svg>
                </div>
                <div class="season-summary-transfer-panel-title">${escapeHtml(options.title || "")}</div>
            </div>
        `;
    }

    function renderHoldRankingChart(items, options = {}) {
        const rows = (Array.isArray(items) ? items : []).slice(0, 8).map((item) => ({
            player_name: String(item?.player_name || ""),
            days_held: Number(item?.days_held || 0),
        }));
        const tickCeiling = 155;
        const ticks = [0, 50, 100, 155];
        const axisColumns = `repeat(${ticks.length}, minmax(0, 1fr))`;

        return `
            <div class="season-summary-transfer-panel season-summary-transfer-panel-pink season-summary-transfer-panel-table${options.panelClass ? ` ${escapeHtml(options.panelClass)}` : ""}">
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
                        <span class="season-summary-transfer-axis-label x">天数</span>
                    </div>
                </div>
                <div class="season-summary-transfer-panel-title">${escapeHtml(options.title || "持有球员天数")}</div>
            </div>
        `;
    }

    function formatSummaryNumber(value) {
        const numeric = Number(value || 0);
        if (!Number.isFinite(numeric)) return "-";
        return numeric.toLocaleString("en-US");
    }

    function formatSummaryDecimal(value, digits = 1) {
        const numeric = Number(value || 0);
        if (!Number.isFinite(numeric)) return "-";
        return numeric.toLocaleString("en-US", {
            minimumFractionDigits: digits,
            maximumFractionDigits: digits,
        });
    }

    function renderStoryCards(cards, extraClass = "") {
        return `
            <div class="season-summary-story-cards${extraClass ? ` ${extraClass}` : ""}">
                ${(Array.isArray(cards) ? cards : []).map((card) => `
                    <div class="season-summary-story-card">
                        <div class="season-summary-story-card-label">${escapeHtml(card?.label || "")}</div>
                        <div class="season-summary-story-card-value">${escapeHtml(card?.value || "")}</div>
                        <div class="season-summary-story-card-note">${escapeHtml(card?.note || "")}</div>
                    </div>
                `).join("")}
            </div>
        `;
    }

    function renderStoryAvatar(url, alt, className = "") {
        const safeUrl = String(url || "").trim();
        if (!safeUrl) return "";
        return `
            <img
                class="season-summary-story-avatar${className ? ` ${className}` : ""}"
                src="${escapeHtml(safeUrl)}"
                alt="${escapeHtml(alt || "")}"
                loading="lazy"
                onerror="this.remove()"
            />
        `;
    }

    function renderStoryAvatarStrip(items, className = "") {
        const avatars = (Array.isArray(items) ? items : [])
            .map((item) => renderStoryAvatar(item?.headshot_url, item?.player_name || item?.captain_name || "Player"))
            .filter(Boolean);
        if (!avatars.length) return "";
        return `<div class="season-summary-story-avatar-strip${className ? ` ${className}` : ""}">${avatars.join("")}</div>`;
    }

    function getStoryPlayerName(item) {
        return String(item?.player_name || item?.captain_name || item?.name || "Player");
    }

    function renderInlinePlayerMention(item, className = "") {
        const safeUrl = String(item?.headshot_url || "").trim();
        const safeName = getStoryPlayerName(item);
        if (!safeUrl) {
            return `<strong class="season-summary-transfer-emphasis">${escapeHtml(safeName)}</strong>`;
        }
        return `
            <span class="season-summary-inline-player${className ? ` ${className}` : ""}" title="${escapeHtml(safeName)}" aria-label="${escapeHtml(safeName)}">
                <img
                    class="season-summary-inline-player-image"
                    src="${escapeHtml(safeUrl)}"
                    alt="${escapeHtml(safeName)}"
                    loading="lazy"
                    referrerpolicy="no-referrer"
                    onerror="this.parentElement?.remove()"
                />
            </span>
        `;
    }

    function getTransferTimeMood(fullLabel) {
        const label = String(fullLabel || "");
        if (label === "00:00-08:00") {
            return "星星和月亮大概真的是你的朋友，不到 ddl 前总还想再看一眼。";
        }
        if (label === "08:00-16:00") {
            return "白天一到位，你往往就已经准备好给阵容做决定。";
        }
        if (label === "16:00-24:00") {
            return "你更愿意把决定留到一天后半段，等消息更完整时再落子。";
        }
        return "换人的节奏很像你自己的习惯，慢慢也就有了固定的手感。";
    }

    function getTransferDayMood(dayLabel) {
        const label = String(dayLabel || "");
        if (label === "Day1") return "开局就动手，说明你很少愿意只做旁观者。";
        if (label === "Day2" || label === "Day3") return "你更喜欢在局面刚展开时提前调整。";
        if (label === "Day4" || label === "Day5") return "你会先看几眼风向，再决定该不该出手。";
        if (label === "Day6" || label === "Day7") return "很多决定会被你留到更靠近截止的时候。";
        return "换人日的选择，慢慢也形成了你自己的节奏。";
    }

    function renderTransferStory(profile) {
        const transfers = profile?.transfers || {};
        const summary = transfers.summary || {};
        const totalTransfers = Number(summary.total_transfers || 0);
        const activeWeeks = Number(summary.active_weeks || 0);
        const seasonWeeks = Number(summary.season_weeks || 0);
        const penaltyPoints = Number(summary.penalty_points || 0);
        const penaltyEventCount = Number(summary.penalty_event_count || 0);
        const transferEveryWeek = !!summary.transfer_every_week;
        const mostIn = summary.most_in || null;
        const mostOut = summary.most_out || null;
        const favoriteReturner = summary.favorite_returner || null;
        const favoriteDay = summary.favorite_day || null;
        const favoriteTimeSlot = summary.favorite_time_slot || null;
        const longestHold = summary.longest_hold || null;

        const cards = [
            {
                label: "总转会",
                value: totalTransfers > 0 ? `${formatSummaryNumber(totalTransfers)}次` : "0次",
                note: "不含 WC / AS",
            },
            {
                label: "操作周数",
                value: seasonWeeks > 0 ? `${formatSummaryNumber(activeWeeks)}/${formatSummaryNumber(seasonWeeks)}` : formatSummaryNumber(activeWeeks),
                note: transferEveryWeek ? "每一周都有动作" : "并不是周周都出手",
            },
            {
                label: "扣分",
                value: penaltyPoints > 0 ? `${formatSummaryNumber(penaltyPoints)}分` : "0分",
                note: penaltyPoints > 0 ? `${formatSummaryNumber(penaltyEventCount)} 个比赛日付费` : "这一季还没因转会扣分",
            },
            {
                label: "最长陪伴",
                value: longestHold ? `${formatSummaryNumber(longestHold.days_held)}天` : "-",
                note: longestHold ? String(longestHold.player_name || "") : "暂时没有固定常驻",
            },
        ];

        const mark = (value) => `<strong>${escapeHtml(value)}</strong>`;
        const paragraphs = [];

        if (totalTransfers <= 0) {
            paragraphs.push("这一季你几乎没有动过非芯片转会，更多时候是在等答案自己慢慢浮上来。");
        } else if (transferEveryWeek && seasonWeeks > 0) {
            paragraphs.push(
                `从赛季开始到现在，你在 ${mark(formatSummaryNumber(seasonWeeks))} 个比赛周里都留下了调整。${mark(formatSummaryNumber(totalTransfers))} 次非芯片转会，让“不到截止不收手”这件事在你身上特别明显。`
            );
        } else {
            const weekText = seasonWeeks > 0
                ? `${mark(formatSummaryNumber(activeWeeks))}/${mark(formatSummaryNumber(seasonWeeks))} 周`
                : `${mark(formatSummaryNumber(activeWeeks))} 周`;
            paragraphs.push(
                `这一季你一共做了 ${mark(formatSummaryNumber(totalTransfers))} 次非芯片转会，其中 ${weekText} 都留下了操作。你更像是看准机会，再把决定慢慢落下的人。`
            );
        }

        const preferenceParts = [];
        if (mostIn?.name) {
            preferenceParts.push(`${mark(mostIn.name)} 是你最常换入的人，一共来了 ${mark(formatSummaryNumber(mostIn.count))} 次`);
        }
        if (mostOut?.name) {
            preferenceParts.push(`${mark(mostOut.name)} 则最常被你送走，一共离开了 ${mark(formatSummaryNumber(mostOut.count))} 次`);
        }
        if (favoriteReturner?.name) {
            preferenceParts.push(`${mark(favoriteReturner.name)} 还被你回购了 ${mark(formatSummaryNumber(favoriteReturner.count))} 次`);
        }
        if (preferenceParts.length) {
            paragraphs.push(`${preferenceParts.join("，")}。`);
        }

        if (favoriteTimeSlot?.full_label || favoriteDay?.label) {
            const timeText = favoriteTimeSlot?.full_label
                ? `你最喜欢在北京时间 ${mark(favoriteTimeSlot.full_label)} 动手，${getTransferTimeMood(favoriteTimeSlot.full_label)}`
                : "";
            const dayText = favoriteDay?.label
                ? `${mark(favoriteDay.label)} 也是你最常出手的日子，${getTransferDayMood(favoriteDay.label)}`
                : "";
            paragraphs.push([timeText, dayText].filter(Boolean).join(" "));
        }

        if (penaltyPoints > 0 && longestHold?.player_name) {
            paragraphs.push(
                `为了这些判断，你一共交出了 ${mark(formatSummaryNumber(penaltyPoints))} 分，代价出现在 ${mark(formatSummaryNumber(penaltyEventCount))} 个比赛日里。${mark(longestHold.player_name)} 陪你待了 ${mark(formatSummaryNumber(longestHold.days_held))} 天，跟着你走过了这一季最长的一段路。`
            );
        } else if (penaltyPoints > 0) {
            paragraphs.push(
                `为了这些判断，你一共交出了 ${mark(formatSummaryNumber(penaltyPoints))} 分，代价出现在 ${mark(formatSummaryNumber(penaltyEventCount))} 个比赛日里。`
            );
        } else if (longestHold?.player_name) {
            paragraphs.push(
                `好消息是，这一季你的转会还没有带来额外扣分。${mark(longestHold.player_name)} 陪你待了 ${mark(formatSummaryNumber(longestHold.days_held))} 天，已经很像这份阵容里最熟悉的老朋友。`
            );
        }

        return `
            <div class="season-summary-transfer-copy">
                <div class="season-summary-page-title">这一季，你是这样换人的</div>
                <div class="season-summary-transfer-glance">
                    ${cards.map((card) => `
                        <div class="season-summary-transfer-glance-card">
                            <div class="season-summary-transfer-glance-label">${escapeHtml(card.label)}</div>
                            <div class="season-summary-transfer-glance-value">${escapeHtml(card.value)}</div>
                            <div class="season-summary-transfer-glance-note">${escapeHtml(card.note)}</div>
                        </div>
                    `).join("")}
                </div>
                <div class="season-summary-transfer-story-list">
                    ${paragraphs.map((paragraph) => `<p class="season-summary-transfer-story-paragraph">${paragraph}</p>`).join("")}
                </div>
            </div>
        `;
    }

    function renderTransferPage(profile) {
        const transfers = profile?.transfers || {};
        return `
            <section class="season-summary-page season-summary-page-transfer">
                <div class="season-summary-main season-summary-transfer-main">
                    ${renderTransferStory(profile)}
                </div>
                <aside class="season-summary-side season-summary-transfer-dashboard">
                    ${renderTransferBarChart(transfers.day_distribution || [], {
                        theme: "purple",
                        mode: "day",
                        title: "转会Gameday分布",
                        xAxisLabel: "Day",
                        yAxisLabel: "次数",
                        panelClass: "season-summary-transfer-panel-day",
                    })}
                    ${renderTransferBarChart(transfers.time_distribution || [], {
                        theme: "blue",
                        mode: "time",
                        title: "转会时间段分布",
                        xAxisLabel: "北京时间",
                        yAxisLabel: "次数",
                        panelClass: "season-summary-transfer-panel-time",
                    })}
                    ${renderHoldRankingChart(transfers.hold_ranking || [], {
                        title: "持有球员天数",
                        panelClass: "season-summary-transfer-panel-hold",
                    })}
                </aside>
            </section>
        `;
    }

    function renderTransferStory(profile) {
        const transfers = profile?.transfers || {};
        const summary = transfers.summary || {};
        const totalTransfers = Number(summary.total_transfers || 0);
        const activeWeeks = Number(summary.active_weeks || 0);
        const seasonWeeks = Number(summary.season_weeks || 24);
        const penaltyPoints = Number(summary.penalty_points || 0);
        const transferEveryWeek = !!summary.transfer_every_week;
        const mostIn = summary.most_in || null;
        const mostOut = summary.most_out || null;
        const favoriteDay = summary.favorite_day || null;
        const favoriteTimeSlot = summary.favorite_time_slot || null;
        const longestHold = summary.longest_hold || null;

        const mark = (value) => `<strong class="season-summary-transfer-emphasis">${escapeHtml(value)}</strong>`;
        const timeSlotLabel = String(favoriteTimeSlot?.full_label || "--");
        const longestHoldHeadshot = String(longestHold?.headshot_url || "").trim();
        const longestHoldShowcase = longestHold?.player_name ? `
            <div class="season-summary-transfer-player-showcase">
                ${longestHoldHeadshot ? `
                    <div class="season-summary-transfer-player-showcase-art">
                        <img
                            class="season-summary-transfer-player-showcase-headshot"
                            src="${escapeHtml(longestHoldHeadshot)}"
                            alt="${escapeHtml(longestHold?.player_name || "Player headshot")}"
                            loading="lazy"
                            referrerpolicy="no-referrer"
                            onerror="this.closest('.season-summary-transfer-player-showcase-art')?.remove()"
                        />
                    </div>
                ` : ""}
                <div class="season-summary-transfer-player-showcase-copy">
                    <div class="season-summary-transfer-player-showcase-overline">鏈€闀块櫔浼翠綘鐨勪汉</div>
                    <div class="season-summary-transfer-player-showcase-name">${escapeHtml(longestHold.player_name)}</div>
                    <div class="season-summary-transfer-player-showcase-days">${escapeHtml(formatSummaryNumber(longestHold.days_held))} 澶?/div>
                </div>
            </div>
        ` : "";
        const cards = [
            {
                label: "总换人次数",
                value: `${formatSummaryNumber(totalTransfers)}次`,
                note: "不含 WC / AS",
            },
            {
                label: "操作周数",
                value: `${formatSummaryNumber(activeWeeks)}/${formatSummaryNumber(seasonWeeks)}`,
                note: transferEveryWeek ? "每一周都坚持操作" : "有些周选择按兵不动",
            },
            {
                label: "扣分总计",
                value: penaltyPoints > 0 ? `-${formatSummaryNumber(penaltyPoints)}` : "0",
                note: penaltyPoints > 200 ? "这一季下手很果断" : "整体算是谨慎出手",
            },
            {
                label: "偏爱换人时段",
                value: timeSlotLabel,
                note: favoriteTimeSlot?.count ? `${formatSummaryNumber(favoriteTimeSlot.count)} 次发生在这个时段` : "这一季还没有明显固定习惯",
            },
        ];

        let paragraphOne = `这个赛季总共转会${mark(formatSummaryNumber(totalTransfers))}次，`;
        paragraphOne += transferEveryWeek
            ? "并且每一周都坚持换人，相信最终的排名没有辜负你的努力~"
            : "机智的你选择以逸待劳，并不是把 FT 用完才是最好的选择。";
        paragraphOne += penaltyPoints > 200
            ? `整个赛季一共扣过${mark(formatSummaryNumber(penaltyPoints))}分，大胆而奔放的操作决定了你的上限。`
            : `整个赛季一共扣过${mark(formatSummaryNumber(penaltyPoints))}分，谨慎精确才是你的代名词。`;

        let paragraphTwo = "";
        if (mostIn?.name && mostOut?.name) {
            paragraphTwo = `${mark(mostIn.name)}被你换进来了${mark(formatSummaryNumber(mostIn.count))}次，是你心心念念的那个人吗？希望他的表现没有让你失望；而 ${mark(mostOut.name)} 被你送走了${mark(formatSummaryNumber(mostOut.count))}次，想必他的表现你也看在眼里吧。`;
        } else if (mostIn?.name) {
            paragraphTwo = `${mark(mostIn.name)}被你换进来了${mark(formatSummaryNumber(mostIn.count))}次，看得出来你总愿意再给他一次机会，希望他的表现没有让你失望。`;
        } else if (mostOut?.name) {
            paragraphTwo = `${mark(mostOut.name)}被你送走了${mark(formatSummaryNumber(mostOut.count))}次，能让你反复按下离队键的人，想必早就把耐心消磨得差不多了吧。`;
        } else {
            paragraphTwo = "这一季你的转会对象相当分散，没有谁特别频繁地被你换进换出，整个操作风格看起来更像顺势而为。";
        }

        const favoriteStartHour = Number(String(favoriteTimeSlot?.label || "").split("-")[0]);
        let timeSentence = "你好像没有把换人习惯固定在某个特定时段，想换就换，也算是一种难得的自由。";
        if (Number.isFinite(favoriteStartHour)) {
            if (favoriteStartHour >= 8 && favoriteStartHour < 20) {
                timeSentence = `你好像更喜欢在${mark(timeSlotLabel)}换人，伤病报告都是小事，心情＞fantasy。`;
            } else if (favoriteStartHour >= 20 && favoriteStartHour < 24) {
                timeSentence = `你好像更喜欢在${mark(timeSlotLabel)}换人，谨慎而大胆的选择，等到消息更完整再操作，也不耽误睡觉时间。`;
            } else if (favoriteStartHour >= 0 && favoriteStartHour < 6) {
                timeSentence = `你好像更喜欢在${mark(timeSlotLabel)}换人，夜生活才是你的舞台，必须看到我的球员 available 再睡觉。`;
            } else if (favoriteStartHour >= 6 && favoriteStartHour < 8) {
                timeSentence = `你好像更喜欢在${mark(timeSlotLabel)}换人，全服最谨慎的玩家，早起闹钟定好，守着 ddl 落子无悔。`;
            }
        }

        const favoriteDayNumber = Number(favoriteDay?.day || 0);
        let daySentence = "";
        if (favoriteDayNumber >= 1 && favoriteDayNumber <= 3) {
            daySentence = `${mark(`Day${favoriteDayNumber}`)}也是你最常出手的日子，拿到 FT 就该趁早用。`;
        } else if (favoriteDayNumber >= 4 && favoriteDayNumber <= 7) {
            daySentence = `经常把转会留到${mark(`Day${favoriteDayNumber}`)}再出手，不仅规划得当，而且沉得住气。`;
        }
        const paragraphThree = [timeSentence, daySentence].filter(Boolean).join("");

        let paragraphFour = "漫长的赛季，人来人往，你的阵容名单也像车站一样不停有人上车下车。";
        if (longestHold?.player_name) {
            paragraphFour = `漫长的赛季，人来人往，不知道你有没有猜到，留在你阵容中最久的人是${mark(longestHold.player_name)}呢，相信陪伴你走过了${mark(formatSummaryNumber(longestHold.days_held))}天，他已经成为你心中的第一爱酱了。`;
        }

        return `
            <div class="season-summary-transfer-copy">
                <div class="season-summary-transfer-glance">
                    ${cards.map((card) => `
                        <div class="season-summary-transfer-glance-card">
                            <div class="season-summary-transfer-glance-label">${escapeHtml(card.label)}</div>
                            <div class="season-summary-transfer-glance-value">${escapeHtml(card.value)}</div>
                            <div class="season-summary-transfer-glance-note">${escapeHtml(card.note)}</div>
                            ${index === 3 && longestHoldHeadshot ? `
                                <div class="season-summary-transfer-player-media">
                                    <img
                                        class="season-summary-transfer-player-headshot"
                                        src="${escapeHtml(longestHoldHeadshot)}"
                                        alt="${escapeHtml(longestHold?.player_name || "球员头像")}"
                                        loading="lazy"
                                        referrerpolicy="no-referrer"
                                        onerror="this.closest('.season-summary-transfer-player-media')?.remove()"
                                    />
                                </div>
                            ` : ""}
                        </div>
                    `).join("")}
                </div>
                <div class="season-summary-transfer-story-list">
                    <p class="season-summary-transfer-story-paragraph">${paragraphOne}</p>
                    <p class="season-summary-transfer-story-paragraph">${paragraphTwo}</p>
                    <p class="season-summary-transfer-story-paragraph">${paragraphThree}</p>
                    <p class="season-summary-transfer-story-paragraph">${paragraphFour}</p>
                </div>
            </div>
        `;
    }

    function renderTransferPage(profile) {
        return `
            <section class="season-summary-page season-summary-page-transfer">
                <div class="season-summary-main season-summary-transfer-main season-summary-transfer-main-full">
                    ${renderTransferStory(profile)}
                </div>
            </section>
        `;
    }

    function renderCaptainStory(profile) {
        const captain = profile?.captain || {};
        const cards = Array.isArray(captain.cards) ? captain.cards : [];
        const rows = Array.isArray(captain.rows) ? captain.rows : [];
        const countCard = cards[0] || ["Captain 次数", "-", ""];
        const totalCard = cards[1] || ["队长总得分", "-", ""];
        const favoriteCard = cards[2] || ["最爱 Captain", "暂无", ""];
        const bestRow = rows[0]?.[1] || "暂无 Captain 记录";
        const worstRow = rows[1]?.[1] || "暂无 Captain 记录";
        const favoriteValue = String(favoriteCard[1] || "暂无");
        const favoriteNote = String(favoriteCard[2] || "");
        const countValue = String(countCard[1] || "-");
        const totalValue = String(totalCard[1] || "-");
        const mark = (value) => `<strong class="season-summary-transfer-emphasis">${escapeHtml(value)}</strong>`;

        const cardsView = [
            {
                label: String(countCard[0] || "Captain 次数"),
                value: countValue,
                note: String(countCard[2] || ""),
            },
            {
                label: String(totalCard[0] || "队长总得分"),
                value: totalValue,
                note: String(totalCard[2] || ""),
            },
            {
                label: "最爱 Captain",
                value: favoriteValue,
                note: favoriteNote || "这一季还没有稳定偏爱",
            },
        ];

        const paragraphOne = `这一季你一共开过${mark(countValue)}次 Captain，累计拿到了${mark(totalValue)}分。每一次把赌注压在一个人身上，多少都带着一点“今天就看你了”的意味。`;
        const paragraphTwo = favoriteValue && favoriteValue !== "暂无"
            ? `${mark(favoriteValue)}是你最常按下去的那位天选之人，${favoriteNote || "看得出来你对他一直很有信心。"}`
            : "这一季你在 Captain 的选择上并没有长期押注某一个人，更像是在不同的比赛日里顺着感觉做判断。";
        const paragraphThree = bestRow.includes("暂无")
            ? "这一页暂时还没有足够的 Captain 记录，等真实数据补齐之后，会更像一份属于你的队长回忆录。"
            : `最甜的一次 Captain 来自${mark(bestRow)}；而最让人挠头的那次，则是${mark(worstRow)}。高峰和低谷都被记了下来，这才像一个完整的赛季。`;

        return `
            <div class="season-summary-transfer-copy season-summary-captain-copy">
                <div class="season-summary-transfer-glance season-summary-captain-glance">
                    ${cardsView.map((card) => `
                        <div class="season-summary-transfer-glance-card season-summary-captain-glance-card">
                            <div class="season-summary-transfer-glance-label">${escapeHtml(card.label)}</div>
                            <div class="season-summary-transfer-glance-value">${escapeHtml(card.value)}</div>
                            <div class="season-summary-transfer-glance-note">${escapeHtml(card.note)}</div>
                        </div>
                    `).join("")}
                </div>
                <div class="season-summary-transfer-story-list season-summary-captain-story-list">
                    <p class="season-summary-transfer-story-paragraph">${paragraphOne}</p>
                    <p class="season-summary-transfer-story-paragraph">${paragraphTwo}</p>
                    <p class="season-summary-transfer-story-paragraph">${paragraphThree}</p>
                </div>
            </div>
        `;
    }

    function renderCaptainPage(profile) {
        return `
            <section class="season-summary-page season-summary-page-captain">
                <div class="season-summary-main season-summary-transfer-main season-summary-transfer-main-full">
                    ${renderCaptainStory(profile)}
                </div>
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

    function renderPages(profile) {
        return `
            ${renderCoverPage(profile)}

            ${renderTransferPage(profile)}

            ${renderCaptainPage(profile)}

            <section class="season-summary-page">
                <div class="season-summary-main">
                    <div class="season-summary-page-title">鎸佹湁鐞冨憳鎯呭喌</div>
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
                    <div class="season-summary-page-title">楂樺厜鏃跺埢</div>
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

    function renderPages(profile) {
        return `
            ${renderCoverPage(profile)}

            ${renderTransferPage(profile)}

            ${renderCaptainPage(profile)}

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

    function renderTransferStory(profile) {
        const transfers = profile?.transfers || {};
        const summary = transfers.summary || {};
        const totalTransfers = Number(summary.total_transfers || 0);
        const activeWeeks = Number(summary.active_weeks || 0);
        const seasonWeeks = Number(summary.season_weeks || 24);
        const penaltyPoints = Number(summary.penalty_points || 0);
        const transferEveryWeek = !!summary.transfer_every_week;
        const mostIn = summary.most_in || null;
        const mostOut = summary.most_out || null;
        const favoriteDay = summary.favorite_day || null;
        const favoriteTimeSlot = summary.favorite_time_slot || null;
        const longestHold = summary.longest_hold || null;
        const longestHoldHeadshot = String(longestHold?.headshot_url || "").trim();
        const timeSlotLabel = String(favoriteTimeSlot?.full_label || "--");
        const mark = (value) => `<strong class="season-summary-transfer-emphasis">${escapeHtml(value)}</strong>`;

        const cards = [
            {
                label: "总换人次数",
                value: `${formatSummaryNumber(totalTransfers)}次`,
                note: "不含 WC / AS",
            },
            {
                label: "操作周数",
                value: `${formatSummaryNumber(activeWeeks)}/${formatSummaryNumber(seasonWeeks)}`,
                note: transferEveryWeek ? "每一周都坚持换人" : "有些周选择以逸待劳",
            },
            {
                label: "扣分总计",
                value: penaltyPoints > 0 ? `-${formatSummaryNumber(penaltyPoints)}` : "0",
                note: penaltyPoints > 200 ? "这一季下手很果断" : "整体算是谨慎出手",
            },
            {
                label: "偏爱换人时段",
                value: timeSlotLabel,
                note: favoriteTimeSlot?.count ? `${formatSummaryNumber(favoriteTimeSlot.count)} 次发生在这个时段` : "暂时没有明显固定偏好",
            },
        ];

        let paragraphOne = `这个赛季总共转会${mark(formatSummaryNumber(totalTransfers))}次，`;
        paragraphOne += transferEveryWeek
            ? "并且每一周都坚持换人，相信最终的排名没有辜负你的努力~"
            : "机智的你选择以逸待劳，并不是把 FT 用完才是最好的选择。";
        paragraphOne += penaltyPoints > 200
            ? `整个赛季一共扣过${mark(formatSummaryNumber(penaltyPoints))}分，大胆而奔放的操作决定了你的上限。`
            : `整个赛季一共扣过${mark(formatSummaryNumber(penaltyPoints))}分，谨慎精确才是你的代名词。`;

        let paragraphTwo = "这一季你的转会对象很分散，来来去去的人不少，但没有谁特别频繁地牵动你的手指。";
        if (mostIn?.name && mostOut?.name) {
            paragraphTwo = `${mark(mostIn.name)}被你换进来了${mark(formatSummaryNumber(mostIn.count))}次，是你心心念念的那个人吗？希望他的表现没有让你失望；而${mark(mostOut.name)}被你送走了${mark(formatSummaryNumber(mostOut.count))}次，想必他的表现你也看在眼里吧。`;
        } else if (mostIn?.name) {
            paragraphTwo = `${mark(mostIn.name)}被你换进来了${mark(formatSummaryNumber(mostIn.count))}次，看得出来你总愿意再给他一次机会。`;
        } else if (mostOut?.name) {
            paragraphTwo = `${mark(mostOut.name)}被你送走了${mark(formatSummaryNumber(mostOut.count))}次，能让你反复按下离队键的人，多少已经把耐心磨掉了。`;
        }

        const favoriteStartHour = Number(String(favoriteTimeSlot?.label || "").split("-")[0]);
        let timeSentence = "你好像没有把换人习惯固定在某个特定时段，想到就动，倒也算是一种自由。";
        if (Number.isFinite(favoriteStartHour)) {
            if (favoriteStartHour >= 8 && favoriteStartHour < 20) {
                timeSentence = `你好像更喜欢在${mark(timeSlotLabel)}换人，伤病报告都是小事，心情＞fantasy。`;
            } else if (favoriteStartHour >= 20 && favoriteStartHour < 24) {
                timeSentence = `你好像更喜欢在${mark(timeSlotLabel)}换人，谨慎而大胆的选择，等到消息更完整再操作，也不耽误睡觉时间。`;
            } else if (favoriteStartHour >= 0 && favoriteStartHour < 6) {
                timeSentence = `你好像更喜欢在${mark(timeSlotLabel)}换人，夜生活才是你的舞台，必须看到我的球员 available 再睡觉。`;
            } else if (favoriteStartHour >= 6 && favoriteStartHour < 8) {
                timeSentence = `你好像更喜欢在${mark(timeSlotLabel)}换人，全服最谨慎的玩家，早起闹钟定好，守着 ddl 落子无悔。`;
            }
        }

        const favoriteDayNumber = Number(favoriteDay?.day || 0);
        let daySentence = "";
        if (favoriteDayNumber >= 1 && favoriteDayNumber <= 3) {
            daySentence = `${mark(`Day${favoriteDayNumber}`)}也是你最常出手的日子，拿到 FT 就该趁早用。`;
        } else if (favoriteDayNumber >= 4 && favoriteDayNumber <= 7) {
            daySentence = `经常把转会留到${mark(`Day${favoriteDayNumber}`)}再出手，不仅规划得当，而且沉得住气。`;
        }
        const paragraphThree = [timeSentence, daySentence].filter(Boolean).join("");

        let paragraphFour = "漫长的赛季，人来人往，你的阵容名单也像车站一样不停有人上车下车。";
        if (longestHold?.player_name) {
            paragraphFour = `漫长的赛季，人来人往，不知道你有没有猜到，留在你阵容中最久的人是${mark(longestHold.player_name)}呢，相信陪伴你走过了${mark(formatSummaryNumber(longestHold.days_held))}天，他已经成为你心中的第一爱酱了吧。`;
        }

        const longestHoldShowcase = longestHold?.player_name ? `
            <div class="season-summary-transfer-player-showcase">
                ${longestHoldHeadshot ? `
                    <div class="season-summary-transfer-player-showcase-art">
                        <img
                            class="season-summary-transfer-player-showcase-headshot"
                            src="${escapeHtml(longestHoldHeadshot)}"
                            alt="${escapeHtml(longestHold.player_name)}"
                            loading="lazy"
                            referrerpolicy="no-referrer"
                            onerror="this.closest('.season-summary-transfer-player-showcase-art')?.remove()"
                        />
                    </div>
                ` : ""}
                <div class="season-summary-transfer-player-showcase-copy">
                    <div class="season-summary-transfer-player-showcase-overline">最长陪伴你的人</div>
                    <div class="season-summary-transfer-player-showcase-name">${escapeHtml(longestHold.player_name)}</div>
                    <div class="season-summary-transfer-player-showcase-days">${escapeHtml(formatSummaryNumber(longestHold.days_held))} 天</div>
                </div>
            </div>
        ` : "";

        return `
            <div class="season-summary-transfer-copy">
                <div class="season-summary-transfer-glance">
                    ${cards.map((card) => `
                        <div class="season-summary-transfer-glance-card">
                            <div class="season-summary-transfer-glance-label">${escapeHtml(card.label)}</div>
                            <div class="season-summary-transfer-glance-value">${escapeHtml(card.value)}</div>
                            <div class="season-summary-transfer-glance-note">${escapeHtml(card.note)}</div>
                        </div>
                    `).join("")}
                </div>
                <div class="season-summary-transfer-story-list">
                    <p class="season-summary-transfer-story-paragraph">${paragraphOne}</p>
                    <p class="season-summary-transfer-story-paragraph">${paragraphTwo}</p>
                    <p class="season-summary-transfer-story-paragraph">${paragraphThree}</p>
                    <p class="season-summary-transfer-story-paragraph">${paragraphFour}</p>
                </div>
                ${longestHoldShowcase}
            </div>
        `;
    }

    function renderCaptainStory(profile) {
        const captain = profile?.captain || {};
        const cards = Array.isArray(captain.cards) ? captain.cards : [];
        const rows = Array.isArray(captain.rows) ? captain.rows : [];
        const summary = captain.summary || {};
        const countCard = cards[0] || ["Captain 次数", "-", ""];
        const totalCard = cards[1] || ["队长总得分", "-", ""];
        const favoriteCard = cards[2] || ["最爱 Captain", "暂无", ""];
        const ownershipCard = cards[3] || ["最低持有率 Captain", "暂无", ""];
        const bestRow = rows[0]?.[1] || "暂无 Captain 记录";
        const worstRow = rows[1]?.[1] || "暂无 Captain 记录";
        const lowestOwnership = summary.lowest_ownership || null;
        const countValue = String(countCard[1] || "-");
        const totalValue = String(totalCard[1] || "-");
        const favoriteValue = String(favoriteCard[1] || "暂无");
        const favoriteNote = String(favoriteCard[2] || "");
        const mark = (value) => `<strong class="season-summary-transfer-emphasis">${escapeHtml(value)}</strong>`;

        const cardsView = [
            { label: String(countCard[0] || "Captain 次数"), value: countValue, note: String(countCard[2] || "") },
            { label: String(totalCard[0] || "队长总得分"), value: totalValue, note: String(totalCard[2] || "") },
            { label: "最爱 Captain", value: favoriteValue, note: favoriteNote || "这一季还没有稳定偏爱" },
            {
                label: String(ownershipCard[0] || "最低持有率 Captain"),
                value: String(ownershipCard[1] || "暂无"),
                note: lowestOwnership ? `${formatSummaryNumber(lowestOwnership.ownership_percent)}% 持有率` : String(ownershipCard[2] || "暂时还没有足够记录"),
            },
        ];

        const paragraphOne = `这一季你一共开了${mark(countValue)}次 Captain，累计拿到了${mark(totalValue)}分。每一次把赌注押在一个人身上，多少都带着一点“今天就看你了”的意味。`;
        const paragraphTwo = favoriteValue && favoriteValue !== "暂无"
            ? `${mark(favoriteValue)}是你最常按下去的那位天选之人，${favoriteNote || "看得出来你对他一直很有信心。"}`
            : "这一季你在 Captain 的选择上并没有长期押注某一个人，更像是在不同的比赛日里顺着感觉做判断。";
        const paragraphThree = bestRow.includes("暂无")
            ? "这一页暂时还没有足够的 Captain 记录，等真实数据补齐之后，会更像一份属于你的队长回忆录。"
            : `最甜的一次 Captain 来自${mark(bestRow)}；而最让人挠头的那次，则是${mark(worstRow)}。高峰和低谷都被记了下来，这才像一个完整的赛季。`;
        const paragraphFour = lowestOwnership?.captain_name
            ? `如果要说最有“反模板”味道的一次，大概就是${mark(lowestOwnership.label || "那一天")}的${mark(lowestOwnership.captain_name)}了。当时他的持有率只有${mark(formatSummaryNumber(lowestOwnership.ownership_percent))}% ，却依然替你拿下了${mark(formatSummaryNumber(lowestOwnership.captain_points))}分。`
            : "这一季暂时还没有一位足够低持有率又留下强烈印象的 Captain，说明你的选择更多还是顺着稳定答案在走。";

        return `
            <div class="season-summary-transfer-copy season-summary-captain-copy">
                <div class="season-summary-transfer-glance season-summary-captain-glance">
                    ${cardsView.map((card) => `
                        <div class="season-summary-transfer-glance-card season-summary-captain-glance-card">
                            <div class="season-summary-transfer-glance-label">${escapeHtml(card.label)}</div>
                            <div class="season-summary-transfer-glance-value">${escapeHtml(card.value)}</div>
                            <div class="season-summary-transfer-glance-note">${escapeHtml(card.note)}</div>
                        </div>
                    `).join("")}
                </div>
                <div class="season-summary-transfer-story-list season-summary-captain-story-list">
                    <p class="season-summary-transfer-story-paragraph">${paragraphOne}</p>
                    <p class="season-summary-transfer-story-paragraph">${paragraphTwo}</p>
                    <p class="season-summary-transfer-story-paragraph">${paragraphThree}</p>
                    <p class="season-summary-transfer-story-paragraph">${paragraphFour}</p>
                </div>
            </div>
        `;
    }

    function renderPages(profile) {
        return `
            ${renderCoverPage(profile)}

            ${renderTransferPage(profile)}

            ${renderCaptainPage(profile)}

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

    function renderPlayerDetailsStory(profile) {
        const details = profile?.player_details?.summary || {};
        const totalUniquePlayers = Number(details.total_unique_players || 0);
        const averagePlayerScore = Number(details.average_player_score || 0);
        const averageHoldDays = Number(details.average_hold_days || 0);
        const seasonDays = Number(details.season_days || 0);
        const leaguePercentile = Number(details.league_percentile || 0);
        const lowestOwnershipPlayer = details.lowest_ownership_player || null;
        const longestHold = details.longest_hold || null;
        const mark = (value) => `<strong class="season-summary-transfer-emphasis">${escapeHtml(value)}</strong>`;

        const cards = [
            {
                label: "持有球员总人数",
                value: `${formatSummaryNumber(totalUniquePlayers)}人`,
                note: "整个赛季进入过阵容的不同球员",
            },
            {
                label: "平均持有球员分数",
                value: `${formatSummaryDecimal(averagePlayerScore)}分`,
                note: leaguePercentile ? `超过这个联盟${formatSummaryNumber(leaguePercentile)}%的玩家` : "按本联盟玩家口径估算",
            },
            {
                label: "平均持有球员天数",
                value: `${formatSummaryDecimal(averageHoldDays)}天`,
                note: `${formatSummaryNumber(seasonDays)}个比赛日里的平均陪伴`,
            },
        ];

        const paragraphOne = `整个赛季你一共选过${mark(formatSummaryNumber(totalUniquePlayers))}名不同的球员，即使可能你并不是他们的球迷，却也见证了他们为你上分的努力；这${mark(formatSummaryNumber(totalUniquePlayers))}名球员平均每一个人能在每个比赛日给你拿下${mark(formatSummaryDecimal(averagePlayerScore))}分，超过这个联盟${mark(formatSummaryNumber(leaguePercentile))}%的玩家，似乎你的每一个选择都充满着智慧。`;
        const paragraphTwo = lowestOwnershipPlayer?.player_name
            ? `${mark(lowestOwnershipPlayer.player_name)}是你选择过持有率最低的球员，全服持有率仅有${mark(`${formatSummaryDecimal(lowestOwnershipPlayer.ownership_percent)}%`)}，这位宝藏球员也没有辜负你的信任，在你持有他的${mark(formatSummaryNumber(lowestOwnershipPlayer.days_held))}天里平均每场砍下${mark(formatSummaryDecimal(lowestOwnershipPlayer.average_points))}分，群友们都夸你是 DIFF 大师！`
            : "这个赛季你也曾把目光投向一些不那么热门的名字，正是这些看起来离谱的决定，慢慢拼出了只属于你的阵容性格。";
        const paragraphThree = longestHold?.player_name
            ? `在短短${mark(formatSummaryNumber(seasonDays))}个比赛日里，平均每一位球员在你阵容中能停留${mark(formatSummaryDecimal(averageHoldDays))}天，相遇短暂，希望他们也在你的 fantasy 故事中留下了美好的一页；不过，不知道你有没有猜到，留在你阵容中最久的人是${mark(longestHold.player_name)}呢，相信陪伴你走过了${mark(formatSummaryNumber(longestHold.days_held))}天，他已经成为你心中的第一爱酱了吧！`
            : `在短短${mark(formatSummaryNumber(seasonDays))}个比赛日里，你的阵容不断迎来送往，平均每一位球员在你这里停留${mark(formatSummaryDecimal(averageHoldDays))}天，这本身就已经是一种只属于 fantasy 的陪伴。`;

        return `
            <div class="season-summary-transfer-copy season-summary-story-shell">
                <div class="season-summary-page-title">球员详情</div>
                ${renderStoryCards(cards, "season-summary-story-cards-player")}
                <div class="season-summary-transfer-story-list season-summary-story-copy">
                    <p class="season-summary-transfer-story-paragraph">${paragraphOne}</p>
                    <p class="season-summary-transfer-story-paragraph">${paragraphTwo}</p>
                    <p class="season-summary-transfer-story-paragraph">${paragraphThree}</p>
                </div>
                <div class="season-summary-story-stage season-summary-story-stage-player">
                    ${renderStoryAvatar(lowestOwnershipPlayer?.headshot_url, lowestOwnershipPlayer?.player_name, "season-summary-story-avatar-player season-summary-story-avatar-player-left")}
                    ${renderStoryAvatar(longestHold?.headshot_url, longestHold?.player_name, "season-summary-story-avatar-player season-summary-story-avatar-player-right")}
                </div>
            </div>
        `;
    }

    function renderPlayerDetailsPage(profile) {
        return `
            <section class="season-summary-page season-summary-page-transfer season-summary-page-player-details">
                <div class="season-summary-main season-summary-transfer-main season-summary-transfer-main-full">
                    ${renderPlayerDetailsStory(profile)}
                </div>
            </section>
        `;
    }

    function renderTransferStory(profile) {
        const transfers = profile?.transfers || {};
        const summary = transfers.summary || {};
        const totalTransfers = Number(summary.total_transfers || 0);
        const activeWeeks = Number(summary.active_weeks || 0);
        const seasonWeeks = Number(summary.season_weeks || 24);
        const penaltyPoints = Number(summary.penalty_points || 0);
        const transferEveryWeek = !!summary.transfer_every_week;
        const mostIn = summary.most_in || null;
        const mostOut = summary.most_out || null;
        const favoriteDay = summary.favorite_day || null;
        const favoriteTimeSlot = summary.favorite_time_slot || null;
        const timeSlotLabel = String(favoriteTimeSlot?.full_label || "--");
        const startHour = Number(String(favoriteTimeSlot?.label || favoriteTimeSlot?.full_label || "").split(":")[0]);
        const favoriteDayNumber = Number(favoriteDay?.day || 0);
        const mark = (value) => `<strong class="season-summary-transfer-emphasis">${escapeHtml(value)}</strong>`;

        const cards = [
            { label: "总换人次数", value: `${formatSummaryNumber(totalTransfers)}次`, note: "不含 WC / AS" },
            { label: "操作周数", value: `${formatSummaryNumber(activeWeeks)}/${formatSummaryNumber(seasonWeeks)}`, note: transferEveryWeek ? "每一周都坚持换人" : "并不是每周都要把 FT 用完" },
            { label: "扣分总计", value: penaltyPoints > 0 ? `-${formatSummaryNumber(penaltyPoints)}` : "0", note: penaltyPoints > 200 ? "大胆而奔放的操作" : "谨慎精确的节奏" },
            { label: "偏爱换人时段", value: timeSlotLabel, note: favoriteTimeSlot?.count ? `${formatSummaryNumber(favoriteTimeSlot.count)}次发生在这里` : "这季还没有固定生物钟" },
        ];

        const paragraphOne = `这个赛季总共转会${mark(formatSummaryNumber(totalTransfers))}次，${transferEveryWeek ? "并且每一周都坚持换人，相信最终的排名没有辜负你的努力~" : "机智的你选择以逸待劳，并不是把 FT 用完才是最好的选择。"}${penaltyPoints > 200 ? `整个赛季一共扣过${mark(`-${formatSummaryNumber(penaltyPoints)}`)}分，大胆而奔放的操作决定了你的上限。` : `整个赛季一共扣过${mark(`-${formatSummaryNumber(penaltyPoints)}`)}分，谨慎精确才是你的代名词。`}`;
        const paragraphTwo = mostIn?.name && mostOut?.name
            ? `${mark(mostIn.name)}被你换进来了${mark(formatSummaryNumber(mostIn.count))}次，是你心心念念的那个人吗？希望他的表现没有让你失望；而${mark(mostOut.name)}被你送走了${mark(formatSummaryNumber(mostOut.count))}次，想必他的表现你也看在眼里吧。`
            : "这个赛季你换人的节奏很有个人风格，人来人往之间，喜爱和犹豫都写在每一笔转会里。";

        let timeSentence = "你的换人时机并不完全固定，很多决定像是顺着比赛的节奏自然发生。";
        if (Number.isFinite(startHour)) {
            if (startHour >= 8 && startHour < 20) timeSentence = `你好像更喜欢在${mark(timeSlotLabel)}换人，伤病报告都是小事，心情＞fantasy。`;
            if (startHour >= 20 && startHour < 24) timeSentence = `你好像更喜欢在${mark(timeSlotLabel)}换人，谨慎而大胆的选择，等到消息更完整再操作，也不耽误睡觉时间。`;
            if (startHour >= 0 && startHour < 6) timeSentence = `你好像更喜欢在${mark(timeSlotLabel)}换人，夜生活才是你的舞台，必须看到我的球员 available 再睡觉。`;
            if (startHour >= 6 && startHour < 8) timeSentence = `你好像更喜欢在${mark(timeSlotLabel)}换人，全服最谨慎的玩家，早起闹钟定好，守着 ddl 落子无悔。`;
        }

        let daySentence = "";
        if (favoriteDayNumber >= 1 && favoriteDayNumber <= 3) daySentence = `${mark(`Day${favoriteDayNumber}`)}也是你最常出手的日子，拿到 FT 就该趁早用。`;
        if (favoriteDayNumber >= 4 && favoriteDayNumber <= 7) daySentence = `经常把转会留到${mark(`Day${favoriteDayNumber}`)}再出手，不仅规划得当，而且沉得住气。`;
        const paragraphThree = [timeSentence, daySentence].filter(Boolean).join("");

        return `
            <div class="season-summary-transfer-copy season-summary-story-shell">
                <div class="season-summary-page-title">转会详情</div>
                ${renderStoryCards(cards, "season-summary-story-cards-transfer")}
                <div class="season-summary-transfer-story-list season-summary-story-copy">
                    <p class="season-summary-transfer-story-paragraph">${paragraphOne}</p>
                    <p class="season-summary-transfer-story-paragraph">${paragraphTwo}</p>
                    <p class="season-summary-transfer-story-paragraph">${paragraphThree}</p>
                </div>
                ${renderStoryAvatarStrip([mostIn, mostOut], " season-summary-story-avatar-strip-transfer")}
            </div>
        `;
    }

    function renderTransferPage(profile) {
        return `
            <section class="season-summary-page season-summary-page-transfer">
                <div class="season-summary-main season-summary-transfer-main season-summary-transfer-main-full">
                    ${renderTransferStory(profile)}
                </div>
            </section>
        `;
    }

    function renderCaptainStory(profile) {
        const captain = profile?.captain || {};
        const summary = captain.summary || {};
        const totalWeeks = Number(summary.total_weeks || 25);
        const useCount = Number(summary.use_count || 0);
        const totalPoints = Number(summary.total_points || 0);
        const averagePoints = Number(summary.average_points || 0);
        const leaguePercentile = Number(summary.league_percentile || 0);
        const favoriteCaptain = summary.favorite_captain || null;
        const bestCaptain = summary.best || null;
        const worstCaptain = summary.worst || null;
        const lowestOwnership = summary.lowest_ownership || null;
        const zeroCount = Number(summary.zero_count || 0);
        const favoriteName = String(favoriteCaptain?.captain_name || "暂无");
        const favoriteAvg = Number(favoriteCaptain?.average_points || 0);
        const favoriteSeasonAvg = Number(favoriteCaptain?.season_average_points || 0);
        const averageDelta = Number((favoriteAvg - favoriteSeasonAvg).toFixed(1));
        const favoriteIsJokic = favoriteName === "N.Jokic";
        const countNote = useCount >= totalWeeks ? "一次都没忘，太能操作了！" : "咦，你还留了一手";
        const lowestLabel = lowestOwnership ? `GW${formatSummaryNumber(lowestOwnership.gw)} Day${formatSummaryNumber(lowestOwnership.day)}` : "暂无记录";
        const mark = (value) => `<strong class="season-summary-transfer-emphasis">${escapeHtml(value)}</strong>`;

        const cards = [
            { label: "Captain 次数", value: `${formatSummaryNumber(useCount)}/${formatSummaryNumber(totalWeeks)}`, note: countNote },
            { label: "队长平均得分", value: `${formatSummaryDecimal(averagePoints)}分`, note: `超过${formatSummaryNumber(leaguePercentile)}%的玩家` },
            { label: "最常选择的队长", value: favoriteName, note: favoriteCaptain ? `${formatSummaryNumber(favoriteCaptain.count)}次` : "还没形成固定偏爱" },
            { label: "最低持有率 Captain", value: lowestOwnership?.captain_name || "暂无", note: lowestLabel },
        ];

        const paragraphOne = `在这个没有 vc 的游戏中队长的选择就显得尤为关键，这个赛季你一共开了${mark(formatSummaryNumber(useCount))}次 Captain，累计拿到了${mark(formatSummaryNumber(totalPoints))}分，平均每个队长都能拿到${mark(formatSummaryDecimal(averagePoints))}分，超过了这个联盟${mark(formatSummaryNumber(leaguePercentile))}%的玩家！`;

        let paragraphTwo = "这个赛季你的 Captain 选择并没有只跟着模板走，而是慢慢形成了自己熟悉的偏好。";
        if (favoriteCaptain?.captain_name) {
            if (favoriteIsJokic) {
                paragraphTwo = `${mark(favoriteCaptain.captain_name)}是你经常选择的队长，他也是很多人青睐的队长人选，跟着主流走永远不会错。你每次选他当队长平均能够拿下${mark(formatSummaryDecimal(favoriteAvg))}分，比他这个赛季的平均分数${averageDelta >= 0 ? "高" : "低"}${mark(formatSummaryDecimal(Math.abs(averageDelta)))}分，${averageDelta >= 0 ? "你不仅很懂这个游戏，更懂这个塞尔维亚大胖子。" : "看来你选队长的时机还可以再打磨一下。"}`;
            } else {
                paragraphTwo = `什么？！你最常选的队长居然不是约基奇？看来你的品味非常之独特，保持特立独行永远是范特西游戏中最酷的精神，继续保持！你每次选${mark(favoriteCaptain.captain_name)}当队长平均能够拿下${mark(formatSummaryDecimal(favoriteAvg))}分，比他这个赛季的平均分数${averageDelta >= 0 ? "高" : "低"}${mark(formatSummaryDecimal(Math.abs(averageDelta)))}分，${averageDelta >= 0 ? "你不仅很懂这个游戏，更懂这名球员。" : "看来你选队长的时机还可以再打磨一下。"}`;
            }
        }

        const paragraphThree = bestCaptain?.captain_name && worstCaptain?.captain_name
            ? `最高分的一次队长来自${mark(bestCaptain.label || "")} · ${mark(bestCaptain.captain_name)} · ${mark(`${formatSummaryNumber(bestCaptain.captain_points)}分`)}；而最让人难过的那次，则是${mark(worstCaptain.label || "")} · ${mark(worstCaptain.captain_name)} · ${mark(`${formatSummaryNumber(worstCaptain.captain_points)}分`)}。整个赛季你一共 c 到过${mark(formatSummaryNumber(zeroCount))}次0分，${zeroCount > 0 ? "哎，运气也是这个游戏的一部分，希望你不要灰心，一个赛季总有起起伏伏。" : "不得不承认你真的太会选队长了。"}`
            : "等 Captain 记录再丰富一点，这一页会更像属于你自己的队长回忆录。";

        const paragraphFour = lowestOwnership?.captain_name
            ? `如果要说最 diff 的那一次，大概就是${mark(`GW${formatSummaryNumber(lowestOwnership.gw)} Day${formatSummaryNumber(lowestOwnership.day)}`)}的${mark(lowestOwnership.captain_name)}了。当时他的持有率只有${mark(`${formatSummaryDecimal(lowestOwnership.ownership_percent)}%`)}，却依然替你拿下了${mark(`${formatSummaryNumber(lowestOwnership.captain_points)}分`)}，勇气可嘉，值得陈赞！`
            : "这个赛季你最像 DIFF 大师的那一次，还在等下一版数据把它完整抓出来。";

        return `
            <div class="season-summary-transfer-copy season-summary-story-shell season-summary-captain-copy">
                <div class="season-summary-page-title">队长选择</div>
                ${renderStoryCards(cards, "season-summary-story-cards-captain")}
                <div class="season-summary-transfer-story-list season-summary-story-copy">
                    <p class="season-summary-transfer-story-paragraph">${paragraphOne}</p>
                    <p class="season-summary-transfer-story-paragraph">${paragraphTwo}</p>
                    <p class="season-summary-transfer-story-paragraph">${paragraphThree}</p>
                    <p class="season-summary-transfer-story-paragraph">${paragraphFour}</p>
                </div>
                ${renderStoryAvatarStrip([favoriteCaptain, bestCaptain, worstCaptain, lowestOwnership], " season-summary-story-avatar-strip-captain")}
            </div>
        `;
    }

    function renderCaptainPage(profile) {
        return `
            <section class="season-summary-page season-summary-page-captain">
                <div class="season-summary-main season-summary-transfer-main season-summary-transfer-main-full">
                    ${renderCaptainStory(profile)}
                </div>
            </section>
        `;
    }

    function renderHighlightsStory(profile) {
        const highlights = profile?.highlights || {};
        const cards = (Array.isArray(highlights.cards) ? highlights.cards : []).map((item) => ({
            label: item?.[0] || "",
            value: item?.[1] || "-",
            note: item?.[2] || "",
        }));
        const bestDay = cards[0] || { label: "赛季最高单日", value: "-", note: "" };
        const bestRank = cards[1] || { label: "最高全球排名", value: "-", note: "" };
        const seasonTag = cards[2] || { label: "赛季标签", value: "-", note: "" };
        const mark = (value) => `<strong class="season-summary-transfer-emphasis">${escapeHtml(value)}</strong>`;
        const paragraphOne = bestDay.note
            ? `${mark(bestDay.note)}大概会是你这个赛季最容易被重新想起的一天，那天你一口气拿到了${mark(bestDay.value)}，整支队伍像是一起把运气和手感都推到了高点。`
            : "总会有那么一天，你的阵容像突然一起开花，那种成就感会让人忍不住反复回看。";
        const paragraphTwo = bestRank.note
            ? `${mark(bestRank.note)}你把自己的全球排名推到了${mark(bestRank.value)}，比起一场比赛的输赢，这种站上更高位置的瞬间更像赛季里真正的高光。`
            : "有些高光不只是分数本身，而是你终于看到自己在更大榜单里往上爬的那一刻。";
        const paragraphThree = `至于这个赛季最终像哪一种故事，${mark(seasonTag.value)}大概最接近你的气质。${escapeHtml(highlights.quote || "高光从来不只是某一天的数据，而是整整一个赛季里你留下的手感与判断。")}`;

        return `
            <div class="season-summary-transfer-copy season-summary-story-shell season-summary-highlights-copy">
                <div class="season-summary-page-title">高光时刻</div>
                ${renderStoryCards(cards, "season-summary-story-cards-highlights")}
                <div class="season-summary-transfer-story-list season-summary-story-copy">
                    <p class="season-summary-transfer-story-paragraph">${paragraphOne}</p>
                    <p class="season-summary-transfer-story-paragraph">${paragraphTwo}</p>
                    <p class="season-summary-transfer-story-paragraph">${paragraphThree}</p>
                </div>
            </div>
        `;
    }

    function renderHighlightsPage(profile) {
        return `
            <section class="season-summary-page season-summary-page-highlights">
                <div class="season-summary-main season-summary-transfer-main season-summary-transfer-main-full">
                    ${renderHighlightsStory(profile)}
                </div>
            </section>
        `;
    }

    function renderPlayerDetailsStoryV2(profile) {
        const details = profile?.player_details?.summary || {};
        const totalUniquePlayers = Number(details.total_unique_players || 0);
        const averagePlayerScore = Number(details.average_player_score || 0);
        const averageHoldDays = Number(details.average_hold_days || 0);
        const seasonDays = Number(details.season_days || 0);
        const leaguePercentile = Number(details.league_percentile || 0);
        const lowestOwnershipPlayer = details.lowest_ownership_player || null;
        const longestHold = details.longest_hold || null;
        const mark = (value) => `<strong class="season-summary-transfer-emphasis">${escapeHtml(value)}</strong>`;

        const cards = [
            {
                label: "持有球员总人数",
                value: `${formatSummaryNumber(totalUniquePlayers)}人`,
                note: "整个赛季进入过阵容的不同球员",
            },
            {
                label: "平均持有球员分数",
                value: `${formatSummaryDecimal(averagePlayerScore)}分`,
                note: leaguePercentile ? `超过这个联盟${formatSummaryNumber(leaguePercentile)}%的玩家` : "按本联盟玩家口径估算",
            },
            {
                label: "平均持有球员天数",
                value: `${formatSummaryDecimal(averageHoldDays)}天`,
                note: `${formatSummaryNumber(seasonDays)}个比赛日里的平均陪伴`,
            },
        ];

        const paragraphOne = `整个赛季你一共选过${mark(formatSummaryNumber(totalUniquePlayers))}名不同的球员，即使可能你并不是他们的球迷，却也见证了他们为你上分的努力；这${mark(formatSummaryNumber(totalUniquePlayers))}名球员平均每一个人能在每个比赛日给你拿下${mark(formatSummaryDecimal(averagePlayerScore))}分，超过这个联盟${mark(formatSummaryNumber(leaguePercentile))}%的玩家，似乎你的每一个选择都充满着智慧。`;
        const paragraphTwo = lowestOwnershipPlayer?.player_name
            ? `${renderInlinePlayerMention(lowestOwnershipPlayer)}是你选择过持有率最低的球员，全服持有率仅有${mark(`${formatSummaryDecimal(lowestOwnershipPlayer.ownership_percent)}%`)}，这位宝藏球员也没有辜负你的信任，在你持有他的${mark(formatSummaryNumber(lowestOwnershipPlayer.days_held))}天里平均每场砍下${mark(formatSummaryDecimal(lowestOwnershipPlayer.average_points))}分，群友们都夸你是 DIFF 大师！`
            : "这个赛季你也曾把目光投向一些不那么热门的名字，正是这些看起来离谱的决定，慢慢拼出了只属于你的阵容性格。";
        const paragraphThree = longestHold?.player_name
            ? `在短短${mark(formatSummaryNumber(seasonDays))}个比赛日里，平均每一位球员在你阵容中能停留${mark(formatSummaryDecimal(averageHoldDays))}天，相遇短暂，希望他们也在你的 fantasy 故事中留下了美好的一页；不过，不知道你有没有猜到，留在你阵容中最久的人是${renderInlinePlayerMention(longestHold)}呢，相信陪伴你走过了${mark(formatSummaryNumber(longestHold.days_held))}天，他已经成为你心中的第一爱酱了吧！`
            : `在短短${mark(formatSummaryNumber(seasonDays))}个比赛日里，你的阵容不断迎来送往，平均每一位球员在你这里停留${mark(formatSummaryDecimal(averageHoldDays))}天，这本身就已经是一种只属于 fantasy 的陪伴。`;

        return `
            <div class="season-summary-transfer-copy season-summary-story-shell">
                <div class="season-summary-page-title">球员详情</div>
                ${renderStoryCards(cards, "season-summary-story-cards-player")}
                <div class="season-summary-transfer-story-list season-summary-story-copy">
                    <p class="season-summary-transfer-story-paragraph">${paragraphOne}</p>
                    <p class="season-summary-transfer-story-paragraph">${paragraphTwo}</p>
                    <p class="season-summary-transfer-story-paragraph">${paragraphThree}</p>
                </div>
            </div>
        `;
    }

    function renderPlayerDetailsPageV2(profile) {
        return `
            <section class="season-summary-page season-summary-page-transfer season-summary-page-player-details">
                <div class="season-summary-main season-summary-transfer-main season-summary-transfer-main-full">
                    ${renderPlayerDetailsStoryV2(profile)}
                </div>
            </section>
        `;
    }

    function renderTransferStoryV2(profile) {
        const transfers = profile?.transfers || {};
        const summary = transfers.summary || {};
        const totalTransfers = Number(summary.total_transfers || 0);
        const activeWeeks = Number(summary.active_weeks || 0);
        const seasonWeeks = Number(summary.season_weeks || 24);
        const penaltyPoints = Number(summary.penalty_points || 0);
        const transferEveryWeek = !!summary.transfer_every_week;
        const mostIn = summary.most_in || null;
        const mostOut = summary.most_out || null;
        const favoriteDay = summary.favorite_day || null;
        const favoriteTimeSlot = summary.favorite_time_slot || null;
        const timeSlotLabel = String(favoriteTimeSlot?.full_label || "--");
        const startHour = Number(String(favoriteTimeSlot?.label || favoriteTimeSlot?.full_label || "").split(":")[0]);
        const favoriteDayNumber = Number(favoriteDay?.day || 0);
        const mark = (value) => `<strong class="season-summary-transfer-emphasis">${escapeHtml(value)}</strong>`;

        const cards = [
            { label: "总换人次数", value: `${formatSummaryNumber(totalTransfers)}次`, note: "不含 WC / AS" },
            { label: "操作周数", value: `${formatSummaryNumber(activeWeeks)}/${formatSummaryNumber(seasonWeeks)}`, note: transferEveryWeek ? "每一周都坚持换人" : "并不是每周都要把 FT 用完" },
            { label: "扣分总计", value: penaltyPoints > 0 ? `-${formatSummaryNumber(penaltyPoints)}` : "0", note: penaltyPoints > 200 ? "大胆而奔放的操作" : "谨慎精确的节奏" },
            { label: "偏爱换人时段", value: timeSlotLabel, note: favoriteTimeSlot?.count ? `${formatSummaryNumber(favoriteTimeSlot.count)}次发生在这里` : "这季还没有固定生物钟" },
        ];

        const paragraphOne = `这个赛季总共转会${mark(formatSummaryNumber(totalTransfers))}次，${transferEveryWeek ? "并且每一周都坚持换人，相信最终的排名没有辜负你的努力~" : "机智的你选择以逸待劳，并不是把 FT 用完才是最好的选择。"}${penaltyPoints > 200 ? `整个赛季一共扣过${mark(`-${formatSummaryNumber(penaltyPoints)}`)}分，大胆而奔放的操作决定了你的上限。` : `整个赛季一共扣过${mark(`-${formatSummaryNumber(penaltyPoints)}`)}分，谨慎精确才是你的代名词。`}`;
        const paragraphTwo = mostIn?.name && mostOut?.name
            ? `${renderInlinePlayerMention(mostIn)}被你换进来了${mark(formatSummaryNumber(mostIn.count))}次，是你心心念念的那个人吗？希望他的表现没有让你失望；而${renderInlinePlayerMention(mostOut)}被你送走了${mark(formatSummaryNumber(mostOut.count))}次，想必他的表现你也看在眼里吧。`
            : "这个赛季你换人的节奏很有个人风格，人来人往之间，喜爱和犹豫都写在每一笔转会里。";

        let timeSentence = "你的换人时机并不完全固定，很多决定像是顺着比赛的节奏自然发生。";
        if (Number.isFinite(startHour)) {
            if (startHour >= 8 && startHour < 20) timeSentence = `你好像更喜欢在${mark(timeSlotLabel)}换人，伤病报告都是小事，心情＞fantasy。`;
            if (startHour >= 20 && startHour < 24) timeSentence = `你好像更喜欢在${mark(timeSlotLabel)}换人，谨慎而大胆的选择，等到消息更完整再操作，也不耽误睡觉时间。`;
            if (startHour >= 0 && startHour < 6) timeSentence = `你好像更喜欢在${mark(timeSlotLabel)}换人，夜生活才是你的舞台，必须看到我的球员 available 再睡觉。`;
            if (startHour >= 6 && startHour < 8) timeSentence = `你好像更喜欢在${mark(timeSlotLabel)}换人，全服最谨慎的玩家，早起闹钟定好，守着 ddl 落子无悔。`;
        }

        let daySentence = "";
        if (favoriteDayNumber >= 1 && favoriteDayNumber <= 3) daySentence = `${mark(`Day${favoriteDayNumber}`)}也是你最常出手的日子，拿到 FT 就该趁早用。`;
        if (favoriteDayNumber >= 4 && favoriteDayNumber <= 7) daySentence = `经常把转会留到${mark(`Day${favoriteDayNumber}`)}再出手，不仅规划得当，而且沉得住气。`;
        const paragraphThree = [timeSentence, daySentence].filter(Boolean).join("");

        return `
            <div class="season-summary-transfer-copy season-summary-story-shell">
                <div class="season-summary-page-title">转会详情</div>
                ${renderStoryCards(cards, "season-summary-story-cards-transfer")}
                <div class="season-summary-transfer-story-list season-summary-story-copy">
                    <p class="season-summary-transfer-story-paragraph">${paragraphOne}</p>
                    <p class="season-summary-transfer-story-paragraph">${paragraphTwo}</p>
                    <p class="season-summary-transfer-story-paragraph">${paragraphThree}</p>
                </div>
            </div>
        `;
    }

    function renderTransferPageV2(profile) {
        return `
            <section class="season-summary-page season-summary-page-transfer">
                <div class="season-summary-main season-summary-transfer-main season-summary-transfer-main-full">
                    ${renderTransferStoryV2(profile)}
                </div>
            </section>
        `;
    }

    function renderCaptainStoryV2(profile) {
        const captain = profile?.captain || {};
        const summary = captain.summary || {};
        const totalWeeks = Number(summary.total_weeks || 25);
        const useCount = Number(summary.use_count || 0);
        const totalPoints = Number(summary.total_points || 0);
        const averagePoints = Number(summary.average_points || 0);
        const leaguePercentile = Number(summary.league_percentile || 0);
        const favoriteCaptain = summary.favorite_captain || null;
        const bestCaptain = summary.best || null;
        const worstCaptain = summary.worst || null;
        const lowestOwnership = summary.lowest_ownership || null;
        const zeroCount = Number(summary.zero_count || 0);
        const favoriteName = String(favoriteCaptain?.captain_name || "暂无");
        const favoriteAvg = Number(favoriteCaptain?.average_points || 0);
        const favoriteSeasonAvg = Number(favoriteCaptain?.season_average_points || 0);
        const averageDelta = Number((favoriteAvg - favoriteSeasonAvg).toFixed(1));
        const favoriteIsJokic = favoriteName === "N.Jokic";
        const countNote = useCount >= totalWeeks ? "一次都没忘，太能操作了！" : "咦，你还留了一手";
        const lowestLabel = lowestOwnership ? `GW${formatSummaryNumber(lowestOwnership.gw)} Day${formatSummaryNumber(lowestOwnership.day)}` : "暂无记录";
        const mark = (value) => `<strong class="season-summary-transfer-emphasis">${escapeHtml(value)}</strong>`;

        const cards = [
            { label: "Captain 次数", value: `${formatSummaryNumber(useCount)}/${formatSummaryNumber(totalWeeks)}`, note: countNote },
            { label: "队长平均得分", value: `${formatSummaryDecimal(averagePoints)}分`, note: `超过${formatSummaryNumber(leaguePercentile)}%的玩家` },
            { label: "最常选择的队长", value: favoriteName, note: favoriteCaptain ? `${formatSummaryNumber(favoriteCaptain.count)}次` : "还没形成固定偏爱" },
            { label: "最低持有率 Captain", value: lowestOwnership?.captain_name || "暂无", note: lowestLabel },
        ];

        const paragraphOne = `在这个没有 vc 的游戏中队长的选择就显得尤为关键，这个赛季你一共开了${mark(formatSummaryNumber(useCount))}次 Captain，累计拿到了${mark(formatSummaryNumber(totalPoints))}分，平均每个队长都能拿到${mark(formatSummaryDecimal(averagePoints))}分，超过了这个联盟${mark(formatSummaryNumber(leaguePercentile))}%的玩家！`;

        let paragraphTwo = "这个赛季你的 Captain 选择并没有只跟着模板走，而是慢慢形成了自己熟悉的偏好。";
        if (favoriteCaptain?.captain_name) {
            if (favoriteIsJokic) {
                paragraphTwo = `${renderInlinePlayerMention(favoriteCaptain)}是你经常选择的队长，他也是很多人青睐的队长人选，跟着主流走永远不会错。你每次选他当队长平均能够拿下${mark(formatSummaryDecimal(favoriteAvg))}分，比他这个赛季的平均分数${averageDelta >= 0 ? "高" : "低"}${mark(formatSummaryDecimal(Math.abs(averageDelta)))}分，${averageDelta >= 0 ? "你不仅很懂这个游戏，更懂这个塞尔维亚大胖子。" : "看来你选队长的时机还可以再打磨一下。"}`;
            } else {
                paragraphTwo = `什么？！你最常选的队长居然不是约基奇？看来你的品味非常之独特，保持特立独行永远是范特西游戏中最酷的精神，继续保持！你每次选${renderInlinePlayerMention(favoriteCaptain)}当队长平均能够拿下${mark(formatSummaryDecimal(favoriteAvg))}分，比他这个赛季的平均分数${averageDelta >= 0 ? "高" : "低"}${mark(formatSummaryDecimal(Math.abs(averageDelta)))}分，${averageDelta >= 0 ? "你不仅很懂这个游戏，更懂这名球员。" : "看来你选队长的时机还可以再打磨一下。"}`;
            }
        }

        const paragraphThree = bestCaptain?.captain_name && worstCaptain?.captain_name
            ? `最高分的一次队长来自${mark(bestCaptain.label || "")} · ${renderInlinePlayerMention(bestCaptain)} · ${mark(`${formatSummaryNumber(bestCaptain.captain_points)}分`)}；而最让人难过的那次，则是${mark(worstCaptain.label || "")} · ${renderInlinePlayerMention(worstCaptain)} · ${mark(`${formatSummaryNumber(worstCaptain.captain_points)}分`)}。整个赛季你一共 c 到过${mark(formatSummaryNumber(zeroCount))}次 0 分，${zeroCount > 0 ? "哎，运气也是这个游戏的一部分，希望你不要灰心，一个赛季总有起起伏伏。" : "不得不承认你真的太会选队长了。" }`
            : "等 Captain 记录再丰富一点，这一页会更像属于你自己的队长回忆录。";

        const paragraphFour = lowestOwnership?.captain_name
            ? `如果要说最 diff 的那一次，大概就是${mark(`GW${formatSummaryNumber(lowestOwnership.gw)} Day${formatSummaryNumber(lowestOwnership.day)}`)}的${renderInlinePlayerMention(lowestOwnership)}了。当时他的持有率只有${mark(`${formatSummaryDecimal(lowestOwnership.ownership_percent)}%`)}，却依然替你拿下了${mark(`${formatSummaryNumber(lowestOwnership.captain_points)}分`)}，勇气可嘉，值得陈赞！`
            : "这个赛季你最像 DIFF 大师的那一次，还在等下一版数据把它完整抓出来。";

        return `
            <div class="season-summary-transfer-copy season-summary-story-shell season-summary-captain-copy">
                <div class="season-summary-page-title">队长选择</div>
                ${renderStoryCards(cards, "season-summary-story-cards-captain")}
                <div class="season-summary-transfer-story-list season-summary-story-copy">
                    <p class="season-summary-transfer-story-paragraph">${paragraphOne}</p>
                    <p class="season-summary-transfer-story-paragraph">${paragraphTwo}</p>
                    <p class="season-summary-transfer-story-paragraph">${paragraphThree}</p>
                    <p class="season-summary-transfer-story-paragraph">${paragraphFour}</p>
                </div>
            </div>
        `;
    }

    function renderCaptainPageV2(profile) {
        return `
            <section class="season-summary-page season-summary-page-captain">
                <div class="season-summary-main season-summary-transfer-main season-summary-transfer-main-full">
                    ${renderCaptainStoryV2(profile)}
                </div>
            </section>
        `;
    }

    function renderPages(profile) {
        return `
            ${renderCoverPage(profile)}
            ${renderPlayerDetailsPageV2(profile)}
            ${renderTransferPageV2(profile)}
            ${renderCaptainPageV2(profile)}
            ${renderHighlightsPage(profile)}
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
