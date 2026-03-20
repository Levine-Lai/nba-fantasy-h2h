/**
 * NBA Fantasy H2H Dashboard 前端逻辑
 * 
 * 修改日期: 2026-03-20
 * 修改点:
 * 1. 分离为API、Render、App三个对象，模块化组织
 * 2. 添加全局错误处理，API失败时显示友好提示
 * 3. 在页面顶部添加错误提示div
 */

const POSITION_NAME = {1: 'BC', 2: 'FC'};
let currentEventName = "GW22";

// ===== 错误提示组件 =====
const ErrorBanner = {
    show(message) {
        let banner = document.getElementById('error-banner');
        if (!banner) {
            banner = document.createElement('div');
            banner.id = 'error-banner';
            banner.style.cssText = 'display:none; background:#dc3545; color:white; padding:10px; text-align:center; position:fixed; top:0; left:0; right:0; z-index:10000;';
            document.body.insertBefore(banner, document.body.firstChild);
        }
        banner.textContent = message;
        banner.style.display = 'block';
    },
    
    hide() {
        const banner = document.getElementById('error-banner');
        if (banner) {
            banner.style.display = 'none';
        }
    }
};

// ===== API对象：封装所有fetch调用 =====
const API = {
    async fetch(url, options = {}) {
        try {
            const res = await fetch(url, options);
            
            // 统一处理错误状态码
            if (!res.ok) {
                if (res.status === 401) {
                    throw new Error('未授权访问');
                } else if (res.status === 500) {
                    throw new Error('服务器内部错误');
                } else {
                    throw new Error(`请求失败: ${res.status}`);
                }
            }
            
            ErrorBanner.hide();
            return res;
        } catch (e) {
            console.error(`[API Error] ${url}:`, e);
            ErrorBanner.show('数据加载失败，请刷新重试');
            throw e;
        }
    },
    
    async getGames() {
        const res = await this.fetch('/api/fixtures');
        return res.json();
    },
    
    async getH2H() {
        const res = await this.fetch('/api/h2h');
        return res.json();
    },
    
    async getGameDetail(fixtureId) {
        const res = await this.fetch(`/api/fixture/${fixtureId}`);
        return res.json();
    },
    
    async getLineup(uid) {
        const res = await this.fetch(`/api/picks/${uid}`);
        return res.json();
    },
    
    async refresh() {
        const res = await this.fetch('/api/refresh', {method: 'POST'});
        return res.json();
    }
};

// ===== Render对象：所有DOM操作 =====
const Render = {
    updateTime() {
        const now = new Date();
        const timeEl = document.getElementById('update-time');
        if (timeEl) {
            timeEl.textContent = now.toLocaleTimeString('zh-CN', {hour:'2-digit', minute:'2-digit', second:'2-digit'});
        }
    },
    
    gameCount(count) {
        const el = document.getElementById('game-count');
        if (el) el.textContent = count + '场';
    },
    
    eventInfo(name) {
        const el = document.getElementById('event-info');
        if (el) el.textContent = `${name} • League #1653`;
    },
    
    matchCount(count) {
        const el = document.getElementById('match-count');
        if (el) el.textContent = count + '场';
    },
    
    gamesList(games) {
        const container = document.getElementById('game-list');
        if (!container) return;
        
        if (!games || games.length === 0) {
            container.innerHTML = '<div style="text-align:center;padding:40px;color:#999;">暂无比赛</div>';
            return;
        }
        
        const html = games.map(g => {
            const isLive = g.started && !g.finished;
            const status = isLive ? '进行中' : (g.finished ? '已结束' : '未开始');
            const homeClass = g.home_score > g.away_score ? 'winning' : (g.home_score < g.away_score ? 'losing' : '');
            const awayClass = g.away_score > g.home_score ? 'winning' : (g.away_score < g.home_score ? 'losing' : '');
            
            return `
                <div class="game-item" onclick="App.showGameDetail(${g.id})">
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
        
        container.innerHTML = html;
    },
    
    h2hList(matches) {
        const container = document.getElementById('h2h-list');
        if (!container) return;
        
        const html = matches.map(m => {
            const isT1Win = m.total1 > m.total2;
            const isDraw = m.total1 === m.total2;
            const leftClass = isDraw ? '' : (isT1Win ? 'winning' : 'losing');
            const rightClass = isDraw ? '' : (isT1Win ? 'losing' : 'winning');
            const s1Class = isDraw ? '' : (isT1Win ? 'winning' : 'losing');
            const s2Class = isDraw ? '' : (isT1Win ? 'losing' : 'winning');
            
            return `
                <div class="match-card" onclick="App.showLineupDual(${m.uid1}, '${m.t1}', ${m.uid2}, '${m.t2}')">
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
        
        container.innerHTML = html;
    },
    
    modalLoading(modalId, bodyId, titleId, title) {
        const modal = document.getElementById(modalId);
        const body = document.getElementById(bodyId);
        const titleEl = titleId ? document.getElementById(titleId) : null;
        
        if (modal) modal.classList.add('active');
        if (body) body.innerHTML = '<div class="loading"><div class="spinner"></div>加载中...</div>';
        if (titleEl && title) titleEl.textContent = title;
    },
    
    modalError(bodyId, message = '加载失败') {
        const body = document.getElementById(bodyId);
        if (body) body.innerHTML = `<div style="text-align:center;padding:20px;">${message}</div>`;
    },
    
    gameDetail(data) {
        const body = document.getElementById('game-body');
        const title = document.getElementById('game-title');
        
        if (!data.home_players) {
            this.modalError('game-body', '暂无数据');
            return;
        }
        
        if (title) title.textContent = `${data.away_team} @ ${data.home_team}`;
        
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
        
        if (body) {
            body.innerHTML = `
                <div class="game-detail-container">
                    ${createTable(data.away_players, data.away_team)}
                    ${createTable(data.home_players, data.home_team)}
                </div>
            `;
        }
    },
    
    lineup(data, name, isDual = false, dualData = null, dualName = null) {
        const body = document.getElementById('lineup-body');
        const title = document.getElementById('lineup-title');
        
        if (title) {
            title.textContent = isDual ? `${name} VS ${dualName}` : `${name} 的阵容`;
        }
        
        if (isDual && dualData) {
            // 双人对阵视图
            const createLineupSection = (ldata, teamName) => {
                if (!ldata.players || ldata.players.length === 0) {
                    return `<div style="text-align:center;padding:20px;">暂无数据</div>`;
                }
                
                const starters = ldata.players.filter(p => p.lineup_position <= 5);
                const bench = ldata.players.filter(p => p.lineup_position > 5);
                
                const createPlayerCard = (p) => {
                    const isCaptain = p.is_captain && p.multiplier > 1;
                    const badge = isCaptain ? '<span class="captain-badge">C</span>' : '';
                    const posClass = p.position_name === 'BC' ? 'pos-BC' : 'pos-FC';
                    const effectiveClass = p.is_effective ? 'effective' : 'ineffective';
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
                            <div class="dual-team-score">${ldata.total_live}</div>
                            <div class="dual-team-formation">${ldata.formation}</div>
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
            
            if (body) {
                body.innerHTML = `
                    <div class="dual-lineup-container">
                        ${createLineupSection(data, name)}
                        ${createLineupSection(dualData, dualName)}
                    </div>
                `;
            }
        } else {
            // 单人视图
            if (!data.players || data.players.length === 0) {
                this.modalError('lineup-body', '暂无数据');
                return;
            }
            
            const starters = data.players.filter(p => p.lineup_position <= 5);
            const bench = data.players.filter(p => p.lineup_position > 5);
            
            const createPlayerCard = (p) => {
                const isCaptain = p.is_captain && p.multiplier > 1;
                const badge = isCaptain ? '<span class="captain-badge">C</span>' : '';
                const posClass = p.position_name === 'BC' ? 'pos-BC' : 'pos-FC';
                const effectiveClass = p.is_effective ? 'effective' : 'ineffective';
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
            
            if (body) {
                body.innerHTML = `
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
            }
        }
    },
    
    refreshButton(state, text) {
        const btn = document.getElementById('refresh-btn');
        if (btn) {
            btn.disabled = state === 'loading';
            btn.textContent = text;
        }
    }
};

// ===== App对象：事件绑定和初始化 =====
const App = {
    async loadAll() {
        try {
            await Promise.all([this.loadGames(), this.loadH2H()]);
            Render.updateTime();
        } catch (e) {
            console.error('LoadAll error:', e);
        }
    },
    
    async loadGames() {
        try {
            console.log('[Games] Fetching fixtures...');
            const data = await API.getGames();
            console.log('[Games] Got data:', data);
            
            Render.gameCount(data.count || 0);
            
            if (data.event_name) {
                Render.eventInfo(data.event_name);
                currentEventName = data.event_name;
            }
            
            Render.gamesList(data.games);
        } catch (e) {
            console.error('Games error:', e);
            // 错误已在API层处理，显示banner
        }
    },
    
    async loadH2H() {
        try {
            const data = await API.getH2H();
            Render.matchCount(data.length);
            Render.h2hList(data);
        } catch (e) {
            console.error('H2H error:', e);
        }
    },
    
    async showGameDetail(fixtureId) {
        Render.modalLoading('game-modal', 'game-body', 'game-title');
        
        try {
            const data = await API.getGameDetail(fixtureId);
            Render.gameDetail(data);
        } catch (e) {
            Render.modalError('game-body');
        }
    },
    
    async showLineup(uid, name) {
        Render.modalLoading('lineup-modal', 'lineup-body', 'lineup-title', name + ' 的阵容');
        
        try {
            const data = await API.getLineup(uid);
            Render.lineup(data, name);
        } catch (e) {
            Render.modalError('lineup-body');
        }
    },
    
    async showLineupDual(uid1, name1, uid2, name2) {
        Render.modalLoading('lineup-modal', 'lineup-body', 'lineup-title', name1 + ' VS ' + name2);
        
        try {
            const [data1, data2] = await Promise.all([
                API.getLineup(uid1),
                API.getLineup(uid2)
            ]);
            Render.lineup(data1, name1, true, data2, name2);
        } catch (e) {
            Render.modalError('lineup-body');
        }
    },
    
    async manualRefresh() {
        Render.refreshButton('loading', '刷新中...');
        
        try {
            const data = await API.refresh();
            if (data.success) {
                if (data.current_event_name) {
                    Render.eventInfo(data.current_event_name);
                }
                await this.loadAll();
            }
        } catch (e) {
            console.error(e);
        } finally {
            Render.refreshButton('idle', '刷新数据');
        }
    },
    
    init() {
        // 页面加载完成后初始化
        document.addEventListener('DOMContentLoaded', () => {
            this.loadAll();
            // 自动刷新
            setInterval(() => this.loadAll(), 60000);
        });
        
        // ESC键关闭弹窗
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                document.getElementById('lineup-modal')?.classList.remove('active');
                document.getElementById('game-modal')?.classList.remove('active');
            }
        });
    }
};

// ===== 工具函数（保持兼容） =====
function closeModal(e, modalId) {
    if (e && e.target !== e.currentTarget) return;
    document.getElementById(modalId)?.classList.remove('active');
}

// 全局暴露（保持HTML中的onclick兼容）
window.App = App;
window.closeModal = closeModal;

// 启动应用
App.init();
