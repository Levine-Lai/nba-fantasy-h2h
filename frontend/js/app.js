/**
 * NBA Fantasy H2H Dashboard 前端逻辑
 * 
 * AI修改指引：
 * - 修改数据刷新间隔: 修改setInterval时间
 * - 添加新页面功能: 添加新函数
 * - 修改UI交互: 修改对应事件处理函数
 */

const POSITION_NAME = {1: 'BC', 2: 'FC'};
let currentEventName = "GW22";

// ===== 初始化 =====
document.addEventListener('DOMContentLoaded', () => {
    loadAll();
    // 自动刷新
    setInterval(loadAll, 60000);
});

// ===== 数据加载 =====

async function loadAll() {
    await Promise.all([loadGames(), loadH2H()]);
    updateTime();
}

function updateTime() {
    const now = new Date();
    document.getElementById('update-time').textContent = 
        now.toLocaleTimeString('zh-CN', {hour:'2-digit', minute:'2-digit', second:'2-digit'});
}

async function manualRefresh() {
    const btn = document.getElementById('refresh-btn');
    btn.disabled = true;
    btn.textContent = '刷新中...';
    
    try {
        const res = await fetch('/api/refresh', {method: 'POST'});
        const data = await res.json();
        if(data.success) {
            if(data.current_event_name) {
                document.getElementById('event-info').textContent = 
                    `${data.current_event_name} • League #1653`;
            }
            await loadAll();
        }
    } catch(e) {
        console.error(e);
    } finally {
        btn.disabled = false;
        btn.textContent = '刷新数据';
    }
}

// ===== 赛程加载 =====

async function loadGames() {
    try {
        console.log('[Games] Fetching fixtures...');
        const res = await fetch('/api/fixtures');
        const data = await res.json();
        console.log('[Games] Got data:', data);
        document.getElementById('game-count').textContent = data.count + '场';
        
        if(data.event_name) {
            document.getElementById('event-info').textContent = 
                `${data.event_name} • League #1653`;
            currentEventName = data.event_name;
        }
        
        if(data.count === 0) {
            document.getElementById('game-list').innerHTML = 
                '<div style="text-align:center;padding:40px;color:#999;">暂无比赛</div>';
            return;
        }
        
        if (!data.games || data.games.length === 0) {
            document.getElementById('game-list').innerHTML = 
                '<div style="text-align:center;padding:40px;color:#999;">暂无比赛数据</div>';
            return;
        }
        
        const html = data.games.map(g => {
            const isLive = g.started && !g.finished;
            const status = isLive ? '进行中' : (g.finished ? '已结束' : '未开始');
            const homeClass = g.home_score > g.away_score ? 'winning' : (g.home_score < g.away_score ? 'losing' : '');
            const awayClass = g.away_score > g.home_score ? 'winning' : (g.away_score < g.home_score ? 'losing' : '');
            
            return `
                <div class="game-item" onclick="showGameDetail(${g.id})">
                    <div class="game-teams">
                        <div class="game-row">
                            <span class="game-team">${g.home_team}</span>
                            <span class="game-score ${homeClass}">${g.home_score}</span>
                        </div>
                        <div class="game-row">
                            <span class="game-team">${g.away_team}</span>
                            <span class="game-score ${awayClass}">${g.away_score}</span>
                        </div>
                    </div>
                    <div class="game-meta">
                        <div class="game-time">${g.kickoff}</div>
                        <div class="game-status">${status}</div>
                    </div>
                </div>
            `;
        }).join('');
        
        document.getElementById('game-list').innerHTML = html;
    } catch(e) {
        console.error('Games error:', e);
    }
}

// ===== H2H 加载 =====

async function loadH2H() {
    try {
        const res = await fetch('/api/h2h');
        const data = await res.json();
        document.getElementById('match-count').textContent = data.length + '场';
        
        const html = data.map(m => {
            const isT1Win = m.total1 > m.total2;
            const isDraw = m.total1 === m.total2;
            const leftClass = isDraw ? '' : (isT1Win ? 'winning' : 'losing');
            const rightClass = isDraw ? '' : (isT1Win ? 'losing' : 'winning');
            const s1Class = isDraw ? '' : (isT1Win ? 'winning' : 'losing');
            const s2Class = isDraw ? '' : (isT1Win ? 'losing' : 'winning');
            
            return `
                <div class="match-card" onclick="showLineupDual(${m.uid1}, '${m.t1}', ${m.uid2}, '${m.t2}')">
                    <div class="team-side ${leftClass}">
                        <div class="team-name">${m.t1}</div>
                        <div class="score-main ${s1Class}">${m.total1}</div>
                        <div class="score-sub">今日 ${m.today1}</div>
                    </div>
                    <div class="vs-divider">VS</div>
                    <div class="team-side ${rightClass}">
                        <div class="team-name">${m.t2}</div>
                        <div class="score-main ${s2Class}">${m.total2}</div>
                        <div class="score-sub">今日 ${m.today2}</div>
                    </div>
                </div>
            `;
        }).join('');
        
        document.getElementById('h2h-list').innerHTML = html;
    } catch(e) {
        console.error('H2H error:', e);
    }
}

// ===== 弹窗显示 =====

async function showGameDetail(fixtureId) {
    document.getElementById('game-modal').classList.add('active');
    document.getElementById('game-body').innerHTML = '<div class="loading"><div class="spinner"></div>加载中...</div>';
    
    try {
        const res = await fetch(`/api/fixture/${fixtureId}`);
        const data = await res.json();
        
        if(!data.home_players) {
            document.getElementById('game-body').innerHTML = '<div style="text-align:center;padding:20px;">暂无数据</div>';
            return;
        }
        
        document.getElementById('game-title').textContent = `${data.away_team} @ ${data.home_team}`;
        
        const createTable = (players, teamName) => {
            const rows = players.map(p => `
                <tr>
                    <td class="player-name">${p.name}</td>
                    <td>${p.position_name}</td>
                    <td>${p.points}</td>
                    <td>${p.rebounds}</td>
                    <td>${p.assists}</td>
                    <td>${p.steals}</td>
                    <td>${p.blocks}</td>
                    <td class="fantasy-score">${p.fantasy}</td>
                </tr>
            `).join('');
            
            return `
                <div class="team-section">
                    <h3>${teamName}</h3>
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
                        <tbody>${rows}</tbody>
                    </table>
                </div>
            `;
        };
        
        document.getElementById('game-body').innerHTML = `
            <div class="game-detail-container">
                ${createTable(data.away_players, data.away_team)}
                ${createTable(data.home_players, data.home_team)}
            </div>
        `;
    } catch(e) {
        console.error(e);
        document.getElementById('game-body').innerHTML = '<div style="text-align:center;padding:20px;">加载失败</div>';
    }
}

async function showLineup(uid, name) {
    document.getElementById('lineup-modal').classList.add('active');
    document.getElementById('lineup-title').textContent = name + ' 的阵容';
    document.getElementById('lineup-body').innerHTML = '<div class="loading"><div class="spinner"></div>加载中...</div>';
    
    try {
        const res = await fetch(`/api/picks/${uid}`);
        const data = await res.json();
        
        if(!data.players || data.players.length === 0) {
            document.getElementById('lineup-body').innerHTML = '<div style="text-align:center;padding:20px;">暂无数据</div>';
            return;
        }
        
        const starters = data.players.filter(p => p.lineup_position <= 5);
        const bench = data.players.filter(p => p.lineup_position > 5);
        
        const createPlayerCard = (p) => {
            const isCaptain = p.is_captain && p.multiplier > 1;
            const badge = isCaptain ? '<span class="captain-badge">C</span>' : '';
            const posClass = p.position_name === 'BC' ? 'pos-BC' : 'pos-FC';
            const effectiveClass = p.is_effective ? 'effective' : 'ineffective';
            
            // 新增：伤病标记
            const injuryBadge = p.injury ? `<span class="injury-badge" title="${p.injury}">🔴 ${p.injury}</span>` : '';
            
            return `
                <div class="player-card ${effectiveClass}">
                    <div class="pos-badge ${posClass}">${p.position_name}</div>
                    <div class="player-info">
                        <div class="player-name-row">
                            <div class="player-name">${p.name}</div>
                            ${badge}
                            ${injuryBadge}
                        </div>
                        <div class="player-stats">
                            ${p.stats.points}分 ${p.stats.rebounds}板 ${p.stats.assists}助 
                            ${p.stats.steals}断 ${p.stats.blocks}帽
                        </div>
                    </div>
                    <div class="player-score">
                        <div class="score-final">${p.final_points}</div>
                    </div>
                </div>
            `;
        };
        
        document.getElementById('lineup-body').innerHTML = `
            <div class="formation-info">有效阵容: ${data.formation} | 总得分: ${data.total_live}</div>
            <div class="lineup-container">
                <div class="lineup-section starters">
                    <h4>首发</h4>
                    ${starters.map(createPlayerCard).join('')}
                </div>
                <div class="lineup-section bench">
                    <h4>替补</h4>
                    ${bench.map(createPlayerCard).join('')}
                </div>
            </div>
        `;
    } catch(e) {
        console.error(e);
        document.getElementById('lineup-body').innerHTML = '<div style="text-align:center;padding:20px;">加载失败</div>';
    }
}

async function showLineupDual(uid1, name1, uid2, name2) {
    document.getElementById('lineup-modal').classList.add('active');
    document.getElementById('lineup-title').textContent = name1 + ' VS ' + name2;
    document.getElementById('lineup-body').innerHTML = '<div class="loading"><div class="spinner"></div>加载中...</div>';
    
    try {
        const [res1, res2] = await Promise.all([
            fetch(`/api/picks/${uid1}`),
            fetch(`/api/picks/${uid2}`)
        ]);
        const data1 = await res1.json();
        const data2 = await res2.json();
        
        const createLineupSection = (data, teamName) => {
            if (!data.players || data.players.length === 0) {
                return `<div style="text-align:center;padding:20px;">暂无数据</div>`;
            }
            
            const starters = data.players.filter(p => p.lineup_position <= 5);
            const bench = data.players.filter(p => p.lineup_position > 5);
            
            const createPlayerCard = (p) => {
                const isCaptain = p.is_captain && p.multiplier > 1;
                const badge = isCaptain ? '<span class="captain-badge">C</span>' : '';
                const posClass = p.position_name === 'BC' ? 'pos-BC' : 'pos-FC';
                const effectiveClass = p.is_effective ? 'effective' : 'ineffective';
                
                // 新增：伤病标记
                const injuryBadge = p.injury ? `<span class="injury-badge" title="${p.injury}">🔴 ${p.injury}</span>` : '';
                
                return `
                    <div class="player-card ${effectiveClass}">
                        <div class="pos-badge ${posClass}">${p.position_name}</div>
                        <div class="player-info">
                            <div class="player-name-row">
                                <div class="player-name">${p.name}</div>
                                ${badge}
                                ${injuryBadge}
                            </div>
                            <div class="player-stats">
                                ${p.stats.points}分 ${p.stats.rebounds}板 ${p.stats.assists}助 
                                ${p.stats.steals}断 ${p.stats.blocks}帽
                            </div>
                        </div>
                        <div class="player-score">
                            <div class="score-final">${p.final_points}</div>
                        </div>
                    </div>
                `;
            };
            
            return `
                <div class="dual-lineup-side">
                    <div class="dual-lineup-header">
                        <div class="dual-team-name">${teamName}</div>
                        <div class="dual-team-score">${data.total_live}</div>
                        <div class="dual-team-formation">${data.formation}</div>
                    </div>
                    <div class="lineup-container">
                        <div class="lineup-section starters">
                            <h4>首发</h4>
                            ${starters.map(createPlayerCard).join('')}
                        </div>
                        <div class="lineup-section bench">
                            <h4>替补</h4>
                            ${bench.map(createPlayerCard).join('')}
                        </div>
                    </div>
                </div>
            `;
        };
        
        document.getElementById('lineup-body').innerHTML = `
            <div class="dual-lineup-container">
                ${createLineupSection(data1, name1)}
                ${createLineupSection(data2, name2)}
            </div>
        `;
    } catch(e) {
        console.error(e);
        document.getElementById('lineup-body').innerHTML = '<div style="text-align:center;padding:20px;">加载失败</div>';
    }
}

// ===== 工具函数 =====

function closeModal(e, modalId) {
    if(e && e.target !== e.currentTarget) return;
    document.getElementById(modalId).classList.remove('active');
}

document.addEventListener('keydown', e => {
    if(e.key === 'Escape') {
        document.getElementById('lineup-modal').classList.remove('active');
        document.getElementById('game-modal').classList.remove('active');
    }
});
