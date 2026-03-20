"""
数据处理服务
添加校验函数和事务包装

修改日期: 2026-03-20
修改点:
1. 添加validate_api_response函数进行数据校验
2. 使用sqlite3的事务（BEGIN TRANSACTION / COMMIT / ROLLBACK）
3. 任一环节出错执行rollback，保持旧数据
"""

import sqlite3
import logging
from typing import Dict, List, Tuple, Optional

from backend.cache import CACHE, _get_connection, _db_lock
from backend.config import POSITION_MAP, BASE_URL, CURRENT_PHASE, LEAGUE_ID, UID_MAP
from backend.api_client import fetch

logger = logging.getLogger(__name__)


def validate_api_response(data: any) -> bool:
    """校验API响应数据
    
    Args:
        data: API响应数据
        
    Returns:
        校验通过返回True，否则False
    """
    # 检查data是否为dict
    if not isinstance(data, dict):
        logger.error(f"[Validate] Data is not a dict: {type(data)}")
        return False
    
    # 检查是否包含'players'键（或'elements'，NBA API通常用elements）
    elements = data.get('elements') or data.get('players')
    if elements is None:
        logger.error("[Validate] Data missing 'elements' or 'players' key")
        return False
    
    # 检查是否为list
    if not isinstance(elements, list):
        logger.error(f"[Validate] Elements is not a list: {type(elements)}")
        return False
    
    # 检查每个球员是否有必要字段
    required_fields = ['id', 'web_name', 'points_scored']
    for i, elem in enumerate(elements[:5]):  # 只检查前5个，避免性能问题
        if not isinstance(elem, dict):
            logger.error(f"[Validate] Element {i} is not a dict")
            return False
        
        for field in ['id']:  # 最小必要字段检查
            if field not in elem:
                logger.error(f"[Validate] Element {i} missing required field: {field}")
                return False
    
    logger.info(f"[Validate] API response validation passed, {len(elements)} elements")
    return True


async def refresh_data() -> bool:
    """刷新数据（带校验和事务）
    
    Returns:
        刷新成功返回True，否则False
    """
    import httpx
    
    logger.info("[Refresh] Starting data refresh with validation...")
    
    async with httpx.AsyncClient() as client:
        # 获取数据
        url = f"{BASE_URL}/bootstrap-static/"
        try:
            data = await fetch(client, url)
        except Exception as e:
            logger.error(f"[Refresh] Failed to fetch data: {e}")
            return False
        
        if not data:
            logger.error("[Refresh] No data received from API")
            return False
        
        # 校验数据
        if not validate_api_response(data):
            logger.error("[Refresh] Data validation failed, aborting update")
            return False
        
        # 使用事务更新数据库
        conn = _get_connection()
        try:
            with _db_lock:
                cursor = conn.cursor()
                
                # 开始事务
                cursor.execute("BEGIN TRANSACTION")
                logger.info("[Refresh] Transaction started")
                
                try:
                    # 更新球队数据
                    if 'teams' in data:
                        cursor.execute("DELETE FROM teams_temp WHERE 1=1")
                        for team in data['teams']:
                            cursor.execute('''
                                INSERT OR REPLACE INTO cache_meta (key, value, updated_at)
                                VALUES (?, ?, datetime('now'))
                            ''', (f"team_{team['id']}", team['name']))
                    
                    # 更新球员数据
                    if 'elements' in data:
                        from backend.cache import save_players
                        
                        players_list = []
                        for elem in data['elements']:
                            players_list.append({
                                'id': elem['id'],
                                'name': elem.get('web_name', f"#{elem['id']}"),
                                'team': elem.get('team'),
                                'position': elem.get('element_type'),
                                'points_scored': elem.get('points_scored', 0),
                                'rebounds': elem.get('rebounds', 0),
                                'assists': elem.get('assists', 0),
                                'steals': elem.get('steals', 0),
                                'blocks': elem.get('blocks', 0),
                                'injury': elem.get('news') if elem.get('status') == 'i' else None,
                                'game_status': elem.get('status', '')
                            })
                        
                        # 批量插入球员数据
                        cursor.execute("DELETE FROM players")
                        for player in players_list:
                            cursor.execute('''
                                INSERT INTO players 
                                (id, name, team, position, points_scored, rebounds, assists, 
                                 steals, blocks, injury, game_status, updated_at)
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
                            ''', (
                                player['id'], player['name'], player['team'],
                                player['position'], player['points_scored'], player['rebounds'],
                                player['assists'], player['steals'], player['blocks'],
                                player['injury'], player['game_status']
                            ))
                    
                    # 保存bootstrap原始数据
                    import json
                    cursor.execute('''
                        INSERT OR REPLACE INTO cache_meta (key, value, updated_at)
                        VALUES ('bootstrap_static', ?, datetime('now'))
                    ''', (json.dumps(data, ensure_ascii=False),))
                    
                    # 更新缓存时间戳
                    cursor.execute('''
                        INSERT OR REPLACE INTO cache_meta (key, value, updated_at)
                        VALUES ('last_refresh', ?, datetime('now'))
                    ''', (datetime.now().isoformat(),))
                    
                    # 提交事务
                    conn.commit()
                    logger.info("[Refresh] Transaction committed successfully")
                    
                    # 更新内存缓存
                    from backend.api_client import _parse_bootstrap
                    _parse_bootstrap(data)
                    
                    return True
                    
                except Exception as e:
                    # 出错回滚
                    conn.rollback()
                    logger.error(f"[Refresh] Transaction rolled back due to error: {e}")
                    import traceback
                    traceback.print_exc()
                    return False
                    
        finally:
            conn.close()


def parse_injury_status(element_info: Dict) -> Optional[str]:
    """
    解析球员伤病状态
    从 element_info 中解析 status 和 news 字段
    - status 为 'i' 表示受伤 (injury)
    - 从 news 中提取受伤部位，如 "Toe expected back 2026-03-23" -> "Toe"
    """
    if not element_info:
        return None
    
    # 检查 status 字段，'i' 表示受伤
    status = element_info.get('status', '')
    if status != 'i':
        return None
    
    # 从 news 字段解析受伤部位
    news = element_info.get('news', '')
    if news:
        # 提取 "expected" 之前的部分作为受伤部位
        if 'expected' in news.lower():
            injury_part = news.lower().split('expected')[0].strip()
            # 首字母大写
            return injury_part.capitalize() if injury_part else "OUT"
        # 如果没有 expected，但有 news，返回 "OUT"
        return "OUT"
    
    return "OUT"


def has_game_today(team_id: int) -> bool:
    """
    检查球队今日是否有比赛
    通过检查 CACHE.fixtures 中是否存在该球队的比赛
    """
    if not team_id or not CACHE.fixtures:
        return False
    
    for fixture in CACHE.fixtures:
        # 检查球队是否是主队或客队
        # 注意：fixtures 中的 team_h 和 team_a 是球队ID，需要与 CACHE.teams 的键匹配
        # 由于 fixtures 中存储的是球队名称，我们需要反向查找
        home_team_name = fixture.get('home_team', '')
        away_team_name = fixture.get('away_team', '')
        
        # 获取球队名称对应的ID
        home_team_id = None
        away_team_id = None
        for tid, name in CACHE.teams.items():
            if name == home_team_name:
                home_team_id = tid
            if name == away_team_name:
                away_team_id = tid
        
        if team_id == home_team_id or team_id == away_team_id:
            return True
    
    return False


def get_player_team_id(element_id: int) -> Optional[int]:
    """获取球员所属球队ID"""
    elem_info = CACHE.elements.get(element_id, {})
    return elem_info.get('team')


def calculate_fantasy_score(stats: Dict) -> int:
    """计算 Fantasy 得分"""
    if not stats:
        return 0
    pts = stats.get('points_scored', 0)
    reb = stats.get('rebounds', 0)
    ast = stats.get('assists', 0)
    stl = stats.get('steals', 0)
    blk = stats.get('blocks', 0)
    return int(pts * 1 + reb * 1 + ast * 2 + stl * 3 + blk * 3)


def get_player_stats(element_id: int) -> Dict:
    """获取球员统计数据"""
    live_info = CACHE.live_elements.get(element_id, {})
    if not isinstance(live_info, dict):
        return {}
    
    stats = live_info.get('stats', {})
    if not isinstance(stats, dict):
        return {}
    
    return {
        'points': int(stats.get('points_scored', 0)),
        'rebounds': int(stats.get('rebounds', 0)),
        'assists': int(stats.get('assists', 0)),
        'steals': int(stats.get('steals', 0)),
        'blocks': int(stats.get('blocks', 0)),
        'minutes': int(stats.get('minutes', 0)),
        'fantasy': calculate_fantasy_score(stats)
    }


def is_player_available(pick: Dict) -> bool:
    """
    检查球员是否可用（未受伤且今日有比赛）
    返回 True 表示球员可以上场比赛
    """
    # 检查伤病状态
    injury = pick.get('injury')
    if injury and injury.strip():
        return False
    
    # 检查今日是否有比赛
    team_id = pick.get('team_id')
    if team_id and not has_game_today(team_id):
        return False
    
    return True


def calculate_effective_score(picks: List[Dict]) -> Tuple[int, List[Dict], str]:
    """
    计算有效得分（3+2规则）
    
    修改内容（Bug修复）：
    1. 过滤受伤球员（injury不为空）
    2. 过滤今日无比赛的球员
    3. 从替补自动递补可用球员
    4. 每日得分 = 有效首发球员得分总和（不再调用外部API）
    """
    # 标记所有球员的有效性
    for p in picks:
        p['is_effective'] = False
    
    # 分离首发和替补
    starters = [p for p in picks if p['lineup_position'] <= 5]
    bench = [p for p in picks if p['lineup_position'] > 5]
    
    # 筛选可用的首发球员（未受伤且有比赛）
    available_starters = [p for p in starters if is_player_available(p)]
    unavailable_starters = [p for p in starters if not is_player_available(p)]
    
    # 筛选可用的替补球员
    available_bench = [p for p in bench if is_player_available(p)]
    
    # 按位置类型分组
    bc_starters = sorted([p for p in available_starters if p['position_type'] == 1], 
                         key=lambda x: x['final_points'], reverse=True)
    fc_starters = sorted([p for p in available_starters if p['position_type'] == 2], 
                         key=lambda x: x['final_points'], reverse=True)
    bc_bench = sorted([p for p in available_bench if p['position_type'] == 1], 
                      key=lambda x: x['final_points'], reverse=True)
    fc_bench = sorted([p for p in available_bench if p['position_type'] == 2], 
                      key=lambda x: x['final_points'], reverse=True)
    
    def try_combination(bc_count: int, fc_count: int):
        """尝试特定的BC+FC组合"""
        # 从可用首发和替补中选人
        bc_pool = bc_starters + bc_bench
        fc_pool = fc_starters + fc_bench
        
        # 选择指定数量的球员
        selected_bc = bc_pool[:bc_count]
        selected_fc = fc_pool[:fc_count]
        
        # 标记是否为有效首发（阵容中实际使用的球员）
        for p in selected_bc:
            p['is_effective'] = True
        for p in selected_fc:
            p['is_effective'] = True
            
        return selected_bc + selected_fc
    
    # 尝试 3BC+2FC 组合
    combo1 = try_combination(3, 2)
    score1 = sum(p['final_points'] for p in combo1)
    
    # 重置有效性标记
    for p in picks:
        p['is_effective'] = False
    
    # 尝试 2BC+3FC 组合
    combo2 = try_combination(2, 3)
    score2 = sum(p['final_points'] for p in combo2)
    
    # 选择得分更高的组合
    if score1 >= score2:
        # 重新标记combo1的有效性
        for p in picks:
            p['is_effective'] = False
        for p in combo1:
            p['is_effective'] = True
        return int(score1), combo1, '3BC+2FC'
    else:
        return int(score2), combo2, '2BC+3FC'


async def update_fixture_details(client):
    """获取每场比赛的球员详情"""
    url = f"{BASE_URL}/fixtures/?event={CACHE.current_event}"
    fixtures = await fetch(client, url)
    
    if not fixtures:
        return
    
    for fixture in fixtures:
        fixture_id = fixture.get('id')
        home_team = fixture.get('team_h')
        away_team = fixture.get('team_a')
        
        home_players = []
        away_players = []
        
        for elem_id, live_data in CACHE.live_elements.items():
            if not isinstance(live_data, dict):
                continue
            
            stats = live_data.get('stats', {})
            if not stats:
                continue
            
            element_info = CACHE.elements.get(int(elem_id), {})
            player_team = element_info.get('team')
            
            player_data = {
                'id': elem_id,
                'name': element_info.get('name', f"#{elem_id}"),
                'position': element_info.get('position'),
                'position_name': element_info.get('position_name'),
                **get_player_stats(int(elem_id))
            }
            
            if player_team == home_team:
                home_players.append(player_data)
            elif player_team == away_team:
                away_players.append(player_data)
        
        home_players.sort(key=lambda x: x['fantasy'], reverse=True)
        away_players.sort(key=lambda x: x['fantasy'], reverse=True)
        
        CACHE.fixture_details[fixture_id] = {
            'home_team': CACHE.teams.get(home_team, f"Team #{home_team}"),
            'away_team': CACHE.teams.get(away_team, f"Team #{away_team}"),
            'home_players': home_players,
            'away_players': away_players
        }


async def update_user_picks(client, uid: int) -> Tuple[Optional[int], List[Dict]]:
    """
    获取用户阵容
    
    修改内容（Bug修复）：
    1. 添加 injury 字段，从 element_info 中解析
    2. 添加 team_id 字段，用于检查今日是否有比赛
    """
    url = f"{BASE_URL}/entry/{uid}/event/{CACHE.current_event}/picks/"
    data = await fetch(client, url)
    
    if not data or 'picks' not in data:
        return None, []
    
    picks = []
    for pick in data['picks']:
        element_id = pick.get('element')
        multiplier = pick.get('multiplier', 1)
        is_captain = pick.get('is_captain', False)
        position = pick.get('position')
        
        elem_info = CACHE.elements.get(element_id, {})
        elem_type = elem_info.get('position', 0)
        
        # 解析伤病状态
        injury = parse_injury_status(elem_info)
        
        # 获取球队ID
        team_id = elem_info.get('team')
        
        stats = get_player_stats(element_id)
        base_points = stats.get('fantasy', 0)
        final_points = base_points * multiplier if is_captain else base_points
        
        picks.append({
            'element_id': element_id,
            'name': elem_info.get('name', f"#{element_id}"),
            'position_type': elem_type,
            'position_name': POSITION_MAP.get(elem_type, 'UNK'),
            'lineup_position': position,
            'is_captain': is_captain,
            'is_vice': pick.get('is_vice_captain', False),
            'multiplier': multiplier,
            'base_points': base_points,
            'final_points': final_points,
            'stats': stats,
            'injury': injury,  # 新增：伤病信息
            'team_id': team_id  # 新增：球队ID，用于检查今日是否有比赛
        })
    
    CACHE.user_picks[uid] = picks
    effective_score, _, _ = calculate_effective_score(picks)
    return effective_score, picks


async def update_standings(client):
    """获取联赛排名"""
    url = f"{BASE_URL}/leagues-classic/{LEAGUE_ID}/standings/?phase={CURRENT_PHASE}"
    data = await fetch(client, url)
    
    if not data or 'standings' not in data or 'results' not in data['standings']:
        return
    
    import asyncio
    
    uids_to_fetch = []
    for entry in data['standings']['results']:
        uid = entry.get('entry')
        if uid in UID_MAP:
            total = int(float(entry.get('total', 0)) / 10)
            CACHE.standings[uid] = {
                'total': total, 
                'today_live': 0,
                'effective_players': []
            }
            uids_to_fetch.append(uid)
    
    print(f"[Standings] Loaded {len(CACHE.standings)} users")
    
    for uid in uids_to_fetch:
        try:
            score, picks = await update_user_picks(client, uid)
            if score is not None:
                CACHE.standings[uid]['today_live'] = score
                CACHE.standings[uid]['picks'] = picks
            await asyncio.sleep(0.5)
        except Exception as e:
            print(f"[Error] Failed to fetch picks for {uid}: {e}")


async def update_all(force_static: bool = False):
    """更新所有数据"""
    import asyncio
    import httpx
    from datetime import datetime
    
    if CACHE.updating:
        return False
    
    CACHE.updating = True
    print(f"\n[{datetime.now().strftime('%H:%M:%S')}] Updating...")
    
    try:
        async with httpx.AsyncClient() as client:
            await update_static_data(client, force=force_static)
            await update_live_data(client)
            await update_fixture_details(client)
            await update_standings(client)
            await update_fixtures(client)
            CACHE.last_update = datetime.now()
            print(f"[OK] Updated at {CACHE.last_update.strftime('%H:%M:%S')}")
            print(f"[OK] Current Event: {CACHE.current_event_name} (ID: {CACHE.current_event})")
            return True
    except Exception as e:
        print(f"[Error] Update failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        CACHE.updating = False


# 导入避免循环依赖
from backend.api_client import update_static_data, update_live_data, update_fixtures
