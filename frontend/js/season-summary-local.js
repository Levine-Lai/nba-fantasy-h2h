(function () {
    const SAMPLE_CACHE = {
        "6412": {
            uid: "6412",
            managerName: "阿甘",
            seasonLabel: "2025-26",
            seasonCount: 2,
            sourceLabel: "local cached sample",
            sourceNote: "当前展示的是本地缓存样本，可替换成真实抓取结果。",
            intro: "这是一个从第二个赛季开始逐渐找到自己节奏的经理画像。不是最模板，但越来越敢在关键节点上做选择。",
            cover: {
                subtitle: "你不是那种每周都重拳出击的人，但一旦决定动手，往往都带着一点赌性和一点浪漫。",
                tags: ["第二赛季", "稳定进步", "敢于补刀"],
                footer: [["赛季定位", "渐入佳境"], ["回顾气质", "故事感很强"], ["建议方向", "先接真实数据"]],
            },
            overview: {
                lead: "这页要回答的不是你有没有打好，而是你这一季到底打成了什么样子。",
                cards: [
                    ["赛季总得分", "27,684", "比上赛季多 1,128 分，第一次把赛季完整感打出来。"],
                    ["全球排名", "#18,542", "整体排名比上季更前，终于不是只在某几周闪一下。"],
                    ["赛季序列", "2nd", "第二个赛季很适合讲进步，因为所有细节都有对照。"],
                ],
                curve: [48, 44, 53, 57, 50, 61, 64, 59, 71, 68, 73, 75],
                sideTitle: "现有 API 能直接做",
                sideBullets: [
                    "总得分、当前全球排名、赛季每周走势都能从历史接口整理出来",
                    "如果要做与上赛季对比，建议尽快开始本地留存快照",
                ],
                sideKpis: [["故事张力", "高"], ["数据完成度", "80%"]],
            },
            transfers: {
                lead: "这里不是简单列数字，而是刻画你整个赛季到底有多爱动手、什么时候最忍不住，以及有没有形成自己的换人偏好。",
                rows: [
                    ["总转会", "47 次，不含 WC 与 AS 的批量重组。"],
                    ["操作周数", "26 周里有 19 周做过操作，属于相当活跃型。"],
                    ["累计扣分", "-16，说明你愿意为了天花板付出一点代价。"],
                    ["最常换入", "J. Giddey、J. Johnson 这种回头草型球员，很容易写出你的赛季性格。"],
                ],
                quote: "你不是每周都操作的人，但你一旦操作，通常都不是为了小修小补。",
                sideTitle: "页面 3 可直接实现",
                sideBullets: [
                    "总转会、扣分、操作周数、最常换入/换出都能做",
                    "只要把每周记录落成本地缓存，这页后期可完全脱离后端",
                ],
            },
            captain: {
                lead: "队长页最适合做成戏剧页，因为每一次 Captain 都是在用自己的判断给一周下注。",
                cards: [
                    ["Captain 次数", "18", "赛季里有不少次是你自己想试一把。"],
                    ["队长总得分", "1,962", "这是赛季总结里最容易引发情绪起伏的数字。"],
                    ["最爱 Captain", "Jokic", "他像你整个赛季里最熟悉的答案。"],
                ],
                rows: [["最高队长", "GW12 Day3，Doncic，168 分。"], ["最低队长", "GW7 Day1，Haliburton，18 分。"]],
                sideTitle: "页面 4 可直接实现",
                sideBullets: [
                    "历史 Captain 使用、对象、得分、最高/最低都能做",
                    "如果想做“最让你念念不忘的 Captain”，再加文案层即可",
                ],
            },
            roster: {
                lead: "这一页最有温度，因为它不是你拿了多少分，而是你和哪些球员纠缠得最久、错过得最可惜。",
                rows: [
                    ["最长持有", "Jalen Johnson，连续 43 天，陪你走完中段最稳定的一段。"],
                    ["替补遗憾", "Reaves 在板凳上拿过 7 次双位数，但没能通过递补进场。"],
                    ["冷门高光", "你曾经在持有率低于 5% 时押中过一位 50+ 的冷门英雄。"],
                ],
                badges: ["最专一球员", "板凳遗憾", "深夜捡漏", "他是你心心念念的那个他"],
                sideTitle: "页面 5 哪些还缺",
                sideBullets: [
                    "最长持有和替补次数可做，但要把逐周阵容沉淀下来",
                    "冷门高光需要历史持有率快照；没有就先做弱化版",
                ],
            },
            highlights: {
                lead: "最后一页适合做成一组真正能被记住的瞬间，把整个赛季从统计表拉回故事。",
                cards: [
                    ["赛季最高单日", "356", "GW24 Day2，那天像是阵容突然全部苏醒。"],
                    ["最高 OR 日", "Top 0.6%", "最像你真的赢了全服一次的一天。"],
                    ["赛季标签", "敢赌", "不是最稳，但你愿意为了高光去押。"],
                ],
                quote: "无论结局如何，这一季最像你的地方，往往不在最终排名，而在那些你决定相信自己的瞬间里。",
                sideTitle: "页面 6 可做程度",
                sideBullets: [
                    "最高单日与 GW/Day 口径已具备",
                    "最高 OR 日要再确认官方是否有稳定历史字段，否则建议先落快照",
                ],
                sideKpis: [["可实现度", "高"], ["故事性", "最高"]],
            },
        },
        "6562": {
            uid: "6562",
            managerName: "柯南",
            seasonLabel: "2025-26",
            seasonCount: 1,
            sourceLabel: "local cached sample",
            sourceNote: "这是另一份本地样本，用来观察不同经理画像的差异。",
            intro: "这一季更像一部慢热剧。前半程起伏很多，但越到后面越能看出自己的方向。",
            cover: {
                subtitle: "并不是一上来就站到前排的赛季，但却很适合做成那种越看越有味道的回顾册。",
                tags: ["第一赛季", "后程发力", "慢热型"],
                footer: [["赛季定位", "慢热反弹"], ["回顾气质", "后劲很足"], ["建议方向", "强化叙事"]],
            },
            overview: {
                lead: "第一页更适合讲成长，而不是单纯说成绩。",
                cards: [
                    ["赛季总得分", "27,112", "作为首个完整赛季，这个总分更像是打基础而不是拼极限。"],
                    ["全球排名", "#29,404", "中后段排名稳定向上，说明理解游戏节奏的速度不慢。"],
                    ["赛季序列", "1st", "第一赛季没有上季对比，但可以做出一个很完整的新手成长曲线。"],
                ],
                curve: [35, 38, 40, 46, 42, 49, 53, 57, 60, 58, 63, 66],
                sideTitle: "页面 2 可强化点",
                sideBullets: [
                    "首赛季适合做‘你学会了什么’的叙事句子",
                    "整体走势能自然带出后程发力的故事线",
                ],
                sideKpis: [["成长感", "强"], ["对比项", "首赛季"]],
            },
            transfers: {
                lead: "转会页会更像你是个怎样的经理。慢热型经理通常在这里最容易看出风格。",
                rows: [
                    ["总转会", "39 次，整体比激进型经理更克制。"],
                    ["操作周数", "26 周里有 16 周动过手，不算全勤，但也不是佛系。"],
                    ["累计扣分", "-8，属于偶尔愿意为节奏付费。"],
                    ["最常换入", "更偏爱功能型与赛程型球员，而不是硬追热点。"],
                ],
                quote: "你不是最爱折腾的经理，但每次出手都像是在试图把故事修回正轨。",
                sideTitle: "页面 3 叙事方向",
                sideBullets: ["可以做成慢热型经理的出手时机", "如果加 Sankey 式小图，会很有个人风格"],
            },
            captain: {
                lead: "Captain 页对你更像一张心态画像：保守、激进，还是介于两者之间。",
                cards: [
                    ["Captain 次数", "15", "整体比激进经理稍少一点。"],
                    ["队长总得分", "1,744", "有高光，但更多是稳稳拿分。"],
                    ["最爱 Captain", "SGA", "这是一种非常当代的信任关系。"],
                ],
                rows: [["最高队长", "GW18 Day2，SGA，152 分。"], ["最低队长", "GW9 Day1，Tatum，22 分。"]],
                sideTitle: "页面 4 可直接实现",
                sideBullets: ["对象、次数、极值都能做", "很适合加一句偏感性的总结"],
            },
            roster: {
                lead: "如果说 Captain 页是下注页，那么持有页就是关系页。",
                rows: [
                    ["最长持有", "Jalen Brunson，连续 36 天，是你最习惯依赖的那个人。"],
                    ["替补遗憾", "板凳上爆分的次数不多，但每次都很让人记得住。"],
                    ["冷门高光", "押中过一次低持有率爆分，这种瞬间特别值得写一句台词。"],
                ],
                badges: ["慢热情深", "板凳悬案", "偶尔命中冷门"],
                sideTitle: "页面 5 建议",
                sideBullets: ["这页最好多写两句，不然会太像普通统计", "很适合‘你心心念念的那个他’这种句子"],
            },
            highlights: {
                lead: "收尾页更适合做成一句结论：这一季的你，最像什么样的人。",
                cards: [
                    ["赛季最高单日", "312", "GW22 Day3，终于等到你手感和赛程一起对齐。"],
                    ["最高 OR 日", "Top 1.1%", "最接近全服共振的一次高光。"],
                    ["赛季标签", "回暖", "这是一个越打越懂自己的赛季。"],
                ],
                quote: "你不是一开始就闪闪发光的人，但你会在赛季的后半段，慢慢把自己打成一个完整的样子。",
                sideTitle: "页面 6 可加的趣味",
                sideBullets: ["结尾可用赛季标签做个像奖项一样的收束", "也可以补一个如果再来一次，你最想改哪一手"],
                sideKpis: [["情绪收束", "柔和"], ["建议气质", "成长线"]],
            },
        },
        "14": {
            uid: "14",
            managerName: "酸男",
            seasonLabel: "2025-26",
            seasonCount: 3,
            sourceLabel: "local cached sample",
            sourceNote: "第三份样本用来演示更成熟、更老练一点的经理叙事。",
            intro: "这是一个更成熟的赛季画像。你不需要每周证明自己，但会在真正重要的节点里突然下狠手。",
            cover: {
                subtitle: "这种赛季最适合做得有一点锋利感，因为稳定和老练本身就是一种风格。",
                tags: ["第三赛季", "成熟经理", "关键节点狠"],
                footer: [["赛季定位", "老练型"], ["回顾气质", "锋利冷静"], ["建议方向", "增加金句"]],
            },
            overview: {
                lead: "成熟型经理的回顾，应该更像一部静静推进的纪录片。",
                cards: [
                    ["赛季总得分", "28,686", "在前两个赛季的基础上，这一季更像把方法论打磨成熟了。"],
                    ["全球排名", "#12,903", "排名保持在更稳定的上半区，说明你的策略已经形成惯性。"],
                    ["赛季序列", "3rd", "第三赛季最适合写成熟，因为它不再只是进步，而是风格成型。"],
                ],
                curve: [54, 58, 61, 60, 64, 67, 72, 71, 75, 77, 79, 82],
                sideTitle: "页面 2 建议",
                sideBullets: ["第三赛季适合强调风格定型，而不是简单进步/退步", "如果有上赛季数据，可以做成你已经变成什么样的经理"],
                sideKpis: [["稳定度", "高"], ["叙事感", "成熟型"]],
            },
            transfers: {
                lead: "转会页在你这里更像手起刀落，不是频繁操作，而是挑时机。",
                rows: [
                    ["总转会", "33 次，明显低于高频操作型经理。"],
                    ["操作周数", "26 周里有 14 周操作，是典型的选择性出手。"],
                    ["累计扣分", "-4，说明你很少为情绪性操作买单。"],
                    ["最常换入", "偏好高地板持球点，说明你对稳定感很有执念。"],
                ],
                quote: "你不是没有欲望的人，你只是更愿意等到出手有把握的那一刻。",
                sideTitle: "页面 3 适合的文案",
                sideBullets: ["少即是多，很适合写成‘你并不常动，但动的时候通常很准’", "这里也适合放一个赛季最成功转会的 spotlight"],
            },
            captain: {
                lead: "Captain 页会让你看起来很像一个会在大场面里相信自己的人。",
                cards: [
                    ["Captain 次数", "16", "你不是乱试，而是更挑关键节点去开。"],
                    ["队长总得分", "1,884", "稳定而不失上限。"],
                    ["最爱 Captain", "Doncic", "一种很有主角光环的偏爱。"],
                ],
                rows: [["最高队长", "GW16 Day2，Doncic，154 分。"], ["最低队长", "GW10 Day1，Trae，26 分。"]],
                sideTitle: "页面 4 适合的句子",
                sideBullets: ["可以写成‘你最常把希望押在谁身上’", "这页很适合做成既帅又有一点宿命感"],
            },
            roster: {
                lead: "持有页在你这里最像偏执与耐心的混合体。",
                rows: [
                    ["最长持有", "Maxey，连续 40 天，是你这一季里最愿意相信的陪跑者。"],
                    ["替补遗憾", "板凳高分不多，但有几次特别痛，适合单独点名。"],
                    ["冷门高光", "如果真抓到过一位低持有率高分球员，这页会非常有戏。"],
                ],
                badges: ["老练偏执", "痛感记忆", "关键陪跑者"],
                sideTitle: "页面 5 数据建议",
                sideBullets: ["优先做最长持有与板凳遗憾，最稳", "冷门高光可以等快照体系补完后再升级"],
            },
            highlights: {
                lead: "最后一页在你这里适合写成一句收刀式结尾，像一部片子最后留下的那个镜头。",
                cards: [
                    ["赛季最高单日", "341", "GW20 Day2，是那种一看就很像你会打出来的分数。"],
                    ["最高 OR 日", "Top 0.4%", "真正意义上的锋利高光。"],
                    ["赛季标签", "老练", "你不是最张扬的经理，但你很像一个知道自己在干嘛的人。"],
                ],
                quote: "有些经理会用很多操作让人记住自己，而你更像是那种只用几个关键瞬间，就让人知道你一直都在的人。",
                sideTitle: "页面 6 建议",
                sideBullets: ["这一页适合更短更狠的句子", "也适合做成像赛季奖杯页的视觉收束"],
                sideKpis: [["结尾气质", "收刀感"], ["推荐动画", "缓慢翻页"]],
            },
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

    function hashSeed(text) {
        let hash = 0;
        Array.from(String(text || "")).forEach((char) => {
            hash = char.charCodeAt(0) + ((hash << 5) - hash);
        });
        return Math.abs(hash);
    }

    function buildFallbackProfile(uid) {
        const seed = hashSeed(uid);
        const curve = Array.from({ length: 12 }, (_, i) => 42 + ((seed + i * 11) % 30));
        const makeCards = () => [
            ["赛季总得分", (25000 + (seed % 3200)).toLocaleString("en-US"), "占位数字，只用来确认版式。"],
            ["全球排名", `#${(12000 + (seed % 42000)).toLocaleString("en-US")}`, "真实版会替换成缓存结果。"],
            ["赛季序列", `${(seed % 3) + 1}th`, "这个 demo 目的是让任何 UID 都能先看到完整效果。"],
        ];
        return {
            uid: String(uid || ""),
            managerName: `UID ${uid}`,
            seasonLabel: "2025-26",
            seasonCount: (seed % 3) + 1,
            sourceLabel: "demo fallback",
            sourceNote: "本地还没有缓存这个 UID 的静态资料，当前展示的是 demo 模板效果。",
            intro: "这是一套占位模板，用来确认版式、翻页感和信息密度。后续只需要把静态缓存换成真实结果即可。",
            cover: { subtitle: "现在先关注页面感觉，不必纠结数字本身；真正接数据时，故事线还能继续打磨。", tags: ["Demo", "待接真实数据", "本地可跑"], footer: [["当前模式", "Demo"], ["是否联网", "No"], ["后续工作", "接静态缓存"]] },
            overview: { lead: "这页会是整个故事册里最像总览页的一页。", cards: makeCards(), curve, sideTitle: "接真实数据时", sideBullets: ["把 overview、curve 改成你离线缓存的真实 JSON 即可", "这份 demo 不依赖后端，因此可以一直本地迭代"], sideKpis: [["运行方式", "Local"], ["完成度", "初版"]] },
            transfers: { lead: "这页未来可以直接替换成从静态缓存里读到的赛季转会总结。", rows: [["总转会", `${22 + (seed % 20)} 次，占位数字。`], ["操作周数", `${10 + (seed % 12)} 周做过操作，占位数字。`], ["累计扣分", `-${seed % 20}，占位数字。`], ["最常换入", "这里后面会替换成真实球员名。"]], quote: "这是一句占位文案，用来先看故事口吻顺不顺。", sideTitle: "页面 3 接法", sideBullets: ["静态缓存里存总转会、活跃周、扣分、最常换入/换出", "后续文案可按经理风格自动切换"] },
            captain: { lead: "这页未来只要有静态缓存的 captain summary，就能直接替换。", cards: [["Captain 次数", `${10 + (seed % 10)}`, "占位数字。"], ["队长总得分", `${1500 + (seed % 500)}`, "占位数字。"], ["最爱 Captain", "Jokic", "占位球员。"]], rows: [["最高队长", "GW12 Day3，Jokic，152 分。"], ["最低队长", "GW5 Day1，Tatum，18 分。"]], sideTitle: "页面 4 接法", sideBullets: ["静态缓存里只要有 Captain summary，这页就完全能离线跑", "也很适合做成最有戏剧感的一页"] },
            roster: { lead: "持有页是最需要故事感的一页，真实版后面可以慢慢加。", rows: [["最长持有", "某球员连续 33 天，占位信息。"], ["替补遗憾", "替补席高分若干次，占位信息。"], ["冷门高光", "低持有率高光球员，占位信息。"]], badges: ["占位标签", "等你加梗", "这页会很好玩"], sideTitle: "页面 5 接法", sideBullets: ["先做最长持有、板凳遗憾", "冷门高光晚点接也完全没问题"] },
            highlights: { lead: "最后一页的目的，是先让你看到这种收尾方式对不对。", cards: [["赛季最高单日", `${260 + (seed % 90)}`, "占位数字。"], ["最高 OR 日", "Top 1.2%", "占位数字。"], ["赛季标签", "待命名", "等真实版再定一句更准的结语。"]], quote: "你可以先判断这种像故事册一样收尾的感觉是不是你想要的。", sideTitle: "页面 6 接法", sideBullets: ["真实版只需要替换高光数字与一句收尾文案", "这页最适合加轻微动画，不需要太花"], sideKpis: [["适合先做", "Yes"], ["后端依赖", "低"]] },
        };
    }

    function getProfile(uid) {
        const key = String(uid || "").trim();
        return SAMPLE_CACHE[key] || buildFallbackProfile(key || "demo");
    }

    function chartPath(values, width, height) {
        const list = Array.isArray(values) && values.length ? values : [48, 52, 50, 61, 58, 67, 70];
        const min = Math.min(...list);
        const max = Math.max(...list);
        const span = Math.max(1, max - min);
        return list.map((value, index) => {
            const x = 24 + (index * (width - 48)) / Math.max(1, list.length - 1);
            const y = height - 18 - ((value - min) / span) * (height - 36);
            return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
        }).join(" ");
    }

    function sideKpis(items) {
        const list = Array.isArray(items) ? items : [];
        if (!list.length) return "";
        return `<div class="side-kpi">${list.map((item) => `<div><span>${escapeHtml(item[0])}</span><strong>${escapeHtml(item[1])}</strong></div>`).join("")}</div>`;
    }

    function rowsMarkup(rows, className) {
        return (Array.isArray(rows) ? rows : []).map((item) => `<div class="${className}"><strong>${escapeHtml(item[0])}</strong><span>${escapeHtml(item[1])}</span></div>`).join("");
    }

    function cardsMarkup(cards) {
        return (Array.isArray(cards) ? cards : []).map((item) => `
            <div class="stat-card">
                <div class="stat-label">${escapeHtml(item[0])}</div>
                <div class="stat-value">${escapeHtml(item[1])}</div>
                <div class="stat-sub">${escapeHtml(item[2])}</div>
            </div>
        `).join("");
    }

    function renderPages(profile) {
        return `
            <section class="page active">
                <div class="page-main cover-card">
                    <div>
                        <div class="cover-kicker">Page 1</div>
                        <div class="cover-title">${escapeHtml(profile.managerName)}<br>赛季总结</div>
                        <p class="cover-subtitle">${escapeHtml(profile.cover.subtitle)}</p>
                        <div class="badge-pile">${(profile.cover.tags || []).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>
                    </div>
                    <div class="cover-footer">${(profile.cover.footer || []).map((item) => `<div><span>${escapeHtml(item[0])}</span><strong>${escapeHtml(item[1])}</strong></div>`).join("")}</div>
                </div>
                <aside class="page-side side-panel">
                    <h3>当前资料卡</h3>
                    <p>${escapeHtml(profile.intro)}</p>
                    <ul>
                        <li>UID: ${escapeHtml(profile.uid)}</li>
                        <li>赛季: ${escapeHtml(profile.seasonLabel)}</li>
                        <li>这是第 ${escapeHtml(String(profile.seasonCount))} 个赛季</li>
                    </ul>
                    <h3>当前数据来源</h3>
                    <p>${escapeHtml(profile.sourceNote)}</p>
                    ${sideKpis([["Mode", profile.sourceLabel || "local"], ["Backend", "Off"]])}
                </aside>
            </section>
            <section class="page">
                <div class="page-main">
                    <div class="page-index">Page 2</div>
                    <h2>整体回顾</h2>
                    <p class="page-lead">${escapeHtml(profile.overview.lead)}</p>
                    <div class="stat-grid">${cardsMarkup(profile.overview.cards)}</div>
                    <div class="curve-card">
                        <h3>赛季变化曲线</h3>
                        <div class="mini-chart"><svg viewBox="0 0 760 220" preserveAspectRatio="none"><path d="${chartPath(profile.overview.curve, 760, 220)}" fill="none" stroke="#ff7b54" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"></path></svg></div>
                    </div>
                </div>
                <aside class="page-side side-panel">
                    <h3>${escapeHtml(profile.overview.sideTitle)}</h3>
                    <ul>${(profile.overview.sideBullets || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
                    ${sideKpis(profile.overview.sideKpis)}
                </aside>
            </section>
            <section class="page">
                <div class="page-main">
                    <div class="page-index">Page 3</div>
                    <h2>转会情况</h2>
                    <p class="page-lead">${escapeHtml(profile.transfers.lead)}</p>
                    <div class="story-card"><h3>赛季转会画像</h3><div class="story-list">${rowsMarkup(profile.transfers.rows, "story-row")}</div></div>
                    <div class="quote-card"><h3>赛季句子</h3><p>${escapeHtml(profile.transfers.quote)}</p></div>
                </div>
                <aside class="page-side side-panel">
                    <h3>${escapeHtml(profile.transfers.sideTitle)}</h3>
                    <ul>${(profile.transfers.sideBullets || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
                </aside>
            </section>
            <section class="page">
                <div class="page-main">
                    <div class="page-index">Page 4</div>
                    <h2>队长情况</h2>
                    <p class="page-lead">${escapeHtml(profile.captain.lead)}</p>
                    <div class="stat-grid">${cardsMarkup(profile.captain.cards)}</div>
                    <div class="timeline-card"><h3>高低起伏</h3><div class="timeline-list">${rowsMarkup(profile.captain.rows, "timeline-row")}</div></div>
                </div>
                <aside class="page-side side-panel">
                    <h3>${escapeHtml(profile.captain.sideTitle)}</h3>
                    <ul>${(profile.captain.sideBullets || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
                </aside>
            </section>
            <section class="page">
                <div class="page-main">
                    <div class="page-index">Page 5</div>
                    <h2>持有球员情况</h2>
                    <p class="page-lead">${escapeHtml(profile.roster.lead)}</p>
                    <div class="story-card"><h3>球员羁绊</h3><div class="story-list">${rowsMarkup(profile.roster.rows, "story-row")}</div></div>
                    <div class="badge-pile">${(profile.roster.badges || []).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>
                </div>
                <aside class="page-side side-panel">
                    <h3>${escapeHtml(profile.roster.sideTitle)}</h3>
                    <ul>${(profile.roster.sideBullets || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
                </aside>
            </section>
            <section class="page">
                <div class="page-main">
                    <div class="page-index">Page 6</div>
                    <h2>高光时刻</h2>
                    <p class="page-lead">${escapeHtml(profile.highlights.lead)}</p>
                    <div class="stat-grid">${cardsMarkup(profile.highlights.cards)}</div>
                    <div class="quote-card"><h3>结尾句</h3><p>${escapeHtml(profile.highlights.quote)}</p></div>
                </div>
                <aside class="page-side side-panel">
                    <h3>${escapeHtml(profile.highlights.sideTitle)}</h3>
                    <ul>${(profile.highlights.sideBullets || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
                    ${sideKpis(profile.highlights.sideKpis)}
                </aside>
            </section>
        `;
    }

    const pageStack = document.getElementById("page-stack");
    const indicator = document.getElementById("page-indicator");
    const statusText = document.getElementById("status-text");
    const statusSource = document.getElementById("status-source");
    const uidInput = document.getElementById("uid-input");
    const generateButton = document.getElementById("generate-btn");
    const prevButton = document.getElementById("prev-page");
    const nextButton = document.getElementById("next-page");
    let currentPage = 0;

    function applyPager() {
        const pages = Array.from(document.querySelectorAll(".page"));
        pages.forEach((page, index) => {
            page.classList.toggle("active", index === currentPage);
            page.style.zIndex = index === currentPage ? "2" : String(1 - index);
        });
        indicator.textContent = `${currentPage + 1} / ${pages.length}`;
        prevButton.disabled = currentPage === 0;
        nextButton.disabled = currentPage === pages.length - 1;
        prevButton.style.opacity = currentPage === 0 ? "0.5" : "1";
        nextButton.style.opacity = currentPage === pages.length - 1 ? "0.5" : "1";
    }

    function renderProfile(uid) {
        const profile = getProfile(uid);
        pageStack.innerHTML = renderPages(profile);
        currentPage = 0;
        applyPager();
        statusText.textContent = `${profile.managerName} · UID ${profile.uid} · ${profile.sourceNote}`;
        statusSource.textContent = `Source: ${profile.sourceLabel}`;
    }

    function submitCurrentUid() {
        renderProfile(String(uidInput.value || "").trim() || "6412");
    }

    generateButton.addEventListener("click", submitCurrentUid);
    uidInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") submitCurrentUid();
    });
    prevButton.addEventListener("click", () => {
        currentPage = Math.max(0, currentPage - 1);
        applyPager();
    });
    nextButton.addEventListener("click", () => {
        const total = document.querySelectorAll(".page").length;
        currentPage = Math.min(total - 1, currentPage + 1);
        applyPager();
    });
    Array.from(document.querySelectorAll(".sample-chip")).forEach((button) => {
        button.addEventListener("click", () => {
            uidInput.value = button.dataset.uid || "";
            submitCurrentUid();
        });
    });
    window.addEventListener("keydown", (event) => {
        if (event.key === "ArrowRight") nextButton.click();
        if (event.key === "ArrowLeft") prevButton.click();
    });

    const initialUid = new URLSearchParams(window.location.search).get("uid") || uidInput.value || "6412";
    uidInput.value = initialUid;
    renderProfile(initialUid);
})();
