(function () {
    const DEFAULT_PAGE_COUNT = 5;
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
            text: "你好像更喜欢在{slot}换人，夜生活才是你的舞台，必须看到想换的球员 available 才放心换人睡觉。",
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
        const target = `${base}/api/season-summary?uid=${encodeURIComponent(uid)}`;
        const response = await fetch(target);
        const data = await response.json().catch(() => ({}));
        if (!response.ok || data?.success === false) {
            throw new Error(data?.error || `Request failed: ${response.status}`);
        }
        return data;
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
                            return `<text class="season-summary-cover-tick" x="48" y="${y + 6}" text-anchor="end">${escapeHtml(Number(tick || 0).toLocaleString("en-US"))}</text>`;
                        }).join("")}
                        ${xTicks.map((point) => `<text class="season-summary-cover-tick" x="${point.x.toFixed(2)}" y="28" text-anchor="middle">${escapeHtml(point.gw || "")}</text>`).join("")}
                        <path d="${areaPath}" fill="url(#season-summary-cover-fill)" opacity="0.58"></path>
                        <path d="${linePath}" fill="none" stroke="url(#season-summary-cover-line)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"></path>
                    </svg>
                </div>
            </aside>
        `;
    }

    function renderCoverPage(profile) {
        const cover = profile?.cover || {};
        const realName = String(cover.real_name || [cover.first_name, cover.last_name].filter(Boolean).join(" ").trim() || profile.managerName || "").trim();
        const stats = Array.isArray(cover.stats) ? cover.stats : [];

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

    function buildStoryCardClasses(card) {
        return ["season-summary-story-card", String(card?.cardClass || "").trim()].filter(Boolean).join(" ");
    }

    function buildStoryCardValueClasses(card) {
        return ["season-summary-story-card-value", String(card?.valueClass || "").trim()].filter(Boolean).join(" ");
    }

    function renderStoryCards(cards, extraClass = "") {
        return `
            <div class="season-summary-story-cards${extraClass ? ` ${extraClass}` : ""}">
                ${(Array.isArray(cards) ? cards : []).map((card) => `
                    <div class="${buildStoryCardClasses(card)}">
                        <div class="season-summary-story-card-label">${escapeHtml(card?.label || "")}</div>
                        <div class="${buildStoryCardValueClasses(card)}">${card?.valueHtml || escapeHtml(card?.value || "")}</div>
                        ${card?.note ? `<div class="season-summary-story-card-note">${escapeHtml(card.note)}</div>` : ""}
                    </div>
                `).join("")}
            </div>
        `;
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
            <span
                class="season-summary-inline-player${className ? ` ${className}` : ""}"
                title="${escapeHtml(safeName)}"
                aria-label="${escapeHtml(safeName)}"
                data-fallback="${escapeHtml(safeName)}"
            >
                <img
                    class="season-summary-inline-player-image"
                    src="${escapeHtml(safeUrl)}"
                    alt="${escapeHtml(safeName)}"
                    loading="lazy"
                    onerror="const parent=this.parentElement;if(parent){const fallback=document.createElement('strong');fallback.className='season-summary-transfer-emphasis';fallback.textContent=parent.dataset.fallback||'';parent.replaceWith(fallback);}"
                />
            </span>
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
                        ${renderStoryCards(cards, cardGridClass)}
                        ${renderParagraphs(paragraphs)}
                    </div>
                </div>
            </section>
        `;
    }

    function renderHighlightPlayerCards(snapshot) {
        const players = Array.isArray(snapshot?.players) ? snapshot.players : [];
        if (!players.length) return "";

        return `
            <div class="season-summary-highlight-cards">
                ${players.map((player) => {
                    const roleClass = Number(player?.position_type || 0) === 2
                        ? "season-summary-highlight-card-fc"
                        : "season-summary-highlight-card-bc";
                    const safeName = getStoryPlayerName(player).toUpperCase();
                    const safePoints = formatSummaryNumber(player?.points || 0);
                    const safeHeadshot = String(player?.headshot_url || "").trim();
                    const safeLogo = String(player?.team_logo_url || "").trim();
                    return `
                        <article class="season-summary-highlight-card ${roleClass}">
                            <div class="season-summary-highlight-card-top">
                                ${safeLogo ? `<img class="season-summary-highlight-card-logo" src="${escapeHtml(safeLogo)}" alt="${escapeHtml(player?.team_short || "")}" loading="lazy" decoding="async" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'season-summary-highlight-card-logo-fallback',textContent:this.alt||''}))">` : `<span class="season-summary-highlight-card-logo-fallback">${escapeHtml(player?.team_short || "")}</span>`}
                                <span class="season-summary-highlight-card-team">${escapeHtml(player?.team_short || "")}</span>
                            </div>
                            <div class="season-summary-highlight-card-visual">
                                ${safeHeadshot
                                    ? `<img class="season-summary-highlight-card-headshot" src="${escapeHtml(safeHeadshot)}" alt="${escapeHtml(safeName)}" loading="lazy" decoding="async" onerror="this.style.display='none';this.parentElement.classList.add('is-fallback');this.parentElement.innerHTML='<span class=&quot;season-summary-highlight-card-headshot-fallback&quot;>${escapeHtml(safeName.slice(0, 2) || "P")}</span>';">`
                                    : `<span class="season-summary-highlight-card-headshot-fallback">${escapeHtml(safeName.slice(0, 2) || "P")}</span>`}
                            </div>
                            <div class="season-summary-highlight-card-bar"></div>
                            <div class="season-summary-highlight-card-name">${escapeHtml(safeName)}</div>
                            <div class="season-summary-highlight-card-score">${escapeHtml(safePoints)}</div>
                        </article>
                    `;
                }).join("")}
            </div>
        `;
    }

    function getTransferTimeSentence(favoriteTimeSlot) {
        const slotLabel = String(favoriteTimeSlot?.full_label || "").trim();
        const startHour = Number(favoriteTimeSlot?.start_hour);
        if (!slotLabel || !Number.isFinite(startHour)) return "";

        const matchedTemplate = TRANSFER_TIME_COPY_TEMPLATES.find((item) => item.match(startHour));
        if (!matchedTemplate) return "";

        return fillTemplate(matchedTemplate.text, { slot: slotLabel });
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
        const timeSentence = getTransferTimeSentence(favoriteTimeSlot);
        const daySentence = getTransferDaySentence(favoriteDay);
        const sentences = [timeSentence, daySentence].filter(Boolean);
        return sentences.length ? sentences.join("") : TRANSFER_TIMING_FALLBACK;
    }

    function renderPlayerDetailsPage(profile) {
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

        const paragraphOne = `整个赛季你一共选过${mark(formatSummaryNumber(totalUniquePlayers))}名不同的球员，即使可能你并不是他们的球迷，却也见证了他们为你上分的努力；这${mark(formatSummaryNumber(totalUniquePlayers))}名球员平均每一个人都能在每个比赛日给你拿下${mark(formatSummaryDecimal(averagePlayerScore))}分，${leaguePercentile ? `超过这个联盟${mark(formatSummaryNumber(leaguePercentile))}%的玩家，` : ""}似乎你的每一个选择都充满着智慧。`;
        const paragraphTwo = lowestOwnershipPlayer?.player_name
            ? `${renderInlinePlayerMention(lowestOwnershipPlayer)}是你选择过持有率最低的球员，全服持有率仅有${mark(`${formatSummaryDecimal(lowestOwnershipPlayer.ownership_percent)}%`)}，这位宝藏球员也没有辜负你的信任，在你持有他的${mark(formatSummaryNumber(lowestOwnershipPlayer.days_held))}天里平均每场砍下${mark(formatSummaryDecimal(lowestOwnershipPlayer.average_points))}分，群友们都夸你是 DIFF 大师！`
            : "这个赛季你也曾把目光投向一些不那么热门的名字，正是这些看起来离谱的决定，慢慢拼出了只属于你的阵容性格。";
        const paragraphThree = longestHold?.player_name
            ? `在短短${mark(formatSummaryNumber(seasonDays))}个比赛日里，平均每一位球员在你阵容中能停留${mark(formatSummaryDecimal(averageHoldDays))}天，相遇短暂，希望他们也在你的 fantasy 故事中留下了美好的一页；不过，不知道你有没有猜到，留在你阵容中最久的人是${renderInlinePlayerMention(longestHold)}呢，相信陪伴你走过了${mark(formatSummaryNumber(longestHold.days_held))}天，他已经成为你心中的第一爱酱了吧！`
            : `在短短${mark(formatSummaryNumber(seasonDays))}个比赛日里，你的阵容不断迎来送往，平均每一位球员在你这里停留${mark(formatSummaryDecimal(averageHoldDays))}天，这本身就已经是一种只属于 fantasy 的陪伴。`;

        return renderStoryPage({
            pageClass: "season-summary-page-player-details",
            title: "球员详情",
            cards,
            cardGridClass: "season-summary-story-cards-player",
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
        const timeSlotLabel = String(favoriteTimeSlot?.full_label || "暂无");
        const mark = (value) => `<strong class="season-summary-transfer-emphasis">${escapeHtml(value)}</strong>`;

        const cards = [
            { label: "总换人次数", value: `${formatSummaryNumber(totalTransfers)}次`, note: "不含 WC / AS" },
            {
                label: "操作周数",
                value: `${formatSummaryNumber(activeWeeks)}/${formatSummaryNumber(seasonWeeks)}`,
                note: transferEveryWeek ? "每一周都坚持换人" : "并不是每周都要把 FT 用完",
            },
            {
                label: "扣分总计",
                value: penaltyPoints > 0 ? `-${formatSummaryNumber(penaltyPoints)}` : "0",
                note: penaltyPoints > 200 ? "大胆而奔放的操作" : "谨慎精确的节奏",
            },
            {
                label: "偏爱换人时段",
                value: timeSlotLabel,
                note: favoriteTimeSlot?.count ? `${formatSummaryNumber(favoriteTimeSlot.count)}次发生在这里` : "这季还没有固定生物钟",
                valueClass: "season-summary-story-card-value-time-slot",
            },
        ];

        const paragraphOne = `这个赛季总共转会${mark(formatSummaryNumber(totalTransfers))}次，${transferEveryWeek ? "并且每一周都坚持换人，相信最终的排名没有辜负你的努力~" : "机智的你选择以逸待劳，并不是把 FT 用完才是最好的选择。"}${penaltyPoints > 200 ? `整个赛季一共扣过${mark(`-${formatSummaryNumber(penaltyPoints)}`)}分，大胆而奔放的操作决定了你的上限。` : `整个赛季一共扣过${mark(`-${formatSummaryNumber(penaltyPoints)}`)}分，谨慎精确才是你的代名词。`}`;
        const paragraphTwo = mostIn?.name && mostOut?.name
            ? `${renderInlinePlayerMention(mostIn)}被你换进来了${mark(formatSummaryNumber(mostIn.count))}次，是你心心念念的那个人吗？希望他的表现没有让你失望；而${renderInlinePlayerMention(mostOut)}被你送走了${mark(formatSummaryNumber(mostOut.count))}次，想必他的表现你也看在眼里吧。`
            : "这个赛季你换人的节奏很有个人风格，人来人往之间，喜爱和犹豫都写在每一笔转会里。";
        const paragraphThree = getTransferDaySentence(favoriteDay) || TRANSFER_DAY_FALLBACK;
        const paragraphFour = getTransferTimeSentence(favoriteTimeSlot) || TRANSFER_TIMING_FALLBACK;

        return renderStoryPage({
            pageClass: "season-summary-page-transfer",
            title: "转会详情",
            cards,
            cardGridClass: "season-summary-story-cards-transfer",
            paragraphs: [paragraphOne, paragraphTwo, paragraphThree, paragraphFour],
        });
    }

    function renderCaptainPage(profile) {
        const summary = profile?.captain?.summary || {};
        const useCount = Number(summary.use_count || 0);
        const totalWeeks = Number(summary.total_weeks || 25) || 25;
        const resolvedCount = Number(summary.resolved_count || 0);
        const detailComplete = !!summary.detail_complete;
        const hasCaptainDetails = detailComplete && resolvedCount > 0;
        const totalPoints = Number(summary.total_points || 0);
        const averagePoints = Number(summary.average_points || 0);
        const favoriteCaptain = summary.favorite_captain || null;
        const bestCaptain = summary.best || null;
        const worstCaptain = summary.worst || null;
        const lowestOwnership = summary.lowest_ownership || null;
        const zeroCount = Number(summary.zero_count || 0);
        const favoriteAvgBase = Number(favoriteCaptain?.average_base_points || 0);
        const favoriteSeasonAverage = Number(favoriteCaptain?.season_average_points || 0);
        const averageDelta = Number((favoriteAvgBase - favoriteSeasonAverage).toFixed(1));
        const favoriteIsJokic = !!favoriteCaptain?.is_jokic;
        const mark = (value) => `<strong class="season-summary-transfer-emphasis">${escapeHtml(value)}</strong>`;
        const countNote = useCount >= totalWeeks
            ? "一次都没忘，太能操作了！"
            : (useCount >= Math.max(0, totalWeeks - 2) ? "咦，你还留了一手" : "也给自己留了一点观察空间");

        const cards = [
            { label: "Captain 次数", value: `${formatSummaryNumber(useCount)}/${formatSummaryNumber(totalWeeks)}`, note: countNote },
            {
                label: "队长累积得分",
                value: hasCaptainDetails ? `${formatSummaryNumber(totalPoints)}分` : "--",
                note: hasCaptainDetails ? "按真实 Captain x2 后得分累计" : "Captain 详情待补全",
            },
            {
                label: "队长平均得分",
                value: hasCaptainDetails ? `${formatSummaryDecimal(averagePoints)}分` : "--",
                note: hasCaptainDetails ? "按 x2 后平均分计算" : "Captain 详情待补全",
            },
        ];

        let paragraphOne = `在这个没有 VC 的游戏中队长的选择就显得尤为关键，这个赛季你一共开了${mark(formatSummaryNumber(useCount))}次 Captain，累计拿到了${mark(formatSummaryNumber(totalPoints))}分，平均每个队长都能拿到${mark(formatSummaryDecimal(averagePoints))}分。每一次落子都在决定这一周的上限。`;
        if (useCount > 0 && !hasCaptainDetails) {
            paragraphOne = `这个赛季你一共开了${mark(formatSummaryNumber(useCount))}次 Captain，次数已经按 /entry/{entry_id}/history/ 里的 phcapt 记录对齐了；不过这次生成时，官方 Captain 详情接口只成功解析了${mark(formatSummaryNumber(resolvedCount))}次，所以具体得分我先不乱写。`;
        }

        let paragraphTwo = "这个赛季你的 Captain 选择并不是随手一按，而是慢慢形成了自己更熟悉的偏好。";
        if (useCount > 0 && !hasCaptainDetails) {
            paragraphTwo = "最常选择的队长、平均基础分和高低光时刻，都依赖官方的 picks/live 详情接口；这次它没有完整返回，我先保留次数，不拿半截数据误导你。";
        } else if (favoriteCaptain?.captain_name) {
            if (favoriteIsJokic) {
                paragraphTwo = `${renderInlinePlayerMention(favoriteCaptain)}是你经常选择的队长，他也是很多人青睐的队长人选，跟着主流走永远不会错。你每次选他当队长平均能够拿下${mark(formatSummaryDecimal(favoriteAvgBase))}分，比他这个赛季的平均队长分数${averageDelta >= 0 ? "高" : "低"}${mark(formatSummaryDecimal(Math.abs(averageDelta)))}分，${averageDelta >= 0 ? "你不仅很懂这个游戏，更懂这个塞尔维亚大胖子。" : "看来你选队长的时机还可以再打磨一下。"} `;
            } else {
                paragraphTwo = `什么？！你最常选的队长居然不是约基奇？看来你的品味非常之独特，保持特立独行永远是范特西游戏中最酷的精神，继续保持！你每次选${renderInlinePlayerMention(favoriteCaptain)}当队长平均能够拿下${mark(formatSummaryDecimal(favoriteAvgBase))}分，比他这个赛季的平均队长分数${averageDelta >= 0 ? "高" : "低"}${mark(formatSummaryDecimal(Math.abs(averageDelta)))}分，${averageDelta >= 0 ? "你不仅很懂这个游戏，更懂这名球员。" : "看来你选队长的时机还可以再打磨一下。"} `;
            }
        }

        const bestCaptainPoints = `${formatSummaryNumber(bestCaptain?.captain_points || 0)}分`;
        const worstCaptainPoints = `${formatSummaryNumber(worstCaptain?.captain_points || 0)}分`;
        const lowestOwnershipLabel = `GW${formatSummaryNumber(lowestOwnership?.gw || 0)} Day${formatSummaryNumber(lowestOwnership?.day || 0)}`;
        const lowestOwnershipPercent = `${formatSummaryDecimal(lowestOwnership?.ownership_percent || 0)}%`;
        const lowestOwnershipPoints = `${formatSummaryNumber(lowestOwnership?.captain_points || 0)}分`;

        let paragraphThree = "等 Captain 记录再丰富一点，这一页会更像属于你自己的队长回忆录。";
        if (useCount > 0 && !hasCaptainDetails) {
            paragraphThree = "等官方 Captain 详情接口稳定一点，这一页就会恢复最常队长、平均基础分，以及那次最值和最伤的 Captain 记录。";
        } else if (bestCaptain?.captain_name && worstCaptain?.captain_name) {
            paragraphThree = `最高分的一次队长来自${mark(bestCaptain.label || "")} · ${renderInlinePlayerMention(bestCaptain)} · ${mark(bestCaptainPoints)}；而最让人难过的那次，则是${mark(worstCaptain.label || "")} · ${renderInlinePlayerMention(worstCaptain)} · ${mark(worstCaptainPoints)}。整个赛季你一共 c 到过${mark(formatSummaryNumber(zeroCount))}次 0 分，${zeroCount > 0 ? "哎，运气也是这个游戏的一部分，希望你不要灰心，一个赛季总有起起伏伏。" : "不得不承认你真的太会选队长了。"} `;
        }

        let paragraphFour = "这个赛季你最像 DIFF 大师的那一次，还在等下一版数据把它完整抓出来。";
        if (useCount > 0 && !hasCaptainDetails) {
            paragraphFour = "";
        } else if (lowestOwnership?.captain_name) {
            paragraphFour = `如果要说最 diff 的那一次，大概就是${mark(lowestOwnershipLabel)}的${renderInlinePlayerMention(lowestOwnership)}了。当时他的持有率只有${mark(lowestOwnershipPercent)}，却依然替你拿下了${mark(lowestOwnershipPoints)}，勇气可嘉，值得陈赞！`;
        }

        return renderStoryPage({
            pageClass: "season-summary-page-captain",
            copyClass: " season-summary-captain-copy",
            title: "队长选择",
            cards,
            cardGridClass: "season-summary-story-cards-captain",
            paragraphs: [paragraphOne, paragraphTwo, paragraphThree, paragraphFour],
        });
    }

    function renderHighlightsPage(profile) {
        const highlights = profile?.highlights || {};
        const summary = highlights.summary || {};
        const bestDay = summary.best_day || null;
        const bestRank = summary.best_rank || null;
        const mark = (value) => `<strong class="season-summary-transfer-emphasis">${escapeHtml(value)}</strong>`;
        const cards = [
            {
                label: "赛季最高单日",
                value: bestDay ? `${formatSummaryNumber(bestDay.points)}分` : "-",
                note: bestDay?.label || "还没有足够的历史数据",
            },
            {
                label: "最高全球排名",
                value: bestRank?.overall_rank ? formatSummaryNumber(bestRank.overall_rank) : "-",
                note: bestRank?.label || "还没有足够的历史数据",
            },
        ];

        const paragraphOne = bestDay
            ? `${mark(bestDay.label)}大概会是你这个赛季最容易被重新想起的一天，那天你一口气拿到了${mark(`${formatSummaryNumber(bestDay.points)}分`)}，也是你这个赛季得过的最高分，你还记得都是哪些爱酱替你冲锋陷阵吗？`
            : "总会有那么一天，你的阵容像突然一起开花，那种成就感会让人忍不住反复回看。";
        const paragraphTwo = bestRank
            ? `${mark(bestRank.label)}也是一个特殊的日子，你拿到了${mark(`${formatSummaryNumber(bestRank.points)}分`)}，最关键的是单日 OR 为${mark(formatSummaryNumber(bestRank.overall_rank || 0))}，比起一场比赛的输赢，这种站上更高位置的瞬间更像赛季里真正的高光。`
            : "有些高光不只是分数本身，而是你终于看到自己在更大榜单里往上爬的那一刻。";

        return `
            <section class="season-summary-page season-summary-page-story season-summary-page-highlights">
                <div class="season-summary-story-main">
                    <div class="season-summary-story-shell season-summary-highlights-copy">
                        <div class="season-summary-page-title">高光时刻</div>
                        ${renderStoryCards(cards, "season-summary-story-cards-highlights")}
                        <div class="season-summary-highlight-stories">
                            <div class="season-summary-highlight-story">
                                <p class="season-summary-story-paragraph">${paragraphOne}</p>
                                ${renderHighlightPlayerCards(bestDay?.lineup)}
                            </div>
                            <div class="season-summary-highlight-story">
                                <p class="season-summary-story-paragraph">${paragraphTwo}</p>
                                ${renderHighlightPlayerCards(bestRank?.lineup)}
                            </div>
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

    async function loadSummary(uid) {
        const normalizedUid = String(uid || "").trim();
        const { pages, uidInput } = refs();

        if (!normalizedUid) {
            setStatus("请输入你的 Fantasy ID", "error");
            uidInput?.focus();
            return;
        }

        state.lastUid = normalizedUid;
        setHasProfile(false);
        setIntroLoading(true);
        setIntroLeaving(false);
        setStatus("正在加载中，请稍候", "loading");
        if (pages) {
            pages.innerHTML = `<div class="season-summary-placeholder"></div>`;
        }

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
