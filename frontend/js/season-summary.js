(function () {
    const DEFAULT_PAGE_COUNT = 6;
    const INTRO_EXIT_MS = 860;

    const TRANSFER_TIME_COPY_TEMPLATES = [
        {
            key: "daytime",
            match: (startHour) => startHour >= 8 && startHour < 20,
            text: "你好像更喜欢在{slot}换人，伤病报告都是小事，心情＞fantasy。",
        },
        {
            key: "late-night",
            match: (startHour) => startHour >= 20 && startHour < 24,
            text: "你好像更喜欢在{slot}换人，谨慎而大胆的选择，等到消息更完整再操作，也不耽误睡觉时间。",
        },
        {
            key: "overnight",
            match: (startHour) => startHour >= 0 && startHour < 6,
            text: "你好像更喜欢在{slot}换人，你在{example_time}还在犹豫要不要把{example_player}换进来，希望他的表现没有让你失望。",
        },
        {
            key: "early-morning",
            match: (startHour) => startHour >= 6 && startHour < 8,
            text: "你好像更喜欢在{slot}换人，定闹钟早起刷消息，伍哥别装了，我知道是你~",
        },
    ];

    const TRANSFER_DAY_COPY_TEMPLATES = [
        {
            key: "early-day",
            match: (day) => day >= 1 && day <= 3,
            text: "{day}也是你最常出手的日子，拿到 FT 就该趁早用。",
        },
        {
            key: "late-day",
            match: (day) => day >= 4 && day <= 7,
            text: "经常把转会留到{day}再出手，不仅规划得当，而且沉得住气。",
        },
    ];

    const TRANSFER_TIMING_FALLBACK = "至于换人的钟点，你更像是顺着消息和感觉走，不会被单一节奏彻底绑住。";
    const TRANSFER_DAY_FALLBACK = "至于哪一天最爱出手，你更像是根据局势和伤病灵活应变，不会轻易把自己绑在固定脚本里。";

    const state = {
        currentPage: 0,
        lastUid: "",
        loadToken: 0,
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

    function fillTemplate(template, tokens) {
        return String(template || "").replace(/\{(\w+)\}/g, (_, key) => String(tokens?.[key] ?? ""));
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
        const target = `${base}/api/season-summary?uid=${encodeURIComponent(uid)}&_=${Date.now()}`;
        const response = await fetch(target, { cache: "no-store" });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || data?.success === false) {
            throw new Error(data?.error || `Request failed: ${response.status}`);
        }
        return data;
    }

    async function requestHighlightLineup(uid, eventId, captainEnabled = false) {
        const normalizedUid = String(uid || "").trim();
        const safeEventId = Number(eventId || 0);
        if (!normalizedUid || !safeEventId) return null;

        const base = (window.__API_BASE__ || "").trim().replace(/\/+$/, "");
        const target = `${base}/api/season-summary-highlight-lineup?uid=${encodeURIComponent(normalizedUid)}&event=${encodeURIComponent(safeEventId)}&captain_enabled=${captainEnabled ? "1" : "0"}&_=${Date.now()}`;
        const response = await fetch(target, { cache: "no-store" });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || data?.success === false) {
            throw new Error(data?.error || `Highlight lineup request failed: ${response.status}`);
        }
        return data?.lineup || null;
    }

    async function requestMomentExtras(uid) {
        const normalizedUid = String(uid || "").trim();
        if (!normalizedUid) return null;

        const base = (window.__API_BASE__ || "").trim().replace(/\/+$/, "");
        const target = `${base}/api/season-summary-moments?uid=${encodeURIComponent(normalizedUid)}&_=${Date.now()}`;
        const response = await fetch(target, { cache: "no-store" });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || data?.success === false) {
            throw new Error(data?.error || `Moment extras request failed: ${response.status}`);
        }
        return data || null;
    }

    async function hydrateMomentExtras(profile, uid) {
        const summary = profile?.captain?.summary;
        if (!summary) return false;

        const needsBench = !summary?.bench_best?.player_name;
        const needsValue = !summary?.starter_best_value?.player_name;
        if (!needsBench && !needsValue) return false;
        let updated = false;

        try {
            const extras = await requestMomentExtras(uid);
            if (needsBench && extras?.bench_best?.player_name) {
                summary.bench_best = extras.bench_best;
                updated = true;
            }
            if (needsValue && extras?.starter_best_value?.player_name) {
                summary.starter_best_value = extras.starter_best_value;
                updated = true;
            }
        } catch (error) {
            console.warn("Moment extras hydrate failed:", error);
        }

        return updated;
    }

    async function hydrateHighlightLineups(profile, uid) {
        const summary = profile?.highlights?.summary;
        if (!summary) return false;

        const targets = [
            summary?.best_day ? {
                key: "best_day",
                event: Number(summary.best_day?.event || 0),
                hasLineup: Array.isArray(summary.best_day?.lineup?.players) && summary.best_day.lineup.players.length > 0,
                captainEnabled: !!summary.best_day?.captain_enabled,
            } : null,
            summary?.best_rank ? {
                key: "best_rank",
                event: Number(summary.best_rank?.event || 0),
                hasLineup: Array.isArray(summary.best_rank?.lineup?.players) && summary.best_rank.lineup.players.length > 0,
                captainEnabled: !!summary.best_rank?.captain_enabled,
            } : null,
        ].filter((item) => item && item.event && !item.hasLineup);

        if (!targets.length) return false;

        const results = await Promise.all(
            targets.map(async (target) => {
                try {
                    const lineup = await requestHighlightLineup(uid, target.event, target.captainEnabled);
                    return { key: target.key, lineup };
                } catch (error) {
                    console.warn(`Highlight lineup hydrate failed for ${target.key}:`, error);
                    return null;
                }
            })
        );

        let updated = false;
        for (const result of results) {
            if (!result?.lineup || !Array.isArray(result.lineup?.players) || !result.lineup.players.length) continue;
            if (summary?.[result.key]) {
                summary[result.key].lineup = result.lineup;
                updated = true;
            }
        }

        return updated;
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
        const points = buildCurvePoints(rawPoints, { yMax: maxRank, left: 88, right: 824, top: 76, bottom: 462 });
        const linePath = buildLinePath(points);
        const areaPath = buildAreaPath(points, 462);
        const rankTicks = buildNiceTicks(maxRank, 5);
        const xTicks = sampleXAxisTicks(points, 6);
        const yMax = Math.max(1, rankTicks[rankTicks.length - 1] || maxRank);
        const firstPoint = points[0] || null;
        const latestPoint = points[points.length - 1] || null;
        const bestPoint = points.length
            ? points.reduce((best, current) => (current.rank < best.rank ? current : best), points[0])
            : null;
        const improveCount = firstPoint && latestPoint ? Number(firstPoint.rank || 0) - Number(latestPoint.rank || 0) : 0;
        const improveRate = firstPoint && latestPoint && Number(firstPoint.rank || 0) > 0
            ? (improveCount / Number(firstPoint.rank || 0)) * 100
            : 0;

        return `
            <aside class="season-summary-cover-panel season-summary-cover-or-panel">
                <div class="season-summary-cover-or-head">
                    <div class="season-summary-cover-or-title">OR 曲线</div>
                    <div class="season-summary-cover-or-badges">
                        <div class="season-summary-cover-or-badge">
                            <span class="season-summary-cover-or-badge-label">最终 OR</span>
                            <span class="season-summary-cover-or-badge-value">#${escapeHtml(formatSummaryNumber(latestPoint?.rank || 0))}</span>
                        </div>
                        <div class="season-summary-cover-or-badge">
                            <span class="season-summary-cover-or-badge-label">赛季最佳</span>
                            <span class="season-summary-cover-or-badge-value">#${escapeHtml(formatSummaryNumber(bestPoint?.rank || 0))}</span>
                        </div>
                        <div class="season-summary-cover-or-badge">
                            <span class="season-summary-cover-or-badge-label">累计提升</span>
                            <span class="season-summary-cover-or-badge-value">
                                ${improveCount >= 0 ? "↑" : "↓"}${escapeHtml(formatSummaryNumber(Math.abs(improveCount)))}
                            </span>
                        </div>
                    </div>
                </div>
                <div class="season-summary-cover-chart season-summary-cover-chart-or">
                    <svg viewBox="0 0 880 560" preserveAspectRatio="none" aria-label="OR season curve">
                        <defs>
                            <linearGradient id="season-summary-cover-line" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stop-color="#000000"></stop>
                                <stop offset="60%" stop-color="#151515"></stop>
                                <stop offset="100%" stop-color="#111111"></stop>
                            </linearGradient>
                            <linearGradient id="season-summary-cover-fill" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stop-color="rgba(255, 87, 87, 0.32)"></stop>
                                <stop offset="100%" stop-color="rgba(255, 87, 87, 0.04)"></stop>
                            </linearGradient>
                        </defs>
                        <rect x="88" y="76" width="736" height="386" rx="12" ry="12" class="season-summary-cover-plot-bg"></rect>
                        <g class="season-summary-cover-grid">
                            ${rankTicks.map((tick) => {
                                const y = 76 + (Number(tick || 0) / yMax) * (462 - 76);
                                return `<line x1="88" y1="${y.toFixed(2)}" x2="824" y2="${y.toFixed(2)}"></line>`;
                            }).join("")}
                            ${xTicks.map((point) => `<line x1="${point.x.toFixed(2)}" y1="76" x2="${point.x.toFixed(2)}" y2="462"></line>`).join("")}
                        </g>
                        <line class="season-summary-cover-axis" x1="88" y1="76" x2="88" y2="462"></line>
                        <line class="season-summary-cover-axis" x1="88" y1="462" x2="824" y2="462"></line>
                        ${rankTicks.map((tick) => {
                            const y = 76 + (Number(tick || 0) / yMax) * (462 - 76);
                            return `<text class="season-summary-cover-tick season-summary-cover-tick-y" x="76" y="${y + 5}" text-anchor="end">${escapeHtml(Number(tick || 0).toLocaleString("en-US"))}</text>`;
                        }).join("")}
                        ${xTicks.map((point) => `<text class="season-summary-cover-tick season-summary-cover-tick-x" x="${point.x.toFixed(2)}" y="484" text-anchor="middle">GW${escapeHtml(point.gw || "")}</text>`).join("")}
                        <path d="${areaPath}" fill="url(#season-summary-cover-fill)" opacity="0.58"></path>
                        <path d="${linePath}" fill="none" stroke="url(#season-summary-cover-line)" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"></path>
                        ${firstPoint ? `<circle cx="${firstPoint.x.toFixed(2)}" cy="${firstPoint.y.toFixed(2)}" r="6.5" class="season-summary-cover-point-start"></circle>` : ""}
                        ${latestPoint ? `<circle cx="${latestPoint.x.toFixed(2)}" cy="${latestPoint.y.toFixed(2)}" r="7.5" class="season-summary-cover-point-latest"></circle>` : ""}
                    </svg>
                </div>
                <p class="season-summary-cover-chart-note">
                    从赛季初 #${escapeHtml(formatSummaryNumber(firstPoint?.rank || 0))} 到当前 #${escapeHtml(formatSummaryNumber(latestPoint?.rank || 0))}，
                    累计提升 ${escapeHtml(formatSummaryNumber(Math.abs(improveCount)))} 名（${improveRate >= 0 ? "提升" : "回落"} ${escapeHtml(formatSummaryDecimal(Math.abs(improveRate), 1))}%）。
                </p>
            </aside>
        `;
    }

    function renderCoverPage(profile) {
        const cover = profile?.cover || {};
        const realName = String(cover.real_name || [cover.first_name, cover.last_name].filter(Boolean).join(" ").trim() || profile.managerName || "").trim();
        const stats = Array.isArray(cover.stats) ? cover.stats : [];
        const followUp = "短短的一个赛季，还是留下来很多让人印象深刻的精彩时刻，不知道在你心里印象最深的是什么呢，一起来看一下属于你的年度报告吧";
        const getCoverStatValueClass = (rawValue) => {
            const text = String(rawValue ?? "").trim();
            const digits = (text.match(/\d/g) || []).length;
            if (digits >= 6) return " season-summary-cover-stat-value-tight";
            if (digits >= 5) return " season-summary-cover-stat-value-compact";
            return "";
        };

        return `
            <section class="season-summary-page season-summary-page-cover active">
                <div class="season-summary-cover-main">
                    <div class="season-summary-overline season-summary-cover-overline">${escapeHtml(cover.season_mark || profile.seasonLabel || "")}</div>
                    <div class="season-summary-cover-title">${escapeHtml(cover.display_name || profile.teamName || profile.managerName || "")}</div>
                    <div class="season-summary-cover-subtitle">${escapeHtml(realName)}</div>
                    <div class="season-summary-cover-stats">
                        ${stats.map((item) => `
                            <div class="season-summary-cover-stat">
                                <div class="season-summary-cover-stat-label">${escapeHtml(item?.[0])}</div>
                                <div class="season-summary-cover-stat-value${getCoverStatValueClass(item?.[1])}">${escapeHtml(item?.[1])}</div>
                            </div>
                        `).join("")}
                    </div>
                    <div class="season-summary-cover-message">${escapeHtml(cover.opening_message || "")}</div>
                    <p class="season-summary-cover-followup">${escapeHtml(followUp)}</p>
                </div>
                ${renderOrCurvePanel(profile)}
            </section>
        `;
    }

    function buildStoryCardClasses(card) {
        return ["season-summary-story-card", String(card?.cardClass || "").trim()].filter(Boolean).join(" ");
    }

    function buildStoryCardValueClasses(card) {
        return ["season-summary-story-card-value", String(card?.valueClass || "").trim()].filter(Boolean).join(" ");
    }

    function renderStoryCards(cards, extraClass = "") {
        const safeCards = Array.isArray(cards) ? cards : [];
        if (!safeCards.length) return "";

        return `
            <div class="season-summary-story-cards${extraClass ? ` ${extraClass}` : ""}">
                ${safeCards.map((card) => `
                    <div class="${buildStoryCardClasses(card)}">
                        <div class="season-summary-story-card-label">${escapeHtml(card?.label || "")}</div>
                        <div class="${buildStoryCardValueClasses(card)}">${card?.valueHtml || escapeHtml(card?.value || "")}</div>
                    </div>
                `).join("")}
            </div>
        `;
    }

    function getStoryPlayerName(item) {
        return String(item?.player_name || item?.captain_name || item?.name || "Player");
    }

    function renderInlinePlayerMention(item, className = "", showName = false) {
        const safeUrl = String(item?.headshot_url || "").trim();
        const safeName = getStoryPlayerName(item);
        if (!safeUrl) {
            return `<strong class="season-summary-transfer-emphasis">${escapeHtml(safeName)}</strong>`;
        }
        const nameSuffix = showName
            ? `<span class="season-summary-inline-player-name">${escapeHtml(safeName)}</span>`
            : "";
        return `
            <span
                class="season-summary-inline-player${className ? ` ${className}` : ""}"
                title="${escapeHtml(safeName)}"
                aria-label="${escapeHtml(safeName)}"
                data-fallback="${escapeHtml(safeName)}"
                data-show-name="${showName ? "1" : "0"}"
            >
                <img
                    class="season-summary-inline-player-image"
                    src="${escapeHtml(safeUrl)}"
                    alt="${escapeHtml(safeName)}"
                    loading="lazy"
                    onerror="const parent=this.parentElement;if(parent){const showName=parent.dataset.showName==='1';if(showName){parent.remove();}else{const fallback=document.createElement('strong');fallback.className='season-summary-transfer-emphasis';fallback.textContent=parent.dataset.fallback||'';parent.replaceWith(fallback);}}"
                />
            </span>
            ${nameSuffix}
        `;
    }

    function renderCardHeadshot(url, alt) {
        const safeUrl = String(url || "").trim();
        const safeAlt = String(alt || "").trim();
        if (!safeUrl) {
            return `<span class="season-summary-story-card-avatar-fallback">${escapeHtml(safeAlt || "暂无")}</span>`;
        }
        return `
            <img
                class="season-summary-story-card-headshot"
                src="${escapeHtml(safeUrl)}"
                alt="${escapeHtml(safeAlt)}"
                data-fallback="${escapeHtml(safeAlt || "暂无")}"
                loading="lazy"
                decoding="async"
                onerror="const fallback=document.createElement('span');fallback.className='season-summary-story-card-avatar-fallback';fallback.textContent=this.getAttribute('data-fallback')||'暂无';this.replaceWith(fallback);"
            />
        `;
    }

    function renderParagraphs(paragraphs) {
        return `
            <div class="season-summary-story-copy">
                ${(Array.isArray(paragraphs) ? paragraphs : [])
                    .filter((item) => String(item || "").trim())
                    .map((item) => `<p class="season-summary-story-paragraph">${item}</p>`)
                    .join("")}
            </div>
        `;
    }

    function renderStoryPage(options = {}) {
        const pageClass = String(options.pageClass || "").trim();
        const copyClass = String(options.copyClass || "").trim();
        const title = String(options.title || "").trim();
        const cards = Array.isArray(options.cards) ? options.cards : [];
        const cardGridClass = String(options.cardGridClass || "").trim();
        const paragraphs = Array.isArray(options.paragraphs) ? options.paragraphs : [];

        return `
            <section class="season-summary-page season-summary-page-story${pageClass ? ` ${pageClass}` : ""}">
                <div class="season-summary-story-main">
                    <div class="season-summary-story-shell${copyClass ? ` ${copyClass}` : ""}">
                        <div class="season-summary-page-title">${escapeHtml(title)}</div>
                        ${cards.length ? renderStoryCards(cards, cardGridClass) : ""}
                        ${renderParagraphs(paragraphs)}
                    </div>
                </div>
            </section>
        `;
    }

    function getHighlightRoleTheme(positionType) {
        if (Number(positionType || 0) === 2) {
            return {
                accentSolid: "#ec2e6b",
                accentGradient: "linear-gradient(90deg, #cf0c2b 0%, #f02f8f 100%)",
                fallbackGradient: "linear-gradient(135deg, #c40f2e 0%, #f13f93 100%)",
            };
        }
        return {
            accentSolid: "#2c58bf",
            accentGradient: "linear-gradient(90deg, #2b4f9b 0%, #3565c9 100%)",
            fallbackGradient: "linear-gradient(135deg, #1f3f86 0%, #4a79d8 100%)",
        };
    }

    function getHighlightDisplayName(player) {
        const safeName = String(player?.display_name || getStoryPlayerName(player) || "PLAYER").trim();
        return safeName.toUpperCase();
    }

    function getHighlightMonogram(name) {
        const letters = String(name || "").replace(/[^A-Z]/g, "");
        return (letters.slice(0, 2) || "NBA").toUpperCase();
    }

    function renderHighlightPlayerCards(snapshot) {
        const players = Array.isArray(snapshot?.players) ? snapshot.players : [];
        if (!players.length) return "";

        const buildCard = (player) => {
            const safeName = getHighlightDisplayName(player);
            const safePoints = formatSummaryNumber(player?.points || 0);
            const safeHeadshot = String(player?.headshot_url || "").trim();
            const safeLogo = String(player?.team_logo_url || "").trim();
            const safeTeamShort = String(player?.team_short || "").trim();
            const isCaptain = !!player?.is_captain;
            const roleTheme = getHighlightRoleTheme(player?.position_type);
            const scoreClass = String(safePoints).length >= 3 ? " season-summary-highlight-card-score-wide" : "";
            const stateClasses = [
                "season-summary-highlight-card",
                !safeLogo ? "is-logo-fallback" : "",
                !safeHeadshot ? "is-headshot-fallback" : "",
            ].filter(Boolean).join(" ");
            const style = [
                `--season-highlight-team-color:${String(player?.team_color || "#17408b").trim() || "#17408b"}`,
                `--season-highlight-accent-solid:${roleTheme.accentSolid}`,
                `--season-highlight-accent-gradient:${roleTheme.accentGradient}`,
                `--season-highlight-fallback-gradient:${roleTheme.fallbackGradient}`,
            ].join(";");

            return `
                <div class="season-summary-highlight-card-shell">
                    <article class="${stateClasses}" style="${escapeHtml(style)}">
                        <div class="season-summary-highlight-card-top">
                            <div class="season-summary-highlight-card-logo-wrap" aria-hidden="true">
                                ${safeLogo
                                    ? `<img class="season-summary-highlight-card-logo" src="${escapeHtml(safeLogo)}" alt="" loading="lazy" decoding="async" onerror="const card=this.closest('.season-summary-highlight-card'); if(card){ card.classList.add('is-logo-fallback'); } this.remove();">`
                                    : ""}
                                <span class="season-summary-highlight-card-logo-fallback">${escapeHtml(safeTeamShort || "NBA")}</span>
                            </div>
                            ${isCaptain ? `<span class="season-summary-highlight-card-captain">C</span>` : ""}
                            <div class="season-summary-highlight-card-team">${escapeHtml(safeTeamShort || "NBA")}</div>
                        </div>
                        <div class="season-summary-highlight-card-visual">
                            <div class="season-summary-highlight-card-headshot-shell">
                                ${safeHeadshot
                                    ? `<img class="season-summary-highlight-card-headshot" src="${escapeHtml(safeHeadshot)}" alt="${escapeHtml(safeName)}" loading="lazy" decoding="async" onerror="const card=this.closest('.season-summary-highlight-card'); if(card){ card.classList.add('is-headshot-fallback'); } this.remove();">`
                                    : ""}
                                <span class="season-summary-highlight-card-headshot-fallback">${escapeHtml(getHighlightMonogram(safeName))}</span>
                            </div>
                        </div>
                        <div class="season-summary-highlight-card-bar"></div>
                        <div class="season-summary-highlight-card-name">${escapeHtml(safeName)}</div>
                        <div class="season-summary-highlight-card-score${scoreClass}">${escapeHtml(safePoints)}</div>
                    </article>
                </div>
            `;
        };

        const frontCourt = players.filter((player) => Number(player?.position_type || 0) === 2);
        const backCourt = players.filter((player) => Number(player?.position_type || 0) === 1);
        const extras = players.filter((player) => Number(player?.position_type || 0) !== 1 && Number(player?.position_type || 0) !== 2);
        const rows = [];

        if (frontCourt.length) {
            rows.push(`<section class="season-summary-highlight-row season-summary-highlight-row-front">${frontCourt.map(buildCard).join("")}</section>`);
        }
        if (backCourt.length) {
            rows.push(`<section class="season-summary-highlight-row season-summary-highlight-row-back">${backCourt.map(buildCard).join("")}</section>`);
        }
        if (extras.length) {
            rows.push(`<section class="season-summary-highlight-row season-summary-highlight-row-back">${extras.map(buildCard).join("")}</section>`);
        }

        return `
            <div class="season-summary-highlight-cards">
                ${rows.join("")}
            </div>
        `;
    }

    function getTransferTimeSentence(favoriteTimeSlot) {
        const slotLabel = String(favoriteTimeSlot?.full_label || "").trim();
        const startHour = Number(favoriteTimeSlot?.start_hour);
        if (!slotLabel || !Number.isFinite(startHour)) return "";

        const matchedTemplate = TRANSFER_TIME_COPY_TEMPLATES.find((item) => item.match(startHour));
        if (!matchedTemplate) return "";

        const exampleTransfer = favoriteTimeSlot?.example_transfer || {};
        return fillTemplate(matchedTemplate.text, {
            slot: slotLabel,
            example_time: String(exampleTransfer?.time_label || "凌晨还"),
            example_player: String(exampleTransfer?.player_in_name || "那个人"),
        });
    }

    function getTransferDaySentence(favoriteDay) {
        const dayNumber = Number(favoriteDay?.day || 0);
        const dayLabel = String(favoriteDay?.label || (dayNumber > 0 ? `Day${dayNumber}` : "")).trim();
        if (!dayLabel || !Number.isFinite(dayNumber) || dayNumber <= 0) return "";

        const matchedTemplate = TRANSFER_DAY_COPY_TEMPLATES.find((item) => item.match(dayNumber));
        if (!matchedTemplate) return "";

        return fillTemplate(matchedTemplate.text, { day: dayLabel });
    }

    function buildTransferTimingParagraph(favoriteDay, favoriteTimeSlot) {
        const daySentence = getTransferDaySentence(favoriteDay) || TRANSFER_DAY_FALLBACK;
        const timeSentence = getTransferTimeSentence(favoriteTimeSlot) || TRANSFER_TIMING_FALLBACK;
        return `${daySentence.replace(/。$/, "")}；${timeSentence}`;
    }

    function renderPlayerDetailsPage(profile) {
        const details = profile?.player_details?.summary || {};
        const totalUniquePlayers = Number(details.total_unique_players || 0);
        const averagePlayerScore = Number(details.average_player_score || 0);
        const averageHoldDays = Number(details.average_hold_days || 0);
        const seasonDays = Number(details.season_days || 0);
        const lowestOwnershipPlayer = details.lowest_ownership_player || null;
        const longestHold = details.longest_hold || null;
        const mark = (value) => `<strong class="season-summary-transfer-emphasis">${escapeHtml(value)}</strong>`;
        const cards = [
            {
                label: "赛季总球员数",
                value: `${formatSummaryNumber(totalUniquePlayers)}人`,
                cardClass: "season-summary-story-card-player-stat season-summary-story-card-player-stat-total",
                valueClass: "season-summary-story-card-value-player-stat",
            },
            {
                label: "球员平均分",
                value: `${formatSummaryDecimal(averagePlayerScore)}分`,
                cardClass: "season-summary-story-card-player-stat season-summary-story-card-player-stat-average",
                valueClass: "season-summary-story-card-value-player-stat",
            },
        ];

        const paragraphOne = `整个赛季你邂逅了${mark(formatSummaryNumber(totalUniquePlayers))}名不同的球员，即使可能你并不是他们的球迷，却也见证了他们为你上分的努力；这${mark(formatSummaryNumber(totalUniquePlayers))}名球员平均每一个人都能在每个比赛日给你拿下${mark(formatSummaryDecimal(averagePlayerScore))}分，似乎你的每一个选择都充满着智慧。`;
        const paragraphTwo = lowestOwnershipPlayer?.player_name
            ? `${renderInlinePlayerMention(lowestOwnershipPlayer, "", true)}是你选择过持有率最低的球员，全服持有率仅有${mark(`${formatSummaryDecimal(lowestOwnershipPlayer.ownership_percent)}%`)}，这位宝藏球员也没有辜负你的信任，在你持有他的${mark(formatSummaryNumber(lowestOwnershipPlayer.days_held))}天里平均每场砍下${mark(formatSummaryDecimal(lowestOwnershipPlayer.average_points))}分，群友们都夸你是 DIFF 大师！`
            : "这个赛季你也曾把目光投向一些不那么热门的名字，正是这些看起来离谱的决定，慢慢拼出了只属于你的阵容性格。";
        const paragraphThree = longestHold?.player_name
            ? `在短短${mark(formatSummaryNumber(seasonDays))}个比赛日里，平均每一位球员在你阵容中能停留${mark(formatSummaryDecimal(averageHoldDays))}天，相遇短暂，希望他们也在你的 fantasy 故事中留下了美好的一页；不过，不知道你有没有猜到，留在你阵容中最久的人是${renderInlinePlayerMention(longestHold, "", true)}呢，相信陪伴你走过了${mark(formatSummaryNumber(longestHold.days_held))}天，他已经成为你心中的第一爱酱了吧！`
            : `在短短${mark(formatSummaryNumber(seasonDays))}个比赛日里，你的阵容不断迎来送往，平均每一位球员在你这里停留${mark(formatSummaryDecimal(averageHoldDays))}天，这本身就已经是一种只属于 fantasy 的陪伴。`;

        return renderStoryPage({
            pageClass: "season-summary-page-player-details",
            title: "Players",
            cards,
            cardGridClass: "season-summary-story-cards-player season-summary-story-cards-player-summary",
            paragraphs: [paragraphOne, paragraphTwo, paragraphThree],
        });
    }

    function renderTransferPage(profile) {
        const summary = profile?.transfers?.summary || {};
        const totalTransfers = Number(summary.total_transfers || 0);
        const activeWeeks = Number(summary.active_weeks || 0);
        const seasonWeeks = Number(summary.season_weeks || 0);
        const penaltyPoints = Number(summary.penalty_points || 0);
        const transferEveryWeek = !!summary.transfer_every_week;
        const mostIn = summary.most_in || null;
        const mostOut = summary.most_out || null;
        const favoriteDay = summary.favorite_day || null;
        const favoriteTimeSlot = summary.favorite_time_slot || null;
        const mark = (value) => `<strong class="season-summary-transfer-emphasis">${escapeHtml(value)}</strong>`;

        const cards = [
            { label: "总换人次数", value: `${formatSummaryNumber(totalTransfers)}次` },
            {
                label: "扣分总计",
                value: penaltyPoints > 0 ? `-${formatSummaryNumber(penaltyPoints)}` : "0",
            },
        ];

        const paragraphOne = `这个赛季总共转会${mark(formatSummaryNumber(totalTransfers))}次，${transferEveryWeek ? "并且每一周都坚持换人，相信最终的排名没有辜负你的努力~" : "机智的你选择以逸待劳，并不是把 FT 用完才是最好的选择。"}${penaltyPoints > 200 ? `整个赛季一共扣过${mark(`-${formatSummaryNumber(penaltyPoints)}`)}分，大胆而奔放的操作决定了你的上限。` : `整个赛季一共扣过${mark(`-${formatSummaryNumber(penaltyPoints)}`)}分，谨慎精确才是你的代名词。`}`;
        const paragraphTwo = mostIn?.name && mostOut?.name
            ? `${renderInlinePlayerMention(mostIn, "", true)}被你换进来了${mark(formatSummaryNumber(mostIn.count))}次，是你心心念念的那个人吗？希望他的表现没有让你失望；而${renderInlinePlayerMention(mostOut, "", true)}被你送走了${mark(formatSummaryNumber(mostOut.count))}次，想必他的表现你也看在眼里吧。`
            : "这个赛季你换人的节奏很有个人风格，人来人往之间，喜爱和犹豫都写在每一笔转会里。";
        const paragraphThree = buildTransferTimingParagraph(favoriteDay, favoriteTimeSlot);

        return renderStoryPage({
            pageClass: "season-summary-page-transfer",
            title: "Transfers",
            cards,
            cardGridClass: "season-summary-story-cards-transfer",
            paragraphs: [paragraphOne, paragraphTwo, paragraphThree],
        });
    }

    function renderCaptainPage(profile) {
        const summary = profile?.captain?.summary || {};
        const useCount = Number(summary.use_count || 0);
        const totalWeeks = Number(summary.total_weeks || 25) || 25;
        const resolvedCount = Number(summary.resolved_count || 0);
        const hasCaptainScores = resolvedCount > 0;
        const totalPoints = Number(summary.total_points || 0);
        const averagePoints = Number(summary.average_points || 0);
        const favoriteCaptain = summary.favorite_captain || null;
        const bestCaptain = summary.best || null;
        const worstCaptain = summary.worst || null;
        const lowestOwnership = summary.lowest_ownership || null;
        const zeroCount = Number(summary.zero_count || 0);
        const favoriteAvgCaptain = Number(favoriteCaptain?.average_points || 0);
        const favoriteSeasonCaptainAverage = Number(favoriteCaptain?.season_average_captain_points || 0);
        const hasFavoriteCaptain = !!favoriteCaptain?.captain_name;
        const hasFavoriteComparison = hasFavoriteCaptain && favoriteSeasonCaptainAverage > 0;
        const averageDelta = hasFavoriteComparison
            ? Number((favoriteAvgCaptain - favoriteSeasonCaptainAverage).toFixed(1))
            : 0;
        const favoriteIsJokic = !!favoriteCaptain?.is_jokic;
        const mark = (value) => `<strong class="season-summary-transfer-emphasis">${escapeHtml(value)}</strong>`;

        const cards = [
            { label: "Captain 次数", value: `${formatSummaryNumber(useCount)}/${formatSummaryNumber(totalWeeks)}` },
            {
                label: "队长平均得分",
                value: hasCaptainScores ? `${formatSummaryDecimal(averagePoints)}分` : "--",
            },
        ];

        let paragraphOne = "这个赛季你的 Captain 选择，像是在一场场比赛里不断给自己加注。";
        if (useCount > 0 && hasCaptainScores) {
            paragraphOne = `这个赛季你一共开了${mark(formatSummaryNumber(useCount))}次 Captain，累计拿到了${mark(formatSummaryNumber(totalPoints))}分，平均每个队长都能拿到${mark(formatSummaryDecimal(averagePoints))}分。每一次落子都在决定这一周的上限。`;
        } else if (useCount > 0) {
            paragraphOne = `这个赛季你一共开了${mark(formatSummaryNumber(useCount))}次 Captain，次数已经按 /entry/{entry_id}/history/ 里的 phcapt 记录对齐了。等这次子调用把每个 event 的 picks/live 都补齐，这页就会把完整得分重新写出来。`;
        }

        let paragraphTwo = "这个赛季你的 Captain 选择并不是随手一按，而是慢慢形成了自己更熟悉的偏好。";
        if (hasFavoriteCaptain) {
            const favoriteComparison = hasFavoriteComparison
                ? `比他这个赛季的平均队长分数${averageDelta >= 0 ? "高" : "低"}${mark(formatSummaryDecimal(Math.abs(averageDelta)))}分，`
                : "";
            if (favoriteIsJokic) {
                paragraphTwo = `${renderInlinePlayerMention(favoriteCaptain, "", true)}是你经常选择的队长，他也是很多人青睐的队长人选，跟着主流走永远不会错。你每次选他当队长平均能够拿下${mark(formatSummaryDecimal(favoriteAvgCaptain))}分，${favoriteComparison}${hasFavoriteComparison && averageDelta >= 0 ? "你不仅很懂这个游戏，更懂这个塞尔维亚大胖子。" : (hasFavoriteComparison ? "看来你选队长的时机还可以再打磨一下。" : "你和他的化学反应，确实已经打出来了。")}`;
            } else {
                paragraphTwo = `什么？！你最常选的队长居然不是约基奇？看来你的品味非常之独特，保持特立独行永远是范特西游戏中最酷的精神，继续保持！你每次选${renderInlinePlayerMention(favoriteCaptain, "", true)}当队长平均能够拿下${mark(formatSummaryDecimal(favoriteAvgCaptain))}分，${favoriteComparison}${hasFavoriteComparison && averageDelta >= 0 ? "你不仅很懂这个游戏，更懂这名球员。" : (hasFavoriteComparison ? "看来你选队长的时机还可以再打磨一下。" : "这份偏爱，已经很有你自己的味道了。")}`;
            }
        }

        const bestCaptainPoints = `${formatSummaryNumber(bestCaptain?.captain_points || 0)}分`;
        const worstCaptainPoints = `${formatSummaryNumber(worstCaptain?.captain_points || 0)}分`;
        const lowestOwnershipLabel = `GW${formatSummaryNumber(lowestOwnership?.gw || 0)} Day${formatSummaryNumber(lowestOwnership?.day || 0)}`;
        const lowestOwnershipPercent = `${formatSummaryDecimal(lowestOwnership?.ownership_percent || 0)}%`;
        const lowestOwnershipPoints = `${formatSummaryNumber(lowestOwnership?.captain_points || 0)}分`;

        let paragraphThree = "等 Captain 记录再丰富一点，这一页会更像属于你自己的队长回忆录。";
        if (bestCaptain?.captain_name && worstCaptain?.captain_name) {
            paragraphThree = `最高分的一次队长来自${mark(bestCaptain.label || "")} · ${renderInlinePlayerMention(bestCaptain, "", true)} · ${mark(bestCaptainPoints)}；而最让人难过的那次，则是${mark(worstCaptain.label || "")} · ${renderInlinePlayerMention(worstCaptain, "", true)} · ${mark(worstCaptainPoints)}。整个赛季你一共 c 到过${mark(formatSummaryNumber(zeroCount))}次 0 分，${zeroCount > 0 ? "哎，运气也是这个游戏的一部分，希望你不要灰心，一个赛季总有起起伏伏。" : "不得不承认你真的太会选队长了。"} `;
        }

        let paragraphFour = "这个赛季你最像 DIFF 大师的那一次，也说明你不是只会跟着模板走。";
        if (lowestOwnership?.captain_name) {
            paragraphFour = `如果要说最 diff 的那一次，大概就是${mark(lowestOwnershipLabel)}的${renderInlinePlayerMention(lowestOwnership, "", true)}了。当时他的持有率只有${mark(lowestOwnershipPercent)}，却依然替你拿下了${mark(lowestOwnershipPoints)}，勇气可嘉，值得称赞！`;
        }

        return renderStoryPage({
            pageClass: "season-summary-page-captain",
            copyClass: " season-summary-captain-copy",
            title: "Captain",
            cards,
            cardGridClass: "season-summary-story-cards-captain",
            paragraphs: [paragraphOne, paragraphTwo, paragraphFour],
        });
    }

    function renderCaptainMomentsPageLegacy(profile) {
        const summary = profile?.captain?.summary || {};
        const bestCaptain = summary.best || null;
        const worstCaptain = summary.worst || null;
        const mark = (value) => `<strong class="season-summary-transfer-emphasis">${escapeHtml(value)}</strong>`;
        const formatDateText = (item) => {
            const datePart = String(item?.date_label || "").trim();
            const gwDayPart = String(item?.label || "").trim();
            if (datePart && gwDayPart) return `${datePart} ${gwDayPart}`;
            return datePart || gwDayPart || "那一天";
        };
        const buildStatsText = (item) => `${formatSummaryNumber(item?.points_scored || 0)}分${formatSummaryNumber(item?.rebounds || 0)}篮板${formatSummaryNumber(item?.assists || 0)}助攻${formatSummaryNumber(item?.steals || 0)}抢断${formatSummaryNumber(item?.blocks || 0)}盖帽`;
        const renderPortrait = (item) => {
            const safeName = getStoryPlayerName(item);
            const safeUrl = String(item?.headshot_url || "").trim();
            if (!safeUrl) {
                return `<div class="season-summary-captain-moment-portrait"><span class="season-summary-captain-moment-headshot-fallback">${escapeHtml(safeName)}</span></div>`;
            }
            return `
                <div class="season-summary-captain-moment-portrait">
                    <img
                        class="season-summary-captain-moment-headshot"
                        src="${escapeHtml(safeUrl)}"
                        alt="${escapeHtml(safeName)}"
                        loading="lazy"
                        decoding="async"
                        onerror="this.style.display='none';const fallback=this.nextElementSibling;if(fallback){fallback.style.display='inline-flex';}"
                    />
                    <span class="season-summary-captain-moment-headshot-fallback" style="display:none">${escapeHtml(safeName)}</span>
                </div>
            `;
        };

        const bestName = getStoryPlayerName(bestCaptain);
        const bestParagraph = bestCaptain?.captain_name
            ? `${mark(formatDateText(bestCaptain))}似乎是一个特别的日子，那一天${mark(bestName)}大发神威，砍下了${mark(buildStatsText(bestCaptain))}，拿到了${mark(`${formatSummaryNumber(bestCaptain?.base_points || 0)}分`)}的高分，而你也有如神助，选择了他当作你那一周的队长，这样珍贵的瞬间相信你一定不会忘记😄`
            : "这个赛季还没有抓到完整的最佳队长记录。";

        const worstName = getStoryPlayerName(worstCaptain);
        const worstDidPlay = !!worstCaptain?.did_play || Number(worstCaptain?.minutes || 0) > 0 || Number(worstCaptain?.base_points || 0) > 0;
        const worstParagraph = !worstCaptain?.captain_name
            ? "这个赛季还没有抓到完整的最低队长记录。"
            : (worstDidPlay
                ? `${mark(formatDateText(worstCaptain))}似乎是一个更特别的日子，${mark(worstName)}被你寄予厚望担任队长，却只拿下了${mark(buildStatsText(worstCaptain))}，只有可怜的${mark(`${formatSummaryNumber(worstCaptain?.base_points || 0)}分🙁`)}，相信你那天在心里已经把他骂了无数遍了吧`
                : `${mark(formatDateText(worstCaptain))}似乎是一个更特别的日子，${mark(worstName)}被你寄予厚望担任队长，却因为赛前突然宣布受伤🤕未能出场，留下一个刺眼的0分任他人嘲笑，相信你那天在心里已经把他骂了无数遍了吧`);

        return `
            <section class="season-summary-page season-summary-page-story season-summary-page-captain-moments">
                <div class="season-summary-story-main">
                    <div class="season-summary-story-shell season-summary-captain-moments-copy">
                        <div class="season-summary-page-title">Moment</div>
                        <div class="season-summary-captain-moments">
                            <article class="season-summary-captain-moment">
                                <p class="season-summary-story-paragraph">${bestParagraph}</p>
                                ${renderPortrait(bestCaptain)}
                            </article>
                            <article class="season-summary-captain-moment">
                                <p class="season-summary-story-paragraph">${worstParagraph}</p>
                                ${renderPortrait(worstCaptain)}
                            </article>
                        </div>
                    </div>
                </div>
            </section>
        `;
    }

    function renderHighlightsPage(profile) {
        const highlights = profile?.highlights || {};
        const summary = highlights.summary || {};
        const bestDay = summary.best_day || null;
        const bestRank = summary.best_rank || null;
        const mark = (value) => `<strong class="season-summary-transfer-emphasis">${escapeHtml(value)}</strong>`;
        const formatHighlightLabel = (item) => {
            const datePart = String(item?.date_label || "").trim();
            const gwDayPart = String(item?.label || "").trim();
            if (datePart && gwDayPart) return `${datePart} ${gwDayPart}`;
            return datePart || gwDayPart || "";
        };
        const stories = [];

        if (bestDay) {
            stories.push(`
                <div class="season-summary-highlight-story">
                    <p class="season-summary-story-paragraph">${mark(formatHighlightLabel(bestDay))}大概会是你这个赛季最容易被重新想起的一天，那天你一口气拿到了${mark(`${formatSummaryNumber(bestDay.points)}分`)}，也是你这个赛季得过的最高分，你还记得都是哪些爱酱替你冲锋陷阵吗</p>
                    ${renderHighlightPlayerCards(bestDay?.lineup)}
                </div>
            `);
        }

        if (bestRank) {
            stories.push(`
                <div class="season-summary-highlight-story">
                    <p class="season-summary-story-paragraph">${mark(formatHighlightLabel(bestRank))}则是一个更特殊一个特殊的日子，你拿到了${mark(`${formatSummaryNumber(bestRank.points)}分`)}，最关键的是单日OR为${mark(formatSummaryNumber(bestRank.game_rank || 0))}，比起一场比赛的输赢，这种站上更高位置的瞬间更像赛季里真正的高光</p>
                    ${renderHighlightPlayerCards(bestRank?.lineup)}
                </div>
            `);
        }

        return `
            <section class="season-summary-page season-summary-page-story season-summary-page-highlights">
                <div class="season-summary-story-main">
                    <div class="season-summary-story-shell season-summary-highlights-copy">
                        <div class="season-summary-page-title">Highlight</div>
                        <div class="season-summary-highlight-stories">
                            ${stories.length ? stories.join("") : `<p class="season-summary-story-paragraph">还没有足够的历史数据</p>`}
                        </div>
                    </div>
                </div>
            </section>
        `;
    }

    function renderCaptainMomentsPage(profile) {
        const summary = profile?.captain?.summary || {};
        const bestCaptain = summary.best || null;
        const worstCaptain = summary.worst || null;
        const bestBench = summary.bench_best || null;
        const bestStarterValue = summary.starter_best_value || null;
        const mark = (value) => `<strong class="season-summary-transfer-emphasis">${escapeHtml(value)}</strong>`;
        const formatDateText = (item) => {
            const datePart = String(item?.date_label || "").trim();
            const gwDayPart = String(item?.label || "").trim();
            if (datePart && gwDayPart) return `${datePart} ${gwDayPart}`;
            return datePart || gwDayPart || "那一天";
        };
        const buildStatsText = (item) => `${formatSummaryNumber(item?.points_scored || 0)}分${formatSummaryNumber(item?.rebounds || 0)}篮板${formatSummaryNumber(item?.assists || 0)}助攻${formatSummaryNumber(item?.steals || 0)}抢断${formatSummaryNumber(item?.blocks || 0)}盖帽`;
        const renderPortrait = (item) => {
            const safeName = getStoryPlayerName(item);
            const safeUrl = String(item?.headshot_url || "").trim();
            if (!safeUrl) {
                return `<div class="season-summary-captain-moment-portrait"><span class="season-summary-captain-moment-headshot-fallback">${escapeHtml(safeName)}</span></div>`;
            }
            return `
                <div class="season-summary-captain-moment-portrait">
                    <img
                        class="season-summary-captain-moment-headshot"
                        src="${escapeHtml(safeUrl)}"
                        alt="${escapeHtml(safeName)}"
                        loading="lazy"
                        decoding="async"
                        onerror="this.style.display='none';const fallback=this.nextElementSibling;if(fallback){fallback.style.display='inline-flex';}"
                    />
                    <span class="season-summary-captain-moment-headshot-fallback" style="display:none">${escapeHtml(safeName)}</span>
                </div>
            `;
        };
        const renderMomentArticle = (paragraph, item) => `
            <article class="season-summary-captain-moment">
                <p class="season-summary-story-paragraph">${paragraph}</p>
                ${item ? renderPortrait(item) : ""}
            </article>
        `;

        const bestName = getStoryPlayerName(bestCaptain);
        const bestParagraph = bestCaptain?.captain_name
            ? `${mark(formatDateText(bestCaptain))}似乎是一个特别的日子，那一天${mark(bestName)}大发神威，砍下了${mark(buildStatsText(bestCaptain))}，拿到了${mark(`${formatSummaryNumber(bestCaptain?.base_points || 0)}分`)}的高分，而你也有如神助，选择了他当作你那一周的队长，这样珍贵的瞬间相信你一定不会忘记😋`
            : "这个赛季还没有抓到完整的最佳队长记录。";

        const worstName = getStoryPlayerName(worstCaptain);
        const worstDidPlay = !!worstCaptain?.did_play || Number(worstCaptain?.minutes || 0) > 0 || Number(worstCaptain?.base_points || 0) > 0;
        const worstParagraph = !worstCaptain?.captain_name
            ? "这个赛季还没有抓到完整的最低队长记录。"
            : (worstDidPlay
                ? `${mark(formatDateText(worstCaptain))}似乎是一个更特别的日子，${mark(worstName)}被你寄予厚望担任队长，却只拿下了${mark(buildStatsText(worstCaptain))}，只有可怜的${mark(`${formatSummaryNumber(worstCaptain?.base_points || 0)}分🥺`)}，相信你那天在心里已经把他骂了无数遍了吧`
                : `${mark(formatDateText(worstCaptain))}似乎是一个更特别的日子，${mark(worstName)}被你寄予厚望担任队长，却因为赛前突然宣布受伤🤕未能出场，留下一个刺眼的0分任他人嘲笑，相信你那天在心里已经把他骂了无数遍了吧`);

        const benchName = getStoryPlayerName(bestBench);
        const benchParagraph = bestBench?.player_name
            ? `${mark(formatDateText(bestBench))}你的心情也许不会太好，因为${mark(benchName)}那天的数据栏是${mark(buildStatsText(bestBench))}，拿到了${mark(`${formatSummaryNumber(bestBench?.fantasy_points || 0)}分`)}，虽然他在你阵容里，但是你却把他放在了替补席，也是你这个赛季替补席单人得分最高的一次，如果能再回到那一天，你会不会选择首发他呢？🤔`
            : "这个赛季还没有抓到完整的替补席遗憾时刻。";

        const starterValueName = getStoryPlayerName(bestStarterValue);
        const starterValueParagraph = bestStarterValue?.player_name
            ? `${mark(formatDateText(bestStarterValue))}你的精心挑选的宝藏球员${mark(starterValueName)}出乎了所有人的意料，拿到了${mark(buildStatsText(bestStarterValue))}，也就是${mark(`${formatSummaryNumber(bestStarterValue?.fantasy_points || 0)}分`)}的 fantasy 得分，${/Jokic$/i.test(String(starterValueName || "")) ? "这场发挥放在任何球星身上都足够亮眼，" : `虽然这个数据对 ${mark("N.Jokic")} 来说可能稀松平常，但对于身价只有${mark(formatSummaryDecimal(bestStarterValue?.price || 0))}的他可是超级大爆发了，`}这也是你赛季首发里 value 最高的一场，你对他的信任也值得一夸👍`
            : "这个赛季还没有抓到完整的 value 高光时刻。";

        const moments = [
            renderMomentArticle(bestParagraph, bestCaptain),
            renderMomentArticle(worstParagraph, worstCaptain),
            renderMomentArticle(benchParagraph, bestBench),
            renderMomentArticle(starterValueParagraph, bestStarterValue),
        ];

        return `
            <section class="season-summary-page season-summary-page-story season-summary-page-captain-moments">
                <div class="season-summary-story-main">
                    <div class="season-summary-story-shell season-summary-captain-moments-copy">
                        <div class="season-summary-page-title">Moment</div>
                        <div class="season-summary-captain-moments">
                            ${moments.join("")}
                        </div>
                    </div>
                </div>
            </section>
        `;
    }

    function renderClosingPage() {
        return `
            <section class="season-summary-page season-summary-page-story season-summary-page-closing">
                <div class="season-summary-story-main">
                    <div class="season-summary-story-shell season-summary-closing-copy">
                        <div class="season-summary-story-copy">
                            <p class="season-summary-story-paragraph">随着最后一颗球从指尖投出，25-26赛季常规赛也落下帷幕</p>
                            <p class="season-summary-story-paragraph">所有积分榜和排名都尘埃落定，不知道你是否对这个结果感到满意呢</p>
                            <p class="season-summary-story-paragraph">是享受与朋友们嬉笑怒骂的瞬间，还是对接下来的长草期感到枯燥和无聊，又或者是转为对季后赛的期待</p>
                            <p class="season-summary-story-paragraph">不管怎样，感谢你一个赛季的坚持，让这些冰冷的数据都显得有意义了起来，期待我们在下一个时刻的相遇</p>
                        </div>
                    </div>
                </div>
            </section>
        `;
    }

    function renderPages(profile) {
        return `
            ${renderCoverPage(profile)}
            ${renderPlayerDetailsPage(profile)}
            ${renderTransferPage(profile)}
            ${renderCaptainPage(profile)}
            ${renderCaptainMomentsPage(profile)}
            ${renderHighlightsPage(profile)}
            ${renderClosingPage()}
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
        const { pages } = refs();
        if (!pages) return;

        pages.innerHTML = renderPages(profile);
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

    function rerenderProfile(profile) {
        const { pages } = refs();
        if (!pages) return;
        const current = Number(state.currentPage || 0);
        pages.innerHTML = renderPages(profile);
        state.currentPage = Math.max(0, Math.min(getPageCount() - 1, current));
        updateIndicator();
    }

    async function hydrateDeferred(profile, uid, loadToken) {
        try {
            const [momentUpdated, highlightUpdated] = await Promise.all([
                hydrateMomentExtras(profile, uid),
                hydrateHighlightLineups(profile, uid),
            ]);
            if (state.loadToken !== loadToken) return;
            if (momentUpdated || highlightUpdated) {
                rerenderProfile(profile);
            }
        } catch (error) {
            console.warn("Deferred hydrate failed:", error);
        }
    }

    async function loadSummary(uid) {
        const normalizedUid = String(uid || "").trim();
        const { pages, uidInput } = refs();

        if (!normalizedUid) {
            setStatus("请输入你的 Fantasy ID", "error");
            uidInput?.focus();
            return;
        }

        state.lastUid = normalizedUid;
        const loadToken = state.loadToken + 1;
        state.loadToken = loadToken;
        setHasProfile(false);
        setIntroLoading(true);
        setIntroLeaving(false);
        setStatus("首次加载可能需要一些时间，请耐心等待", "loading");
        if (pages) {
            pages.innerHTML = `<div class="season-summary-placeholder"></div>`;
        }

        try {
            const profile = await requestSummary(normalizedUid);
            if (state.loadToken !== loadToken) return;
            await playIntroExit(profile, normalizedUid);
            if (state.loadToken !== loadToken) return;
            hydrateDeferred(profile, normalizedUid, loadToken);
        } catch (error) {
            if (state.loadToken !== loadToken) return;
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
