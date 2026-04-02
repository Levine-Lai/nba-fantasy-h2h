const API_BASE = (window.__API_BASE__ || "").trim().replace(/\/+$/, "");

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
            return response;
        } catch (error) {
            console.error(`[API Error] ${url}`, error);
            throw error;
        }
    },

    async getState() {
        return (await this.fetch("/api/state?fresh_h2h=1")).json();
    },

    async getGameDetail(fixtureId) {
        return (await this.fetch(`/api/fixture/${fixtureId}`)).json();
    },

    async getLineup(uid) {
        return (await this.fetch(`/api/picks/${uid}`)).json();
    },

    async getInjuries() {
        return (await this.fetch("/api/injuries")).json();
    },

    async getPlayerReference(player = "nikola-jokic") {
        return (await this.fetch(`/api/player-reference?player=${encodeURIComponent(player)}`)).json();
    },

    async getTeamAttackDefense() {
        return (await this.fetch("/api/team-attack-defense")).json();
    },

    async getPaceDiffCsv() {
        return (await this.fetch("/data.csv")).text();
    },

    async getPlayerOptions() {
        return (await this.fetch("/api/player-options")).json();
    },

    async refresh() {
        return (await this.fetch("/api/refresh", { method: "POST" })).json();
    },
};

// Update this snapshot when a new gameweek closes.
const GW23_LAST_STANDINGS = [
    { rank: 1, uid: "2", team_name: "大吉鲁", gw: 23, won: 17, draw: 1, lost: 5, scored: 28919, conceded: 26523, points: 52 },
    { rank: 2, uid: "15", team_name: "笨笨", gw: 23, won: 17, draw: 0, lost: 6, scored: 25710, conceded: 26714, points: 51 },
    { rank: 3, uid: "4319", team_name: "Kimi", gw: 23, won: 16, draw: 0, lost: 7, scored: 29028, conceded: 27091, points: 48 },
    { rank: 4, uid: "5095", team_name: "AI", gw: 23, won: 16, draw: 0, lost: 7, scored: 26188, conceded: 27733, points: 48 },
    { rank: 5, uid: "3455", team_name: "Paul", gw: 23, won: 15, draw: 0, lost: 8, scored: 29323, conceded: 27748, points: 45 },
    { rank: 6, uid: "10", team_name: "弗老大", gw: 23, won: 15, draw: 0, lost: 8, scored: 28692, conceded: 27800, points: 45 },
    { rank: 7, uid: "17", team_name: "堡", gw: 23, won: 14, draw: 1, lost: 8, scored: 29055, conceded: 26287, points: 43 },
    { rank: 8, uid: "6", team_name: "紫葱酱", gw: 23, won: 14, draw: 0, lost: 9, scored: 28438, conceded: 27412, points: 42 },
    { rank: 9, uid: "14", team_name: "酸男", gw: 23, won: 14, draw: 0, lost: 9, scored: 28686, conceded: 28301, points: 42 },
    { rank: 10, uid: "5410", team_name: "kusuri", gw: 23, won: 13, draw: 0, lost: 10, scored: 29212, conceded: 27763, points: 39 },
    { rank: 11, uid: "9", team_name: "雕哥", gw: 23, won: 13, draw: 0, lost: 10, scored: 28049, conceded: 27245, points: 39 },
    { rank: 12, uid: "4224", team_name: "班班", gw: 23, won: 12, draw: 0, lost: 11, scored: 28216, conceded: 27955, points: 36 },
    { rank: 13, uid: "189", team_name: "凯文", gw: 23, won: 12, draw: 0, lost: 11, scored: 27804, conceded: 27883, points: 36 },
    { rank: 14, uid: "5101", team_name: "鬼嗨", gw: 23, won: 12, draw: 0, lost: 11, scored: 27036, conceded: 27324, points: 36 },
    { rank: 15, uid: "32", team_name: "伍家辉", gw: 23, won: 11, draw: 0, lost: 12, scored: 29301, conceded: 27110, points: 33 },
    { rank: 16, uid: "16447", team_name: "文史哲", gw: 23, won: 11, draw: 0, lost: 12, scored: 27842, conceded: 28036, points: 33 },
    { rank: 17, uid: "6441", team_name: "马哥", gw: 23, won: 10, draw: 0, lost: 13, scored: 26428, conceded: 26957, points: 30 },
    { rank: 18, uid: "23", team_name: "橘队", gw: 23, won: 9, draw: 0, lost: 14, scored: 27425, conceded: 27816, points: 27 },
    { rank: 19, uid: "4", team_name: "尼弟", gw: 23, won: 9, draw: 0, lost: 14, scored: 27642, conceded: 28320, points: 27 },
    { rank: 20, uid: "11", team_name: "船哥", gw: 23, won: 9, draw: 0, lost: 14, scored: 27494, conceded: 28599, points: 27 },
    { rank: 21, uid: "6412", team_name: "阿甘", gw: 23, won: 8, draw: 0, lost: 15, scored: 25416, conceded: 27094, points: 24 },
    { rank: 22, uid: "22761", team_name: "纪导", gw: 23, won: 7, draw: 0, lost: 16, scored: 27950, conceded: 28277, points: 21 },
    { rank: 23, uid: "42", team_name: "桑迪", gw: 23, won: 7, draw: 0, lost: 16, scored: 25139, conceded: 27583, points: 21 },
    { rank: 24, uid: "5467", team_name: "老姜", gw: 23, won: 7, draw: 0, lost: 16, scored: 25937, conceded: 28454, points: 21 },
    { rank: 25, uid: "6562", team_name: "柯南", gw: 23, won: 5, draw: 0, lost: 18, scored: 27662, conceded: 27795, points: 15 },
    { rank: 26, uid: "8580", team_name: "小火龙", gw: 23, won: 5, draw: 0, lost: 18, scored: 25146, conceded: 27918, points: 15 },
];

const MAX_TITLE_POINTS_REMAINING = 6;
const TRANSFER_DIAGRAM_THRESHOLD = 2;
const TRANSFER_DIAGRAM_OTHERS = "Others";

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function formatEo(player) {
    if (player?.today_has_game === false) return "--";
    const direct = Number(player?.eo_percent);
    if (Number.isFinite(direct)) return `${direct.toFixed(1)}%`;
    const ownership = Number(player?.ownership_percent);
    if (!Number.isFinite(ownership)) return "--";
    const eo = player?.is_effective ? 100 - ownership : -ownership;
    return `${eo.toFixed(1)}%`;
}

function normalizeStatusClass(status) {
    return String(status || "").trim().toLowerCase().replace(/[^a-z]+/g, "-");
}

function getWinMoodEmoji(probability) {
    const prob = Number(probability || 0);
    if (prob >= 95) return "😄";
    if (prob >= 75) return "😎";
    if (prob >= 55) return "🙂";
    if (prob > 45) return "😐";
    if (prob > 20) return "😟";
    if (prob > 0) return "😢";
    return "😭";
}

function renderChipStatusCards(status) {
    const chips = [
        { label: "Captain", used: !!status?.captain_used },
        { label: "WC", used: !!status?.wildcard_used },
        { label: "AS", used: !!status?.all_stars_used },
    ];
    return `
        <div class="score-chip-row">
            ${chips.map((chip) => `
                <span class="score-chip-status ${chip.used ? "used" : "unused"}">
                    <span class="score-chip-label">${chip.label}</span>
                    <span class="score-chip-icon">${chip.used ? "✕" : "✓"}</span>
                </span>
            `).join("")}
        </div>
    `;
}

function sortInjuriesForView(items) {
    const order = {
        available: 0,
        probable: 1,
        questionable: 2,
        doubtful: 3,
        out: 4,
    };
    return [...(items || [])].sort((a, b) => {
        const left = Number(order[String(a?.status_short || a?.status || "").toLowerCase()] ?? 99);
        const right = Number(order[String(b?.status_short || b?.status || "").toLowerCase()] ?? 99);
        return left - right || String(a?.player_name || "").localeCompare(String(b?.player_name || ""));
    });
}

function hexToRgba(hex, alpha = 0.14) {
    const raw = String(hex || "").trim();
    const normalized = raw.startsWith("#") ? raw.slice(1) : raw;
    if (!/^[0-9a-f]{6}$/i.test(normalized)) {
        return `rgba(15, 23, 42, ${alpha})`;
    }
    const r = parseInt(normalized.slice(0, 2), 16);
    const g = parseInt(normalized.slice(2, 4), 16);
    const b = parseInt(normalized.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getManagerLogoUrl(name) {
    return `/players-logos/${encodeURIComponent(String(name || "").trim())}.jpg`;
}

function getTeamLogoUrl(teamName, providedUrl = "") {
    if (providedUrl) return providedUrl;
    const key = String(teamName || "").trim().toLowerCase();
    const logoMap = {
        "atlanta hawks": "hawks.png",
        "boston celtics": "celtics.png",
        "brooklyn nets": "nets.png",
        "charlotte hornets": "hornets.png",
        "chicago bulls": "bulls.png",
        "cleveland cavaliers": "cavaliers.png",
        "dallas mavericks": "mavericks.png",
        "denver nuggets": "nuggets.png",
        "detroit pistons": "pistons.png",
        "golden state warriors": "warriors.png",
        "houston rockets": "rockets.png",
        "indiana pacers": "pacers.png",
        "los angeles clippers": "clippers.png",
        "los angeles lakers": "lakers.png",
        "memphis grizzlies": "grizzlies.png",
        "miami heat": "heat.png",
        "milwaukee bucks": "bucks.png",
        "minnesota timberwolves": "timberwolves.png",
        "new orleans pelicans": "pelicans.png",
        "new york knicks": "knicks.png",
        "oklahoma city thunder": "thunder.png",
        "orlando magic": "magic.png",
        "philadelphia 76ers": "sixers.png",
        "phoenix suns": "suns.png",
        "portland trail blazers": "blazers.png",
        "sacramento kings": "kings.png",
        "san antonio spurs": "spurs.png",
        "toronto raptors": "raptors.png",
        "utah jazz": "jazz.png",
        "washington wizards": "wizards.png",
    };
    return `/nba-team-logos/${logoMap[key] || "_.png"}`;
}

function parseSeasonPaceDiffCsv(csvText) {
    const text = String(csvText || "").trim();
    if (!text) return [];
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) return [];
    const headers = lines[0].split(",");
    const teamIndex = headers.indexOf("Team");
    const nrtgIndex = headers.indexOf("NRtg");
    const paceIndex = headers.indexOf("Pace");
    if (teamIndex === -1 || nrtgIndex === -1 || paceIndex === -1) return [];

    return lines.slice(1)
        .map((line) => {
            const cols = line.split(",");
            const teamName = String(cols[teamIndex] || "").replace(/\*+/g, "").trim();
            if (!teamName || /league average/i.test(teamName)) return null;
            const pace = Number(String(cols[paceIndex] || "").trim());
            const nRtg = Number(String(cols[nrtgIndex] || "").replace(/^\+/, "").trim());
            if (!Number.isFinite(pace) || !Number.isFinite(nRtg)) return null;
            return {
                team_name: teamName,
                logo_url: getTeamLogoUrl(teamName),
                pace: Number(pace.toFixed(1)),
                n_rtg: Number(nRtg.toFixed(1)),
                abs_n_rtg: Number(Math.abs(nRtg).toFixed(1)),
            };
        })
        .filter(Boolean)
        .sort((a, b) =>
            a.abs_n_rtg - b.abs_n_rtg ||
            b.pace - a.pace ||
            String(a.team_name || "").localeCompare(String(b.team_name || ""))
        );
}

function renderTransferRecords(teamName, transferRecords, side = "left", captainUsed = null) {
    const rows = (transferRecords || []).map((record) => `
        <div class="transfer-record ${side === "right" ? "align-right" : ""}">
            <div class="transfer-day">${escapeHtml(record.day_label || "DAY?")}</div>
            <div class="transfer-move">${record.out_name && record.in_name
                ? `${escapeHtml(record.out_name)}<span class="transfer-arrow">-></span>${escapeHtml(record.in_name)}`
                : escapeHtml(record.move || "")}</div>
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

function getBeijingHour(date = new Date()) {
    return Number(new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Shanghai",
        hour: "2-digit",
        hour12: false,
    }).format(date));
}

function getNextRefreshDelay(fixtures) {
    const games = Array.isArray(fixtures?.games) ? fixtures.games : [];
    if (!games.length) return null;

    const bjHour = getBeijingHour(new Date());
    const inRefreshWindow = bjHour >= 7 && bjHour < 14;
    const hasUnfinishedGames = games.some((game) => !game?.finished);
    if (!inRefreshWindow || !hasUnfinishedGames) return null;

    const kickoffTimes = games
        .map((game) => (game?.kickoff_time ? Date.parse(game.kickoff_time) : NaN))
        .filter((value) => Number.isFinite(value));
    const earliestKickoff = kickoffTimes.length ? Math.min(...kickoffTimes) : null;
    const now = Date.now();

    if (earliestKickoff && now < earliestKickoff) {
        return Math.max(30000, earliestKickoff - now);
    }

    return 120000;
}

function extractGameweekNumber(eventName) {
    const text = String(eventName || "");
    const match = text.match(/gameweek\s*(\d+)/i);
    return match ? Number(match[1]) : null;
}

function extractEventDayNumber(eventName) {
    const text = String(eventName || "");
    const match = text.match(/day\s*(\d+)/i);
    return match ? Number(match[1]) : null;
}

function getStandingsDisplayName(uid, state, fallback = "-") {
    const key = String(uid || "");
    return state?.picks_by_uid?.[key]?.team_name || fallback;
}

function buildStaticStandingsRows(state) {
    const leaderPoints = GW23_LAST_STANDINGS.reduce((max, row) => Math.max(max, Number(row?.points || 0)), 0);
    return GW23_LAST_STANDINGS.map((row) => ({
        ...row,
        team_name: getStandingsDisplayName(row.uid, state, row.team_name),
        contender: Number(row.points || 0) + MAX_TITLE_POINTS_REMAINING >= leaderPoints,
    }));
}

function buildLiveStandingsRows(state) {
    const currentGw = extractGameweekNumber(state?.current_event_name) || 24;
    const byUid = {};

    GW23_LAST_STANDINGS.forEach((row) => {
        byUid[String(row.uid)] = {
            ...row,
            gw: currentGw,
            team_name: getStandingsDisplayName(row.uid, state, row.team_name),
            base_rank: Number(row.rank || 0),
            contender: false,
        };
    });

    (state?.h2h || []).forEach((match) => {
        const uid1 = String(match?.uid1 || "");
        const uid2 = String(match?.uid2 || "");
        const left = byUid[uid1];
        const right = byUid[uid2];
        if (!left || !right) return;

        const total1 = Number(match?.total1 || 0);
        const total2 = Number(match?.total2 || 0);
        left.gw = currentGw;
        right.gw = currentGw;
        left.scored += total1;
        left.conceded += total2;
        right.scored += total2;
        right.conceded += total1;

        if (total1 > total2) {
            left.won += 1;
            left.points += 3;
            right.lost += 1;
        } else if (total2 > total1) {
            right.won += 1;
            right.points += 3;
            left.lost += 1;
        } else {
            left.draw += 1;
            right.draw += 1;
            left.points += 1;
            right.points += 1;
        }
    });

    return Object.values(byUid)
        .map((row) => ({
            ...row,
            diff: Number(row.scored || 0) - Number(row.conceded || 0),
        }))
        .sort((a, b) =>
            Number(b.points || 0) - Number(a.points || 0) ||
            Number(b.won || 0) - Number(a.won || 0) ||
            Number(b.diff || 0) - Number(a.diff || 0) ||
            Number(b.scored || 0) - Number(a.scored || 0) ||
            Number(a.base_rank || a.rank || 0) - Number(b.base_rank || b.rank || 0) ||
            String(a.team_name || "").localeCompare(String(b.team_name || ""))
        )
        .map((row, index) => ({
            ...row,
            rank: index + 1,
        }));
}

function renderStandingsTable(rows, options = {}) {
    const items = Array.isArray(rows) ? rows : [];
    if (!items.length) return '<div class="trend-empty">No standings data</div>';

    const highlightContenders = !!options.highlightContenders;
    return `
        <div class="rankings-table-scroll">
            <table class="rankings-table">
                <thead>
                    <tr>
                        <th>排名</th>
                        <th class="team-col">玩家</th>
                        <th>当前GW</th>
                        <th>W</th>
                        <th>D</th>
                        <th>L</th>
                        <th class="points-col">积分</th>
                    </tr>
                </thead>
                <tbody>
                    ${items.map((row) => `
                        <tr class="${highlightContenders && row?.contender ? "contender-row" : ""}">
                            <td>${Number(row?.rank || 0)}</td>
                            <td class="team-cell">${escapeHtml(row?.team_name || "-")}</td>
                            <td>${Number(row?.gw || 0)}</td>
                            <td>${Number(row?.won || 0)}</td>
                            <td>${Number(row?.draw || 0)}</td>
                            <td>${Number(row?.lost || 0)}</td>
                            <td class="points-cell">${Number(row?.points || 0)}</td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        </div>
    `;
}

function renderFdrTableInto(headerRowId, badgeId, bodyId, data) {
    const headerRow = document.getElementById(headerRowId);
    const badge = document.getElementById(badgeId);
    const body = document.getElementById(bodyId);
    if (!headerRow || !badge || !body) return;

    const weeks = Array.isArray(data?.weeks) ? data.weeks : [];
    headerRow.innerHTML = `<th class="t-name">TEAM</th>${weeks.map((week) => `<th>${week}</th>`).join("")}<th class="avg-col">AVG</th>`;
    badge.textContent = weeks.length ? `GW ${weeks.join("-")}` : "Auto GW";
    body.innerHTML = data?.html || '<tr><td colspan="5" style="text-align:center;padding:20px;">No FDR data</td></tr>';
}

function getTransferDiagramColor(value, alpha = 1) {
    const text = String(value || "");
    let hash = 0;
    for (let index = 0; index < text.length; index += 1) {
        hash = text.charCodeAt(index) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return alpha === 1
        ? `hsl(${hue}, 70%, 52%)`
        : `hsla(${hue}, 70%, 52%, ${alpha})`;
}

function measureDiagramLabelUnits(text) {
    return Array.from(String(text || "")).reduce((sum, ch) => (
        sum + (/[\u0000-\u00ff]/.test(ch) ? 0.62 : 1.02)
    ), 0);
}

function chunkDiagramToken(token, maxUnits) {
    const chars = Array.from(String(token || ""));
    if (!chars.length) return [];
    const parts = [];
    let current = "";
    let units = 0;
    chars.forEach((ch) => {
        const charUnits = measureDiagramLabelUnits(ch);
        if (current && units + charUnits > maxUnits) {
            parts.push(current);
            current = ch;
            units = charUnits;
            return;
        }
        current += ch;
        units += charUnits;
    });
    if (current) parts.push(current);
    return parts;
}

function splitDiagramLabel(name, maxUnits = 13.5, maxLines = 2) {
    const raw = String(name || "").trim();
    if (!raw) return ["-"];

    const tokens = raw
        .replace(/([.\-/])/g, "$1 ")
        .replace(/\s+/g, " ")
        .trim()
        .split(" ")
        .filter(Boolean)
        .flatMap((token) => (
            measureDiagramLabelUnits(token) > maxUnits * 1.1
                ? chunkDiagramToken(token, maxUnits)
                : [token]
        ));

    const lines = [];
    let current = "";
    tokens.forEach((token) => {
        const candidate = current ? `${current} ${token}` : token;
        if (!current || measureDiagramLabelUnits(candidate) <= maxUnits) {
            current = candidate;
            return;
        }
        lines.push(current);
        current = token;
    });
    if (current) lines.push(current);
    if (lines.length <= maxLines) return lines;
    return [
        lines[0],
        `${lines.slice(1).join(" ").slice(0, 12)}${lines.slice(1).join(" ").length > 12 ? "\u2026" : ""}`,
    ];
}

function renderDiagramLabel(node, side, nodeWidth) {
    const x = side === "left"
        ? Number(node.x || 0) - 16
        : Number(node.x || 0) + nodeWidth + 16;
    const anchor = side === "left" ? "end" : "start";
    const lineHeight = 18;
    const lines = splitDiagramLabel(node.name);
    const startY = Number(node.y || 0) + Number(node.height || 0) / 2 - ((lines.length - 1) * lineHeight) / 2;
    return `<text class="trend-sankey-label" x="${x}" y="${startY}" text-anchor="${anchor}" dominant-baseline="middle">${lines.map((line, index) => `<tspan x="${x}" dy="${index === 0 ? 0 : lineHeight}">${escapeHtml(line)}</tspan>`).join("")}</text>`;
}

function compareDiagramNames(a, b) {
    const aOthers = a === TRANSFER_DIAGRAM_OTHERS;
    const bOthers = b === TRANSFER_DIAGRAM_OTHERS;
    if (aOthers !== bOthers) return aOthers ? 1 : -1;
    return String(a || "").localeCompare(String(b || ""));
}

function buildTransferDiagramData(picksByUid) {
    const rawLinks = [];
    const sourceTotals = {};
    const targetTotals = {};
    const sourcePartners = {};
    const targetPartners = {};
    let totalMoves = 0;

    Object.values(picksByUid || {}).forEach((payload) => {
        (payload?.transfer_records || []).forEach((record) => {
            const source = String(record?.out_name || "").trim();
            const target = String(record?.in_name || "").trim();
            if (!source || !target) return;
            totalMoves += 1;
            rawLinks.push({ source, target, value: 1 });
            sourceTotals[source] = Number(sourceTotals[source] || 0) + 1;
            targetTotals[target] = Number(targetTotals[target] || 0) + 1;
            if (!sourcePartners[source]) sourcePartners[source] = new Set();
            if (!targetPartners[target]) targetPartners[target] = new Set();
            sourcePartners[source].add(target);
            targetPartners[target].add(source);
        });
    });

    if (!rawLinks.length) {
        return { totalMoves: 0, links: [], leftNodes: [], rightNodes: [] };
    }

    const keepSources = new Set(
        Object.keys(sourceTotals).filter((name) => {
            const total = Number(sourceTotals[name] || 0);
            if (total < TRANSFER_DIAGRAM_THRESHOLD) return false;
            const partners = Array.from(sourcePartners[name] || []);
            return total >= 3 || partners.some((partner) => Number(targetTotals[partner] || 0) >= TRANSFER_DIAGRAM_THRESHOLD);
        })
    );

    const keepTargets = new Set(
        Object.keys(targetTotals).filter((name) => {
            const total = Number(targetTotals[name] || 0);
            if (total < TRANSFER_DIAGRAM_THRESHOLD) return false;
            const partners = Array.from(targetPartners[name] || []);
            return total >= 3 || partners.some((partner) => Number(sourceTotals[partner] || 0) >= TRANSFER_DIAGRAM_THRESHOLD);
        })
    );

    const aggregated = new Map();
    rawLinks.forEach((link) => {
        const normalizedSource = keepSources.has(link.source) ? link.source : TRANSFER_DIAGRAM_OTHERS;
        const normalizedTarget = keepTargets.has(link.target) ? link.target : TRANSFER_DIAGRAM_OTHERS;
        const key = `${normalizedSource}__${normalizedTarget}`;
        const current = aggregated.get(key) || { source: normalizedSource, target: normalizedTarget, value: 0 };
        current.value += 1;
        aggregated.set(key, current);
    });

    const links = Array.from(aggregated.values()).sort((a, b) =>
        Number(b.value || 0) - Number(a.value || 0) ||
        compareDiagramNames(a.source, b.source) ||
        compareDiagramNames(a.target, b.target)
    );

    const leftTotals = {};
    const rightTotals = {};
    links.forEach((link) => {
        leftTotals[link.source] = Number(leftTotals[link.source] || 0) + Number(link.value || 0);
        rightTotals[link.target] = Number(rightTotals[link.target] || 0) + Number(link.value || 0);
    });

    const sortNodes = (entries) => entries
        .map(([name, value]) => ({ name, value: Number(value || 0) }))
        .sort((a, b) =>
            ((a.name === TRANSFER_DIAGRAM_OTHERS) ? 1 : 0) - ((b.name === TRANSFER_DIAGRAM_OTHERS) ? 1 : 0) ||
            Number(b.value || 0) - Number(a.value || 0) ||
            compareDiagramNames(a.name, b.name)
        );

    return {
        totalMoves,
        links,
        leftNodes: sortNodes(Object.entries(leftTotals)),
        rightNodes: sortNodes(Object.entries(rightTotals)),
    };
}

function renderTransferDiagram(picksByUid) {
    const data = buildTransferDiagramData(picksByUid);
    if (!data.links.length) {
        return '<div class="trend-empty">No weekly transfer diagram</div>';
    }

    const width = 1200;
    const topPad = 12;
    const bottomPad = 12;
    const nodeGap = 10;
    const nodeWidth = 18;
    const bundleWidth = 28;
    const leftX = 126;
    const rightX = width - 126 - nodeWidth;
    const minNodeHeight = 16;

    const measureColumnHeight = (nodes, scale) =>
        nodes.reduce((sum, node) => sum + Math.max(Number(node.value || 0) * scale, minNodeHeight), 0) +
        Math.max(0, nodes.length - 1) * nodeGap;

    const maxUnits = Math.max(
        data.leftNodes.reduce((sum, node) => sum + Number(node.value || 0), 0),
        data.rightNodes.reduce((sum, node) => sum + Number(node.value || 0), 0),
        1
    );
    const targetHeight = 500;
    const scale = Math.max(
        10,
        Math.min(26, (targetHeight - topPad - bottomPad - (Math.max(data.leftNodes.length, data.rightNodes.length) - 1) * nodeGap) / maxUnits)
    );
    const height = Math.max(
        360,
        Math.max(measureColumnHeight(data.leftNodes, scale), measureColumnHeight(data.rightNodes, scale)) + topPad + bottomPad
    );

    const layoutColumn = (nodes, x) => {
        let cursor = topPad;
        return nodes.map((node) => {
            const nodeHeight = Math.max(Number(node.value || 0) * scale, minNodeHeight);
            const positioned = { ...node, x, y: cursor, height: nodeHeight };
            cursor += nodeHeight + nodeGap;
            return positioned;
        });
    };

    const leftNodes = layoutColumn(data.leftNodes, leftX);
    const rightNodes = layoutColumn(data.rightNodes, rightX);
    const leftByName = Object.fromEntries(leftNodes.map((node) => [node.name, { ...node }]));
    const rightByName = Object.fromEntries(rightNodes.map((node) => [node.name, { ...node }]));
    const rightOrder = Object.fromEntries(rightNodes.map((node, index) => [node.name, index]));
    const leftOrder = Object.fromEntries(leftNodes.map((node, index) => [node.name, index]));

    const links = data.links.map((link, index) => ({
        ...link,
        id: `trend-transfer-link-${index}`,
        thickness: Math.max(Number(link.value || 0) * scale, 6),
        sourceColor: getTransferDiagramColor(link.source, 1),
        targetColor: getTransferDiagramColor(link.target, 1),
    }));

    Object.values(leftByName).forEach((node) => {
        const nodeLinks = links
            .filter((link) => link.source === node.name)
            .sort((a, b) => Number(rightOrder[a.target] || 0) - Number(rightOrder[b.target] || 0));
        const totalThickness = nodeLinks.reduce((sum, link) => sum + Number(link.thickness || 0), 0);
        let cursor = Number(node.y || 0) + Math.max(0, (Number(node.height || 0) - totalThickness) / 2);
        nodeLinks.forEach((link) => {
            link.sourceY = cursor + Number(link.thickness || 0) / 2;
            cursor += Number(link.thickness || 0);
        });
    });

    Object.values(rightByName).forEach((node) => {
        const nodeLinks = links
            .filter((link) => link.target === node.name)
            .sort((a, b) => Number(leftOrder[a.source] || 0) - Number(leftOrder[b.source] || 0));
        const totalThickness = nodeLinks.reduce((sum, link) => sum + Number(link.thickness || 0), 0);
        let cursor = Number(node.y || 0) + Math.max(0, (Number(node.height || 0) - totalThickness) / 2);
        nodeLinks.forEach((link) => {
            link.targetY = cursor + Number(link.thickness || 0) / 2;
            cursor += Number(link.thickness || 0);
        });
    });

    return `
        <div class="trend-sankey-wrap">
            <div class="trend-sankey-meta">
                <div class="trend-sankey-title">League Moves</div>
                <div class="trend-sankey-note">${Number(data.totalMoves || 0)} total moves · low-signal transfer names are grouped into Others</div>
            </div>
            <svg class="trend-sankey-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Weekly transfer diagram">
                <defs>
                    ${links.map((link) => {
                        const leftNode = leftByName[link.source];
                        const rightNode = rightByName[link.target];
                        if (!leftNode || !rightNode) return "";
                        const startX = Number(leftNode.x || 0) + nodeWidth - 6;
                        const endX = Number(rightNode.x || 0) + 6;
                        const startY = Number(link.sourceY || 0);
                        const endY = Number(link.targetY || 0);
                        return `
                            <linearGradient id="${link.id}" gradientUnits="userSpaceOnUse"
                                x1="${startX}" y1="${startY}" x2="${endX}" y2="${endY}">
                                <stop offset="0%" stop-color="${link.sourceColor}" stop-opacity="0.92"></stop>
                                <stop offset="48%" stop-color="${link.sourceColor}" stop-opacity="0.9"></stop>
                                <stop offset="100%" stop-color="${link.targetColor}" stop-opacity="0.92"></stop>
                            </linearGradient>
                        `;
                    }).join("")}
                </defs>
                ${leftNodes.map((node) => `
                    <rect class="trend-sankey-bundle"
                        x="${Number(node.x || 0) + nodeWidth - 1}"
                        y="${Number(node.y || 0)}"
                        width="${bundleWidth + 2}"
                        height="${Number(node.height || 0)}"
                        rx="9"
                        fill="${getTransferDiagramColor(node.name, 0.18)}"></rect>
                `).join("")}
                ${rightNodes.map((node) => `
                    <rect class="trend-sankey-bundle"
                        x="${Number(node.x || 0) - bundleWidth - 1}"
                        y="${Number(node.y || 0)}"
                        width="${bundleWidth + 2}"
                        height="${Number(node.height || 0)}"
                        rx="9"
                        fill="${getTransferDiagramColor(node.name, 0.18)}"></rect>
                `).join("")}
                ${links.map((link) => {
                    const leftNode = leftByName[link.source];
                    const rightNode = rightByName[link.target];
                    if (!leftNode || !rightNode) return "";
                    const startX = Number(leftNode.x || 0) + nodeWidth - 6;
                    const endX = Number(rightNode.x || 0) + 6;
                    const startY = Number(link.sourceY || 0);
                    const endY = Number(link.targetY || 0);
                    const distance = endX - startX;
                    const controlOffset = Math.max(110, Math.min(distance * 0.4, 220));
                    const path = `M ${startX} ${startY} C ${startX + controlOffset} ${startY}, ${endX - controlOffset} ${endY}, ${endX} ${endY}`;
                    return `
                        <path class="trend-sankey-link"
                            d="${path}"
                            stroke="url(#${link.id})"
                            stroke-width="${Number(link.thickness || 0).toFixed(2)}"
                            fill="none">
                            <title>${escapeHtml(link.source)} -> ${escapeHtml(link.target)}: ${Number(link.value || 0)} moves</title>
                        </path>
                    `;
                }).join("")}
                ${leftNodes.map((node) => `
                    <g>
                        <rect class="trend-sankey-node"
                            x="${Number(node.x || 0)}"
                            y="${Number(node.y || 0)}"
                            width="${nodeWidth}"
                            height="${Number(node.height || 0)}"
                            rx="4"
                            fill="${getTransferDiagramColor(node.name, 1)}"></rect>
                        ${renderDiagramLabel(node, "left", nodeWidth)}
                    </g>
                `).join("")}
                ${rightNodes.map((node) => `
                    <g>
                        <rect class="trend-sankey-node"
                            x="${Number(node.x || 0)}"
                            y="${Number(node.y || 0)}"
                            width="${nodeWidth}"
                            height="${Number(node.height || 0)}"
                            rx="4"
                            fill="${getTransferDiagramColor(node.name, 1)}"></rect>
                        ${renderDiagramLabel(node, "right", nodeWidth)}
                    </g>
                `).join("")}
            </svg>
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

    transferTrends(data, picksByUid = {}) {
        const transferTable = document.getElementById("trend-transfer-table");
        const ownership = document.getElementById("ownership-top");
        const transferHead = document.getElementById("trend-transfer-head");
        const transferCard = document.getElementById("trend-transfer-card");
        if (!transferTable || !ownership || !transferHead || !transferCard) return;

        const formatOneDecimal = (value) => {
            const num = Number(value);
            return Number.isFinite(num) && num > 0 ? num.toFixed(1) : "--";
        };

        const weeklyIn = data?.league?.top_in || data?.overall?.top_in || [];
        const weeklyOut = data?.league?.top_out || data?.overall?.top_out || [];
        const ownershipTop = data?.ownership_top || [];
        const managerCount = Number(data?.ownership_manager_count || 26);
        const direction = App.transferDirection === "out" ? "out" : "in";
        const activeItems = direction === "out" ? weeklyOut : weeklyIn;

        transferCard.classList.toggle("diagram-mode", direction === "diagram");
        transferTable.classList.toggle("diagram-mode", direction === "diagram");
        transferHead.style.display = direction === "diagram" ? "none" : "";

        transferTable.innerHTML = direction === "diagram"
            ? renderTransferDiagram(picksByUid)
            : (
                activeItems.length
                    ? activeItems.map((item) => `
                        <div class="trend-table-row">
                            <span class="trend-player-name">${escapeHtml(item.name)}</span>
                            <span class="trend-cell-number">${formatOneDecimal(item.cost)}</span>
                            <span class="trend-cell-number">${formatOneDecimal(item.form)}</span>
                            <span class="trend-cell-number">${formatOneDecimal(item.value)}</span>
                            <span class="trend-number">${Number(item.transfers || item.count || 0)}</span>
                        </div>
                    `).join("")
                    : '<div class="trend-empty">No weekly transfer trend data</div>'
            );
        ownership.innerHTML = ownershipTop.length
            ? ownershipTop.map((item) => `
                <div class="trend-table-row ownership-row">
                    <span class="trend-player-name">${escapeHtml(item.name)}</span>
                    <span class="trend-cell-number">${formatOneDecimal(item.cost)}</span>
                    <span class="trend-number">${Number(item.holder_count || 0)}/${managerCount}</span>
                    <span class="trend-number">${Number(item.ownership_percent || 0).toFixed(1)}%</span>
                </div>
            `).join("")
            : '<div class="trend-empty">No ownership data</div>';
    },

    chipsUsed(items) {
        const container = document.getElementById("chips-used-summary");
        if (!container) return;

        const rows = Array.isArray(items) ? items : [];
        container.innerHTML = rows.length
            ? rows.map((item, index) => {
                const usedCount = Number(item?.used_count || 0);
                const totalCount = Math.max(1, Number(item?.total_count || 0));
                const percent = Math.max(0, Math.min(100, Number(item?.used_percent || ((usedCount / totalCount) * 100))));
                return `
                    <div class="chips-summary-row ${index < rows.length - 1 ? "with-divider" : ""}">
                        <div class="chips-summary-copy">
                            <div class="chips-summary-label">${escapeHtml(item?.label || "-")}</div>
                            <div class="chips-summary-note">${escapeHtml(item?.note || "")}</div>
                        </div>
                        <div class="chips-summary-bar-wrap">
                            <div class="chips-summary-bar">
                                <div class="chips-summary-fill" style="width:${percent.toFixed(1)}%"></div>
                            </div>
                            <div class="chips-summary-count">${usedCount}/${totalCount}</div>
                        </div>
                    </div>
                `;
            }).join("")
            : '<div class="trend-empty">No chips usage data</div>';
    },

    goodCaptain(picksByUid) {
        const container = document.getElementById("good-captain-summary");
        if (!container) return;

        const entries = Object.entries(picksByUid || {});
        const grouped = new Map();

        entries.forEach(([uid, payload]) => {
            const players = Array.isArray(payload?.players) ? payload.players : [];
            const captainUsed = payload?.captain_used || {};
            const captainPlayer = players.find((player) => !!player?.is_captain && Number(player?.multiplier || 1) > 1)
                || players.find((player) => !!player?.is_captain);
            const used = !!(
                payload?.chip_status?.captain_used ||
                captainUsed?.used ||
                String(payload?.active_chip || "").toLowerCase() === "phcapt" ||
                captainPlayer
            );
            if (!used) return;

            const captainName = String(captainPlayer?.name || captainUsed?.captain_name || "").trim();
            if (!captainName) return;
            const day = Number(captainUsed?.day || extractEventDayNumber(payload?.current_event_name) || 0) || null;
            const captainPoints = Number(
                captainPlayer?.final_points ??
                captainPlayer?.base_points ??
                captainUsed?.captain_points ??
                0
            );
            const key = `${day || 0}__${captainName}`;
            const current = grouped.get(key) || {
                captain_name: captainName,
                captain_points: captainPoints,
                day,
                managers: [],
            };

            current.captain_points = Math.max(Number(current.captain_points || 0), captainPoints);
            current.managers.push({
                uid: String(uid || ""),
                team_name: String(payload?.team_name || payload?.manager_name || `#${uid}`),
                logo_url: getManagerLogoUrl(payload?.team_name || payload?.manager_name || `#${uid}`),
            });
            grouped.set(key, current);
        });

        const rows = Array.from(grouped.values())
            .map((item) => ({
                ...item,
                managers: item.managers.sort((a, b) => String(a.team_name || "").localeCompare(String(b.team_name || ""))),
            }))
            .sort((a, b) =>
                Number(b.captain_points || 0) - Number(a.captain_points || 0) ||
                Number(a.day || 99) - Number(b.day || 99) ||
                String(a.captain_name || "").localeCompare(String(b.captain_name || ""))
            )
            .map((item, index) => ({
                ...item,
                rank: index + 1,
            }));

        const formatCaptainPoints = (value) => {
            const num = Number(value || 0);
            if (!Number.isFinite(num)) return "--";
            return Number.isInteger(num) ? `${num}` : num.toFixed(1);
        };

        container.innerHTML = rows.length
            ? rows.map((item) => `
                <div class="good-captain-item">
                    <div class="good-captain-main">
                        <div class="good-captain-rank">#${item.rank}</div>
                        <div class="good-captain-copy">
                            <div class="good-captain-line">
                                <span class="good-captain-name">${escapeHtml(item.captain_name || "-")}</span>
                                <span class="good-captain-points">${formatCaptainPoints(item.captain_points)}分</span>
                                <span class="good-captain-day">${item.day ? `Day${item.day}` : "Day?"}</span>
                            </div>
                            <div class="good-captain-avatars">
                                ${item.managers.map((manager) => `
                                    <img
                                        class="good-captain-avatar"
                                        src="${escapeHtml(manager.logo_url || "/LOGO.png")}"
                                        alt="${escapeHtml(manager.team_name)} logo"
                                        title="${escapeHtml(manager.team_name)}"
                                        width="36"
                                        height="36"
                                        loading="lazy"
                                        decoding="async"
                                        onerror="this.onerror=null;this.src='/LOGO.png';">
                                `).join("")}
                            </div>
                        </div>
                    </div>
                </div>
            `).join("")
            : '<div class="trend-empty">No captain choices this week</div>';
    },

    specialGuy(picksByUid) {
        const container = document.getElementById("special-guy-summary");
        if (!container) return;

        const managerEntries = Object.values(picksByUid || {}).filter((payload) => Array.isArray(payload?.players) && payload.players.length > 0);
        const managerCount = Math.max(1, managerEntries.length);
        const holderCountByElement = {};

        managerEntries.forEach((payload) => {
            const seen = new Set();
            payload.players.forEach((player) => {
                const elementId = Number(player?.element_id || 0);
                if (!elementId || seen.has(elementId)) return;
                seen.add(elementId);
                holderCountByElement[elementId] = Number(holderCountByElement[elementId] || 0) + 1;
            });
        });

        const rankings = managerEntries
            .map((payload) => {
                const seen = new Set();
                const ownershipValues = [];
                payload.players.forEach((player) => {
                    const elementId = Number(player?.element_id || 0);
                    if (!elementId || seen.has(elementId)) return;
                    seen.add(elementId);
                    ownershipValues.push((Number(holderCountByElement[elementId] || 0) / managerCount) * 100);
                });
                const averageOwnership = ownershipValues.length
                    ? ownershipValues.reduce((sum, value) => sum + Number(value || 0), 0) / ownershipValues.length
                    : 0;
                return {
                    name: String(payload?.team_name || payload?.manager_name || "-"),
                    logo_url: getManagerLogoUrl(payload?.team_name || payload?.manager_name || "-"),
                    average_ownership: Number(averageOwnership.toFixed(1)),
                };
            })
            .sort((a, b) =>
                Number(a.average_ownership || 0) - Number(b.average_ownership || 0) ||
                String(a.name || "").localeCompare(String(b.name || ""))
            )
            .map((item, index) => ({
                ...item,
                rank: index + 1,
            }));

        if (!rankings.length) {
            container.innerHTML = '<div class="trend-empty">No special guy data</div>';
            return;
        }

        container.innerHTML = `
            <div class="special-guy-grid">
                ${rankings.map((item) => `
                    <div class="special-guy-item">
                        <img
                            class="special-guy-avatar"
                            src="${escapeHtml(item.logo_url || "/LOGO.png")}"
                            alt="${escapeHtml(item.name)} logo"
                            title="#${item.rank} ${escapeHtml(item.name)}"
                            width="30"
                            height="30"
                            loading="lazy"
                            decoding="async"
                            onerror="this.onerror=null;this.src='/LOGO.png';">
                        <div class="special-guy-name">${escapeHtml(item.name)}</div>
                        <div class="special-guy-value">${Number(item.average_ownership || 0).toFixed(1)}%</div>
                    </div>
                `).join("")}
            </div>
        `;
    },

    rankings(state) {
        const lastWrap = document.getElementById("rankings-last-table-wrap");
        const liveWrap = document.getElementById("rankings-live-table-wrap");
        const lastBadge = document.getElementById("rankings-last-badge");
        const liveBadge = document.getElementById("rankings-live-badge");
        if (!lastWrap || !liveWrap || !lastBadge || !liveBadge) return;

        const staticRows = buildStaticStandingsRows(state);
        const liveRows = buildLiveStandingsRows(state);
        const currentGw = extractGameweekNumber(state?.current_event_name) || 24;

        lastBadge.textContent = "GW23 Final";
        liveBadge.textContent = `GW${currentGw} Live`;
        lastWrap.innerHTML = renderStandingsTable(staticRows, { highlightContenders: true });
        liveWrap.innerHTML = renderStandingsTable(liveRows);
        renderFdrTableInto("rankings-fdr-header-row", "rankings-fdr-week-badge", "rankings-fdr-body", state?.fdr || {});
    },

    injuries(data) {
        const badge = document.getElementById("injury-date-badge");
        const subtitle = document.getElementById("injury-subtitle");
        const container = document.getElementById("injury-list");
        if (!badge || !subtitle || !container) return;

        subtitle.style.display = "block";
        badge.textContent = data?.target_date || "No Date";
        subtitle.textContent = data?.next_event_name
            ? `${data.next_event_name} · 更新 ${data?.updated_at ? new Date(data.updated_at).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }) : "--:--"}`
            : "暂无下一日伤病数据";

        const teams = Array.isArray(data?.teams) ? data.teams : [];
        if (!teams.length) {
            container.innerHTML = '<div class="trend-empty">No injury data for the next fantasy day</div>';
            return;
        }

        container.innerHTML = teams.map((team) => `
            <div class="injury-card" style="--team-color:${escapeHtml(team.team_color || "#334155")}">
                <div class="injury-card-head">
                    <div class="injury-team-wrap">
                        <img class="injury-team-logo" src="${escapeHtml(team.logo_url || "/nba-team-logos/_.png")}" alt="${escapeHtml(team.team_name)} logo" decoding="async" width="34" height="34" loading="lazy" onerror="this.onerror=null;this.src='/nba-team-logos/_.png';">
                        <div class="injury-team">${escapeHtml(team.team_name)}</div>
                    </div>
                </div>
                ${Array.isArray(team.injuries) && team.injuries.length
                    ? `<div class="injury-rows">${sortInjuriesForView(team.injuries).map((item) => `
                        <div class="injury-row">
                            <div class="injury-line">
                                <span class="injury-player">${escapeHtml(item.player_name)}</span>
                                <span class="injury-status ${normalizeStatusClass(item.status_short || item.status || "")}">${escapeHtml(item.status_short || item.status || "-")}</span>
                            </div>
                        </div>
                    `).join("")}</div>`
                    : '<div class="injury-healthy">全员健康</div>'}
            </div>
        `).join("");
    },

    playerReference(data) {
        const badge = document.getElementById("player-reference-badge");
        const subtitle = document.getElementById("player-reference-subtitle");
        const container = document.getElementById("player-reference-list");
        if (!badge || !subtitle || !container) return;

        badge.textContent = data?.web_name || "Player";
        subtitle.style.display = "none";
        subtitle.textContent = "";

        const opponents = Array.isArray(data?.opponents) ? data.opponents : [];
        if (!opponents.length) {
            container.innerHTML = '<div class="trend-empty">No matchup reference data</div>';
            return;
        }

        container.innerHTML = opponents.map((item) => `
            <div class="reference-card" style="--team-color:${escapeHtml(item.team_color || "#334155")};--team-color-soft:${escapeHtml(hexToRgba(item.team_color || "#334155", 0.14))};">
                <div class="reference-card-head">
                    <div class="reference-team-wrap">
                        <img class="reference-team-logo" src="${escapeHtml(item.logo_url || "/nba-team-logos/_.png")}" alt="${escapeHtml(item.opponent_team || "-")} logo" decoding="async" width="34" height="34" loading="lazy" onerror="this.onerror=null;this.src='/nba-team-logos/_.png';">
                        <div class="reference-team">${escapeHtml(item.opponent_team || "-")}</div>
                    </div>
                </div>
                <div class="reference-games">
                    ${(Array.isArray(item.games) ? item.games : []).map((game) => game
                        ? `
                            <div class="reference-game-row">
                                <div class="reference-game-copy">
                                    <div class="reference-game-date">${escapeHtml(game.date_label || "-")} ${escapeHtml(game.venue_label || "")}</div>
                                    <div class="reference-game-meta">
                                        ${Number(game.minutes || 0) > 0 ? `${Math.round(Number(game.minutes || 0))}分钟 ` : ""}
                                        ${Math.round(Number(game.points_scored || 0))}分
                                        ${Math.round(Number(game.rebounds || 0))}板
                                        ${Math.round(Number(game.assists || 0))}助
                                        ${Math.round(Number(game.steals || 0))}断
                                        ${Math.round(Number(game.blocks || 0))}帽
                                    </div>
                                </div>
                                <div class="reference-score-chip">${Math.round(Number(game.fantasy_points || 0))}分</div>
                            </div>
                        `
                        : `
                            <div class="reference-game-row reference-placeholder">
                                <div class="reference-game-copy">
                                    <div class="reference-game-date">--</div>
                                    <div class="reference-game-meta">--</div>
                                </div>
                                <div class="reference-score-chip">--</div>
                            </div>
                        `).join("")}
                    <div class="reference-average-row">
                        ${item.averages
                            ? `
                                <div class="reference-average-copy">
                                    <div class="reference-average-label">场均</div>
                                    <div class="reference-average-meta">
                                        ${Number(item.averages.minutes || 0) > 0 ? `${Number(item.averages.minutes || 0).toFixed(1)}分钟 ` : ""}
                                        ${Number(item.averages.points_scored || 0).toFixed(1)}分
                                        ${Number(item.averages.rebounds || 0).toFixed(1)}板
                                        ${Number(item.averages.assists || 0).toFixed(1)}助
                                        ${Number(item.averages.steals || 0).toFixed(1)}断
                                        ${Number(item.averages.blocks || 0).toFixed(1)}帽
                                    </div>
                                </div>
                                <div class="reference-score-chip average-chip">${Number(item.averages.fantasy_points || 0).toFixed(1)}分</div>
                            `
                            : `
                                <div class="reference-average-copy">
                                    <div class="reference-average-label">场均</div>
                                    <div class="reference-average-meta">暂无数据</div>
                                </div>
                                <div class="reference-score-chip average-chip">--</div>
                            `}
                    </div>
                </div>
            </div>
        `).join("");
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
                            <span class="game-team-wrap">
                                <img class="game-team-logo" src="${escapeHtml(getTeamLogoUrl(game.away_team, game.away_logo_url))}" alt="${escapeHtml(game.away_team)} logo" decoding="async" width="24" height="24" loading="lazy" onerror="this.onerror=null;this.src='/nba-team-logos/_.png';">
                                <span class="game-team">${escapeHtml(game.away_team)}</span>
                            </span>
                            <span class="game-score ${awayClass}">${game.away_score}</span>
                        </div>
                        <div class="game-row">
                            <span class="game-team-wrap">
                                <img class="game-team-logo" src="${escapeHtml(getTeamLogoUrl(game.home_team, game.home_logo_url))}" alt="${escapeHtml(game.home_team)} logo" decoding="async" width="24" height="24" loading="lazy" onerror="this.onerror=null;this.src='/nba-team-logos/_.png';">
                                <span class="game-team">${escapeHtml(game.home_team)}</span>
                            </span>
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

        const highestWeekTotal = (matches || []).reduce((max, match) => {
            return Math.max(max, Number(match?.total1 || 0), Number(match?.total2 || 0));
        }, 0);

        container.innerHTML = (matches || []).map((match) => {
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
            const leftHasCrown = leftScore === highestWeekTotal && highestWeekTotal > 0;
            const rightHasCrown = rightScore === highestWeekTotal && highestWeekTotal > 0;
            const leftWinProb = Number(match.win_prob1 ?? 50);
            const rightWinProb = Number(match.win_prob2 ?? 50);
            const leftMood = getWinMoodEmoji(leftWinProb);
            const rightMood = getWinMoodEmoji(rightWinProb);
            const leftChipStatus = match.chip_status1 || {};
            const rightChipStatus = match.chip_status2 || {};

            return `
                <div class="match-block">
                    <div class="match-card">
                        <div class="team-side ${leftClass} ${leftMuted} js-transfer-toggle" data-panel-id="${leftPanelId}" data-uid="${match.uid1}" data-team="${escapeHtml(match.t1)}" data-side="left">
                            <div class="team-head">
                                <div class="manager-logo-wrap">
                                    ${leftHasCrown ? '<span class="manager-crown" aria-hidden="true">👑</span>' : ''}
                                    <img class="manager-logo" src="${escapeHtml(getManagerLogoUrl(match.t1))}" alt="${escapeHtml(match.t1)} logo" decoding="async" width="40" height="40" loading="lazy" onerror="this.onerror=null;this.src='/LOGO.png';">
                                </div>
                                <div class="team-name">${escapeHtml(match.t1)}</div>
                            </div>
                            <div class="score-main ${leftClass}">${leftScore}</div>
                            <div class="score-sub">Today ${match.today1}</div>
                            <div class="score-prob">Win ${leftWinProb}% <span class="score-mood">${leftMood}</span></div>
                            ${renderChipStatusCards(leftChipStatus)}
                        </div>
                        <div class="vs-divider js-open-lineup" data-uid1="${match.uid1}" data-name1="${escapeHtml(match.t1)}" data-uid2="${match.uid2}" data-name2="${escapeHtml(match.t2)}">
                            <div class="vs-text">VS</div>
                            <div class="match-diff">Diff: ${Math.abs(Number(match.diff || 0))}</div>
                        </div>
                        <div class="team-side ${rightClass} ${rightMuted} js-transfer-toggle" data-panel-id="${rightPanelId}" data-uid="${match.uid2}" data-team="${escapeHtml(match.t2)}" data-side="right">
                            <div class="team-head">
                                <div class="manager-logo-wrap">
                                    ${rightHasCrown ? '<span class="manager-crown" aria-hidden="true">👑</span>' : ''}
                                    <img class="manager-logo" src="${escapeHtml(getManagerLogoUrl(match.t2))}" alt="${escapeHtml(match.t2)} logo" decoding="async" width="40" height="40" loading="lazy" onerror="this.onerror=null;this.src='/LOGO.png';">
                                </div>
                                <div class="team-name">${escapeHtml(match.t2)}</div>
                            </div>
                            <div class="score-main ${rightClass}">${rightScore}</div>
                            <div class="score-sub">Today ${match.today2}</div>
                            <div class="score-prob">Win ${rightWinProb}% <span class="score-mood">${rightMood}</span></div>
                            ${renderChipStatusCards(rightChipStatus)}
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

        const createTable = (players, teamName, logoUrl) => `
            <div class="team-section">
                <h3 class="team-section-title">
                    <img class="team-section-logo" src="${escapeHtml(getTeamLogoUrl(teamName, logoUrl))}" alt="${escapeHtml(teamName)} logo" decoding="async" width="28" height="28" loading="lazy" onerror="this.onerror=null;this.src='/nba-team-logos/_.png';">
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
                ${createTable(data.away_players, data.away_team, data.away_logo_url)}
                ${createTable(data.home_players, data.home_team, data.home_logo_url)}
            </div>
        `;
    },

    lineup(data, name, isDual = false, dualData = null, dualName = null) {
        const body = document.getElementById("lineup-body");
        const title = document.getElementById("lineup-title");
        const modalCard = document.querySelector("#lineup-modal .modal");
        if (!body) return;
        if (modalCard) modalCard.classList.toggle("lineup-wide", Boolean(isDual));
        if (title) title.textContent = isDual ? `${name} VS ${dualName}` : `${name} Lineup`;

        const createPlayerCard = (player) => {
            const isCaptain = player.is_captain && Number(player.multiplier || 1) > 1;
            const badge = isCaptain ? '<span class="captain-badge">C</span>' : "";
            const injuryBadge = player.injury ? `<span class="injury-badge" title="${escapeHtml(player.injury)}">INJ ${escapeHtml(player.injury)}</span>` : "";
            const effectiveClass = player.is_effective ? "effective" : "ineffective";
            const posClass = player.position_name === "BC" ? "pos-BC" : "pos-FC";
            const eo = formatEo(player);
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
                            <span>Value ${value.toFixed(1)}</span>
                            <span>EO ${escapeHtml(eo)}</span>
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
                        </div>
                    ` : `
                        <div class="formation-info">Today: ${lineupData.total_live} | Week: ${lineupData.event_total || 0}</div>
                        ${wildcardLine}
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

        const createFutureCompareSection = (lineupData, teamName) => {
            const schedule = lineupData?.future_schedule || {};
            const days = Array.isArray(schedule?.days) ? schedule.days : [];
            const summary = Array.isArray(schedule?.summary) ? schedule.summary : [];
            const groups = Array.isArray(schedule?.groups) ? schedule.groups : [];

            if (!days.length || !groups.length) {
                return `
                    <div class="future-schedule-panel">
                        <div class="future-team-header">
                            <div class="future-team-name">${escapeHtml(teamName)}</div>
                            <div class="future-team-sub">当前阵容未来 7 天赛程</div>
                        </div>
                        <div class="trend-empty">No future schedule data</div>
                    </div>
                `;
            }

            const columnStyle = `style="grid-template-columns:minmax(116px, 1.06fr) repeat(${days.length}, minmax(46px, 1fr));"`;
            const tableMinWidth = Math.max(438, 128 + days.length * 50);
            return `
                <div class="future-schedule-panel">
                    <div class="future-team-header">
                        <div class="future-team-name">${escapeHtml(teamName)}</div>
                        <div class="future-team-sub">当前阵容未来 7 天赛程 · 左右滑动查看</div>
                    </div>
                    <div class="future-schedule-scroll">
                        <div class="future-schedule-matrix" style="min-width:${tableMinWidth}px;">
                            <div class="future-table-head" ${columnStyle}>
                                <div class="future-head-player">PLAYER</div>
                                ${days.map((day) => `<div class="future-head-day">${escapeHtml(day.day_label || "DAY?")}</div>`).join("")}
                            </div>
                            <div class="future-summary-row" ${columnStyle}>
                                <div class="future-summary-label">人数</div>
                                ${summary.map((day) => `
                                    <div class="future-summary-cell">
                                        <div class="future-summary-top">${Number(day.raw_active_count || 0)}</div>
                                        <div class="future-summary-bottom">有效 ${Number(day.effective_count || 0)}</div>
                                    </div>
                                `).join("")}
                            </div>
                            ${groups.map((group) => `
                                <div class="future-group">
                                    <div class="future-group-title ${group.position === "FC" ? "fc" : "bc"}">${escapeHtml(group.label || group.position || "")}</div>
                                    <div class="future-group-rows">
                                        ${group.players.map((player) => `
                                            <div class="future-player-row" ${columnStyle}>
                                                <div class="future-player-cell ${player.is_effective ? "effective" : ""}">
                                                    <div class="future-player-name">${escapeHtml(player.name)}</div>
                                                    <div class="future-player-meta">${escapeHtml(player.team_short || "")} ${escapeHtml(player.position_name || "")}</div>
                                                </div>
                                                ${player.cells.map((cell) => cell?.has_game
                                                    ? `
                                                        <div class="future-match-cell">
                                                            <img class="future-match-logo" src="${escapeHtml(cell.opponent_logo_url || "/nba-team-logos/_.png")}" alt="${escapeHtml(cell.opponent_name || "-")} logo" decoding="async" width="28" height="28" loading="lazy" onerror="this.onerror=null;this.src='/nba-team-logos/_.png';">
                                                            <div class="future-match-venue">${escapeHtml(cell.venue_label || "")}</div>
                                                        </div>
                                                    `
                                                    : `<div class="future-match-cell empty">-</div>`
                                                ).join("")}
                                            </div>
                                        `).join("")}
                                    </div>
                                </div>
                            `).join("")}
                        </div>
                    </div>
                </div>
            `;
        };

        if (isDual && dualData) {
            body.innerHTML = `
                <div class="lineup-view-switch">
                    <button class="lineup-mode-btn active" data-lineup-mode="today" type="button" onclick="setLineupMode('today')">今日阵容</button>
                    <button class="lineup-mode-btn" data-lineup-mode="future" type="button" onclick="setLineupMode('future')">未来 7 天</button>
                </div>
                <div class="lineup-mode-panel active" data-lineup-panel="today">
                    <div class="dual-lineup-container">
                        ${createLineupSection(data, name)}
                        ${createLineupSection(dualData, dualName)}
                    </div>
                </div>
                <div class="lineup-mode-panel" data-lineup-panel="future">
                    <div class="future-compare-scroll">
                        <div class="future-compare-board">
                            ${createFutureCompareSection(data, name)}
                            ${createFutureCompareSection(dualData, dualName)}
                        </div>
                    </div>
                </div>
            `;
            return;
        }

        body.innerHTML = createLineupSection(data, name);
    },

    teamAttackDefense(data, csvPaceTeams = []) {
        const badge = document.getElementById("other-badge");
        const subtitle = document.getElementById("other-subtitle");
        const container = document.getElementById("other-chart-wrap");
        if (!badge || !subtitle || !container) return;

        const teams = Array.isArray(data?.teams) ? data.teams : [];
        const paceTeams = Array.isArray(csvPaceTeams) ? csvPaceTeams : [];
        const periodLabel = data?.period_label || "近30天";
        badge.textContent = periodLabel;
        subtitle.textContent = `${periodLabel}攻防图 · ${data?.start_date || "--"} 至 ${data?.end_date || "--"} | 节奏图：赛季 Pace / |NRtg|`;

        if (!teams.length) {
            container.innerHTML = '<div class="trend-empty">No attack/defence data</div>';
            return;
        }

        const pointsFor = teams.map((team) => Number(team.points_for || 0));
        const pointsAgainst = teams.map((team) => Number(team.points_against || 0));
        const minFor = Math.min(...pointsFor);
        const maxFor = Math.max(...pointsFor);
        const minAgainst = Math.min(...pointsAgainst);
        const maxAgainst = Math.max(...pointsAgainst);
        const viewportWidth = Math.max(320, window.innerWidth || 1280);
        const containerWidth = Math.max(280, Math.floor(container.getBoundingClientRect().width || viewportWidth));
        const compact = viewportWidth <= 768;
        const gridGap = compact ? 16 : 20;
        const maxGridWidth = compact ? containerWidth : Math.min(containerWidth, 1120);
        const cardWidth = compact ? maxGridWidth : Math.max(420, Math.floor((maxGridWidth - gridGap) / 2));
        const plotWidth = compact ? Math.max(280, cardWidth - 8) : Math.min(cardWidth, 520);
        const plotHeight = compact ? Math.round(plotWidth * 0.92) : Math.round(plotWidth * 0.78);
        const padLeft = compact ? 42 : 52;
        const padRight = compact ? 18 : 22;
        const padTop = compact ? 24 : 26;
        const padBottom = compact ? 44 : 48;
        const innerWidth = plotWidth - padLeft - padRight;
        const innerHeight = plotHeight - padTop - padBottom;
        const pointHalf = compact ? 11 : 14;
        const attackAxisLabel = compact ? "Attack PPG" : "Attack: points per game";
        const defenceAxisLabel = compact ? "Defense: opponent points per game" : "Defense: opponent points per game";
        const xPos = (value) => padLeft + (((value - minFor) / Math.max(1, maxFor - minFor))) * innerWidth;
        const yPos = (value) => padTop + (((value - minAgainst) / Math.max(1, maxAgainst - minAgainst))) * innerHeight;
        const midpointFor = ((minFor + maxFor) / 2).toFixed(1);
        const midpointAgainst = ((minAgainst + maxAgainst) / 2).toFixed(1);
        const paceValues = paceTeams.map((team) => Number(team.pace || 0)).filter((value) => Number.isFinite(value));
        const diffValues = paceTeams.map((team) => Number(team.abs_n_rtg || 0)).filter((value) => Number.isFinite(value));
        const minPace = paceValues.length ? Math.min(...paceValues) : 0;
        const maxPace = paceValues.length ? Math.max(...paceValues) : 1;
        const minDiff = diffValues.length ? Math.min(...diffValues) : 0;
        const maxDiff = diffValues.length ? Math.max(...diffValues) : 1;
        const paceAxisLabel = compact ? "Pace" : "Pace per game";
        const marginAxisLabel = compact ? "|NRtg|" : "Absolute net rating difference";
        const paceXPos = (value) => padLeft + (((value - minPace) / Math.max(1, maxPace - minPace))) * innerWidth;
        const paceYPos = (value) => padTop + ((((maxDiff - value)) / Math.max(1, maxDiff - minDiff))) * innerHeight;
        const midpointPace = ((minPace + maxPace) / 2).toFixed(1);
        const midpointDiff = ((minDiff + maxDiff) / 2).toFixed(1);

        container.innerHTML = `
            <div class="other-charts-grid">
                <div class="attack-defense-card">
                    <div class="attack-defense-title">近30天球队攻防对比图</div>
                    <div class="attack-defense-plot" style="--plot-w:${plotWidth}px;--plot-h:${plotHeight}px;">
                        <div class="attack-defense-grid v" style="left:${padLeft + innerWidth * 0.25}px"></div>
                        <div class="attack-defense-grid v" style="left:${padLeft + innerWidth * 0.5}px"></div>
                        <div class="attack-defense-grid v" style="left:${padLeft + innerWidth * 0.75}px"></div>
                        <div class="attack-defense-grid h" style="top:${padTop + innerHeight * 0.25}px"></div>
                        <div class="attack-defense-grid h" style="top:${padTop + innerHeight * 0.5}px"></div>
                        <div class="attack-defense-grid h" style="top:${padTop + innerHeight * 0.75}px"></div>
                        <div class="attack-defense-axis attack-defense-axis-left">${defenceAxisLabel}</div>
                        <div class="attack-defense-axis attack-defense-axis-bottom">${attackAxisLabel}</div>
                        ${compact ? "" : '<div class="attack-defense-note good">Great attack,<br>great defence</div>'}
                        ${compact ? "" : '<div class="attack-defense-note bad">Poor attack,<br>poor defence</div>'}
                        <div class="attack-defense-scale" style="left:${padLeft - 38}px;top:${padTop - 6}px">${minAgainst.toFixed(1)}</div>
                        <div class="attack-defense-scale" style="left:${padLeft - 38}px;top:${padTop + innerHeight / 2 - 6}px">${midpointAgainst}</div>
                        <div class="attack-defense-scale" style="left:${padLeft - 38}px;top:${padTop + innerHeight - 6}px">${maxAgainst.toFixed(1)}</div>
                        <div class="attack-defense-scale" style="left:${padLeft - 6}px;bottom:${padBottom - 28}px">${minFor.toFixed(1)}</div>
                        <div class="attack-defense-scale" style="left:${padLeft + innerWidth / 2 - 10}px;bottom:${padBottom - 28}px">${midpointFor}</div>
                        <div class="attack-defense-scale" style="right:${padRight - 4}px;bottom:${padBottom - 28}px">${maxFor.toFixed(1)}</div>
                        ${teams.map((team) => `
                            <div class="attack-defense-point" style="left:${xPos(Number(team.points_for || 0)) - pointHalf}px;top:${yPos(Number(team.points_against || 0)) - pointHalf}px" title="${escapeHtml(team.team_name)} | PPG ${Number(team.points_for || 0).toFixed(1)} | Opp PPG ${Number(team.points_against || 0).toFixed(1)}">
                                <img src="${escapeHtml(team.logo_url || "/nba-team-logos/_.png")}" alt="${escapeHtml(team.team_name)} logo" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='/nba-team-logos/_.png';">
                            </div>
                        `).join("")}
                    </div>
                </div>
                <div class="attack-defense-card">
                    <div class="attack-defense-title">球队节奏与分差对比图</div>
                    <div class="attack-defense-plot" style="--plot-w:${plotWidth}px;--plot-h:${plotHeight}px;">
                        <div class="attack-defense-grid v" style="left:${padLeft + innerWidth * 0.25}px"></div>
                        <div class="attack-defense-grid v" style="left:${padLeft + innerWidth * 0.5}px"></div>
                        <div class="attack-defense-grid v" style="left:${padLeft + innerWidth * 0.75}px"></div>
                        <div class="attack-defense-grid h" style="top:${padTop + innerHeight * 0.25}px"></div>
                        <div class="attack-defense-grid h" style="top:${padTop + innerHeight * 0.5}px"></div>
                        <div class="attack-defense-grid h" style="top:${padTop + innerHeight * 0.75}px"></div>
                        <div class="attack-defense-axis attack-defense-axis-left">${marginAxisLabel}</div>
                        <div class="attack-defense-axis attack-defense-axis-bottom">${paceAxisLabel}</div>
                        ${compact ? "" : '<div class="attack-defense-note good">Fast pace,<br>close games</div>'}
                        ${compact ? "" : '<div class="attack-defense-note bad">Slow pace,<br>blowout risk</div>'}
                        <div class="attack-defense-scale" style="left:${padLeft - 38}px;top:${padTop - 6}px">${maxDiff.toFixed(1)}</div>
                        <div class="attack-defense-scale" style="left:${padLeft - 38}px;top:${padTop + innerHeight / 2 - 6}px">${midpointDiff}</div>
                        <div class="attack-defense-scale" style="left:${padLeft - 38}px;top:${padTop + innerHeight - 6}px">${minDiff.toFixed(1)}</div>
                        <div class="attack-defense-scale" style="left:${padLeft - 6}px;bottom:${padBottom - 28}px">${minPace.toFixed(1)}</div>
                        <div class="attack-defense-scale" style="left:${padLeft + innerWidth / 2 - 10}px;bottom:${padBottom - 28}px">${midpointPace}</div>
                        <div class="attack-defense-scale" style="right:${padRight - 4}px;bottom:${padBottom - 28}px">${maxPace.toFixed(1)}</div>
                        ${paceTeams.map((team) => {
                            const paceValue = Number(team.pace || 0);
                            const diffValue = Number(team.abs_n_rtg || 0);
                            const tooltip = `${escapeHtml(team.team_name)} | Pace ${paceValue.toFixed(1)} | |NRtg| ${diffValue.toFixed(1)}`;
                            return `
                            <div class="attack-defense-point" style="left:${paceXPos(paceValue) - pointHalf}px;top:${paceYPos(diffValue) - pointHalf}px" title="${tooltip}">
                                <img src="${escapeHtml(team.logo_url || "/nba-team-logos/_.png")}" alt="${escapeHtml(team.team_name)} logo" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='/nba-team-logos/_.png';">
                            </div>
                        `;
                        }).join("")}
                    </div>
                </div>
            </div>
        `;
    },
};

function setLineupMode(mode = "today") {
    document.querySelectorAll(".lineup-mode-btn").forEach((button) => {
        button.classList.toggle("active", button.dataset.lineupMode === mode);
    });
    document.querySelectorAll(".lineup-mode-panel").forEach((panel) => {
        panel.classList.toggle("active", panel.dataset.lineupPanel === mode);
    });
}

const App = {
    lineupCache: new Map(),
    refreshTimer: null,
    injuriesLoaded: false,
    playerReferenceLoaded: false,
    otherLoaded: false,
    playerOptionsLoaded: false,
    playerOptions: [],
    referencePositionFilter: "ALL",
    referenceSearchQuery: "",
    transferDirection: "in",
    latestTransferTrends: null,
    latestPicksByUid: {},

    async getLineupCached(uid) {
        const key = String(uid);
        if (!this.lineupCache.has(key)) {
            this.lineupCache.set(key, API.getLineup(uid).catch((error) => {
                this.lineupCache.delete(key);
                throw error;
            }));
        }
        return this.lineupCache.get(key);
    },

    clearRefreshTimer() {
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
            this.refreshTimer = null;
        }
    },

    scheduleAutoRefresh(state) {
        this.clearRefreshTimer();
        const delay = getNextRefreshDelay(state?.fixtures);
        if (!delay) return;

        this.refreshTimer = setTimeout(() => {
            this.loadAll();
        }, delay);
    },

    async loadAll() {
        try {
            this.lineupCache.clear();
            const state = await API.getState();
            this.latestTransferTrends = state?.transfer_trends || {};
            this.latestPicksByUid = state?.picks_by_uid || {};
            Render.eventInfo(state?.current_event_name || "Loading...");
            Render.gameCount(state?.fixtures?.count || 0);
            Render.gamesList(state?.fixtures?.games || []);
            Render.matchCount(Array.isArray(state?.h2h) ? state.h2h.length : 0);
            Render.h2hList(state?.h2h || []);
            Render.transferTrends(this.latestTransferTrends, this.latestPicksByUid);
            Render.chipsUsed(state?.chips_used_summary || []);
            Render.goodCaptain(state?.picks_by_uid || {});
            Render.specialGuy(state?.picks_by_uid || {});
            Render.rankings(state || {});
            Render.updateTime();
            this.scheduleAutoRefresh(state);
        } catch (error) {
            console.error("LoadAll error:", error);
            this.clearRefreshTimer();
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
        this.clearRefreshTimer();
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

    showPage(page) {
        document.querySelectorAll(".nav-tab").forEach((button) => {
            button.classList.toggle("active", button.dataset.page === page);
        });
        document.querySelectorAll(".page-view").forEach((view) => {
            view.classList.toggle("active", view.id === `page-${page}`);
        });
    },

    async loadInjuries(force = false) {
        if (this.injuriesLoaded && !force) return;
        const container = document.getElementById("injury-list");
        if (container) {
            container.innerHTML = '<div class="loading"><div class="spinner"></div>Loading...</div>';
        }
        try {
            const data = await API.getInjuries();
            Render.injuries(data);
            this.injuriesLoaded = true;
        } catch (error) {
            console.error("Injuries load error:", error);
            if (container) {
                container.innerHTML = '<div class="trend-empty">Load failed</div>';
            }
        }
    },

    async loadPlayerReference(force = false) {
        if (this.playerReferenceLoaded && !force) return;
        const container = document.getElementById("player-reference-list");
        if (container) {
            container.innerHTML = '<div class="loading"><div class="spinner"></div>Loading...</div>';
        }
        try {
            const data = await API.getPlayerReference("nikola-jokic");
            Render.playerReference(data);
            this.playerReferenceLoaded = true;
        } catch (error) {
            console.error("Player reference load error:", error);
            if (container) {
                container.innerHTML = '<div class="trend-empty">Load failed</div>';
            }
        }
    },

    async loadOther(force = false) {
        if (this.otherLoaded && !force) return;
        const container = document.getElementById("other-chart-wrap");
        if (container) {
            container.innerHTML = '<div class="loading"><div class="spinner"></div>Loading...</div>';
        }
        try {
            const [data, paceCsv] = await Promise.all([
                API.getTeamAttackDefense(),
                API.getPaceDiffCsv(),
            ]);
            Render.teamAttackDefense(data, parseSeasonPaceDiffCsv(paceCsv));
            this.otherLoaded = true;
        } catch (error) {
            console.error("Other page load error:", error);
            if (container) {
                container.innerHTML = '<div class="trend-empty">Load failed</div>';
            }
        }
    },

    populateReferencePlayers(teamId, preferredPlayer = "") {
        const playerSelect = document.getElementById("reference-player-select");
        if (!playerSelect) return;
        const team = this.playerOptions.find((item) => String(item.id) === String(teamId));
        const allPlayers = Array.isArray(team?.players) ? team.players : [];
        const players = allPlayers.filter((player) => (
            this.referencePositionFilter === "ALL" || String(player?.position_name || "") === this.referencePositionFilter
        ));
        playerSelect.innerHTML = players.map((player) => `
            <option value="${escapeHtml(player.id)}">${escapeHtml(player.name || player.web_name || "-")} (${(Number(player.now_cost || 0) / 10).toFixed(1)})</option>
        `).join("");
        if (preferredPlayer && players.some((player) => String(player.id) === String(preferredPlayer))) {
            playerSelect.value = preferredPlayer;
        } else if (players[0]) {
            playerSelect.value = String(players[0].id);
        }
        this.renderReferenceSearchResults();
    },

    getReferenceSearchMatches(query) {
        const keyword = String(query || "").trim().toLowerCase();
        if (!keyword) return [];
        const matches = [];
        for (const team of this.playerOptions || []) {
            for (const player of team?.players || []) {
                const position = String(player?.position_name || "");
                if (this.referencePositionFilter !== "ALL" && position !== this.referencePositionFilter) continue;
                const name = String(player?.name || player?.web_name || "").trim();
                const searchText = `${name} ${player?.web_name || ""} ${team?.name || ""}`.toLowerCase();
                if (!searchText.includes(keyword)) continue;
                matches.push({
                    team_id: team.id,
                    team_name: team.name,
                    player_id: player.id,
                    name,
                    position_name: position,
                    now_cost: Number(player?.now_cost || 0),
                });
            }
        }
        return matches
            .sort((a, b) =>
                a.name.localeCompare(b.name) ||
                b.now_cost - a.now_cost
            )
            .slice(0, 8);
    },

    renderReferenceSearchResults() {
        const input = document.getElementById("reference-player-search");
        const results = document.getElementById("reference-search-results");
        if (!input || !results) return;
        const matches = this.getReferenceSearchMatches(input.value);
        if (!matches.length) {
            results.innerHTML = "";
            results.classList.remove("active");
            return;
        }
        results.innerHTML = matches.map((item) => `
            <button class="reference-search-item" type="button"
                data-team-id="${escapeHtml(item.team_id)}"
                data-player-id="${escapeHtml(item.player_id)}"
                data-player-name="${escapeHtml(item.name)}">
                <span class="reference-search-name">${escapeHtml(item.name)}</span>
                <span class="reference-search-meta">${escapeHtml(item.team_name)} · ${escapeHtml(item.position_name)} · $${(Number(item.now_cost || 0) / 10).toFixed(1)}</span>
            </button>
        `).join("");
        results.classList.add("active");
    },

    applyReferenceSearchSelection(teamId, playerId, playerName = "") {
        const teamSelect = document.getElementById("reference-team-select");
        const playerSelect = document.getElementById("reference-player-select");
        const input = document.getElementById("reference-player-search");
        const results = document.getElementById("reference-search-results");
        if (teamSelect) teamSelect.value = String(teamId);
        this.populateReferencePlayers(teamId, playerId);
        if (playerSelect) playerSelect.value = String(playerId);
        if (input) input.value = playerName;
        if (results) {
            results.innerHTML = "";
            results.classList.remove("active");
        }
    },

    renderReferencePlayerButtons(players) {
        return players;
    },

    async loadPlayerOptions(force = false) {
        if (this.playerOptionsLoaded && !force) return;
        const teamSelect = document.getElementById("reference-team-select");
        if (!teamSelect) return;
        try {
            const data = await API.getPlayerOptions();
            this.playerOptions = Array.isArray(data?.teams) ? data.teams : [];
            teamSelect.innerHTML = this.playerOptions.map((team) => `
                <option value="${escapeHtml(team.id)}">${escapeHtml(team.name || "-")}</option>
            `).join("");
            const defaultTeam = this.playerOptions.find((team) => /denver nuggets/i.test(String(team.name || ""))) || this.playerOptions[0];
            if (defaultTeam) {
                teamSelect.value = String(defaultTeam.id);
                const defaultPlayer = (defaultTeam.players || []).find((player) => /nikola jokic/i.test(String(player.name || "")));
                this.populateReferencePlayers(defaultTeam.id, defaultPlayer?.id || "");
            }
            this.playerOptionsLoaded = true;
            this.renderReferenceSearchResults();
        } catch (error) {
            console.error("Player options load error:", error);
        }
    },

    async searchPlayerReference() {
        const playerSelect = document.getElementById("reference-player-select");
        const container = document.getElementById("player-reference-list");
        if (!playerSelect || !playerSelect.value) return;
        if (container) {
            container.innerHTML = '<div class="loading"><div class="spinner"></div>Loading...</div>';
        }
        try {
            const data = await API.getPlayerReference(playerSelect.value);
            Render.playerReference(data);
            this.playerReferenceLoaded = true;
        } catch (error) {
            console.error("Player reference search error:", error);
            if (container) {
                container.innerHTML = '<div class="trend-empty">Load failed</div>';
            }
        }
    },

    bindEvents() {
        document.addEventListener("click", (event) => {
            const navButton = event.target.closest(".nav-tab");
            if (navButton) {
                const page = navButton.dataset.page || "home";
                this.showPage(page);
                if (page === "injuries") {
                    this.loadInjuries();
                } else if (page === "reference") {
                    this.loadPlayerOptions();
                    this.loadPlayerReference();
                } else if (page === "other") {
                    this.loadOther();
                }
                return;
            }

            if (event.target.closest("#reference-search-btn")) {
                this.searchPlayerReference();
                return;
            }

            const searchItem = event.target.closest(".reference-search-item");
            if (searchItem) {
                this.applyReferenceSearchSelection(
                    searchItem.dataset.teamId,
                    searchItem.dataset.playerId,
                    searchItem.dataset.playerName || ""
                );
                return;
            }

            const transferDirectionButton = event.target.closest(".trend-switch-btn");
            if (transferDirectionButton) {
                this.transferDirection = String(transferDirectionButton.dataset.transferDirection || "in");
                document.querySelectorAll(".trend-switch-btn").forEach((button) => {
                    button.classList.toggle("active", button.dataset.transferDirection === this.transferDirection);
                });
                Render.transferTrends(this.latestTransferTrends || {}, this.latestPicksByUid || {});
                return;
            }

            const positionButton = event.target.closest(".reference-pos-btn");
            if (positionButton) {
                this.referencePositionFilter = String(positionButton.dataset.referencePosition || "ALL");
                document.querySelectorAll(".reference-pos-btn").forEach((button) => {
                    button.classList.toggle("active", button.dataset.referencePosition === this.referencePositionFilter);
                });
                const teamSelect = document.getElementById("reference-team-select");
                this.populateReferencePlayers(teamSelect?.value || "");
                return;
            }

            const lineupModeButton = event.target.closest(".lineup-mode-btn");
            if (lineupModeButton) {
                const mode = lineupModeButton.dataset.lineupMode || "today";
                setLineupMode(mode);
                return;
            }

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

        document.addEventListener("change", (event) => {
            if (event.target?.id === "reference-team-select") {
                this.populateReferencePlayers(event.target.value);
            }
        });

        document.addEventListener("input", (event) => {
            if (event.target?.id === "reference-player-search") {
                this.renderReferenceSearchResults();
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
            this.loadAll();
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
window.setLineupMode = setLineupMode;

App.init();

