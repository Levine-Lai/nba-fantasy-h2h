"""
NBA Fantasy API 客户端

AI修改指引：
- 修改API超时: 修改timeout参数
- 修改重试次数: 修改retries参数
- 添加新API: 添加新方法
"""

import asyncio
from typing import Optional, Any, Tuple, List, Dict
from datetime import datetime, timezone, timedelta

import httpx

from backend.config import BASE_URL, POSITION_MAP
from backend.cache import CACHE, LocalCache
from backend.config import STATIC_JSON


async def fetch(client: httpx.AsyncClient, url: str, retries: int = 3) -> Optional[Any]:
    """带重试的HTTP请求"""
    for i in range(retries):
        try:
            resp = await client.get(url, timeout=15.0, headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            })
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            if i == retries - 1:
                print(f"[Error] Failed to fetch {url}: {e}")
                return None
            await asyncio.sleep(1 * (i + 1))


def get_current_event(events: List[Dict]) -> Tuple[int, str]:
    """
    根据当前北京时间，自动判断当前应该使用哪个event
    规则：
    1. 优先找 is_current=true 的event
    2. 如果没有，找 deadline_time 已经过了但 finished=false 的event
    3. 如果都没有，返回第一个未完成的event或默认值
    """
    now_bj = datetime.now(timezone(timedelta(hours=8)))
    
    print(f"[Event] Current Beijing Time: {now_bj.strftime('%Y-%m-%d %H:%M:%S')}")
    
    # 首先尝试找 is_current=true 的event
    for event in events:
        if event.get('is_current', False):
            event_id = event.get('id', 139)
            event_name = event.get('name', f'Event {event_id}')
            print(f"[Event] Found is_current=true: {event_name} (ID: {event_id})")
            return event_id, event_name
    
    # 如果没有 is_current，找 deadline_time 已经过了且 finished=false 的
    for event in events:
        deadline_str = event.get('deadline_time', '')
        finished = event.get('finished', False)
        
        if deadline_str and not finished:
            try:
                deadline_utc = datetime.fromisoformat(deadline_str.replace('Z', '+00:00'))
                deadline_bj = deadline_utc.astimezone(timezone(timedelta(hours=8)))
                
                if now_bj >= deadline_bj:
                    event_id = event.get('id', 139)
                    event_name = event.get('name', f'Event {event_id}')
                    print(f"[Event] Found active event (deadline passed): {event_name} (ID: {event_id})")
                    print(f"[Event] Deadline (BJ): {deadline_bj.strftime('%Y-%m-%d %H:%M:%S')}")
                    return event_id, event_name
            except Exception as e:
                print(f"[Event] Error parsing deadline: {e}")
                continue
    
    # 如果都没有，返回第一个未完成的event
    for event in events:
        if not event.get('finished', False):
            event_id = event.get('id', 139)
            event_name = event.get('name', f'Event {event_id}')
            print(f"[Event] Using first unfinished event: {event_name} (ID: {event_id})")
            return event_id, event_name
    
    # 兜底：返回最后一个event
    if events:
        last_event = events[-1]
        event_id = last_event.get('id', 139)
        event_name = last_event.get('name', f'Event {event_id}')
        print(f"[Event] Using last event: {event_name} (ID: {event_id})")
        return event_id, event_name
    
    return 139, "Event 139"


def _parse_bootstrap(data: dict):
    """解析bootstrap数据"""
    # 球队
    if 'teams' in data:
        for team in data['teams']:
            CACHE.teams[team['id']] = team['name']
    
    # 球员
    if 'elements' in data:
        for elem in data['elements']:
            CACHE.elements[elem['id']] = {
                'name': elem.get('web_name', f"#{elem['id']}"),
                'team': elem.get('team'),
                'position': elem.get('element_type'),
                'position_name': POSITION_MAP.get(elem.get('element_type'), 'UNK'),
                'value': elem.get('now_cost', 0),
                'points_per_game': elem.get('points_per_game', 0),
                'status': elem.get('status', ''),  # 新增：球员状态，'i'表示受伤
                'news': elem.get('news', '')  # 新增：伤病新闻
            }
    
    # 解析events数据
    if 'events' in data:
        CACHE.events_data = data['events']
        event_id, event_name = get_current_event(data['events'])
        CACHE.current_event = event_id
        CACHE.current_event_name = event_name


def load_static_data() -> bool:
    """
    加载静态数据（优先本地缓存）
    返回是否成功加载
    """
    json_data = LocalCache.load_bootstrap_json()
    if json_data:
        print("[Cache] Loading from local JSON...")
        _parse_bootstrap(json_data)
        return True
    
    teams = LocalCache.load_teams_csv()
    players = LocalCache.load_players_csv()
    
    if teams and players:
        print("[Cache] Loading from local CSV...")
        CACHE.teams = teams
        CACHE.elements = players
        return True
    
    return False


async def update_static_data(client: httpx.AsyncClient, force: bool = False):
    """
    获取静态数据，优先使用缓存
    force=True 强制刷新缓存
    """
    if not force and LocalCache.is_fresh(STATIC_JSON, hours=24):
        json_data = LocalCache.load_bootstrap_json()
        if json_data:
            print("[Cache] Using fresh local cache")
            _parse_bootstrap(json_data)
            return
    
    print("[API] Fetching bootstrap-static...")
    url = f"{BASE_URL}/bootstrap-static/"
    data = await fetch(client, url)
    
    if not data:
        if load_static_data():
            print("[Cache] Using stale local cache")
            return
        raise Exception("Failed to load static data")
    
    _parse_bootstrap(data)
    LocalCache.save_bootstrap_json(data)
    LocalCache.save_teams_csv(CACHE.teams)
    LocalCache.save_players_csv(CACHE.elements)
    
    print(f"[API] Loaded {len(CACHE.teams)} teams, {len(CACHE.elements)} players")
    print(f"[API] Current Event: {CACHE.current_event_name} (ID: {CACHE.current_event})")


async def update_live_data(client: httpx.AsyncClient):
    """获取实时 live 数据"""
    url = f"{BASE_URL}/event/{CACHE.current_event}/live/"
    data = await fetch(client, url)
    
    if not data:
        return
    
    if isinstance(data, dict) and 'elements' in data:
        elements = data['elements']
        if isinstance(elements, dict):
            CACHE.live_elements = {int(k): v for k, v in elements.items()}
        elif isinstance(elements, list):
            CACHE.live_elements = {item.get('id', i): item for i, item in enumerate(elements)}
    elif isinstance(data, list):
        CACHE.live_elements = {item.get('id', i): item for i, item in enumerate(data)}
    
    print(f"[Live] Loaded {len(CACHE.live_elements)} players for Event {CACHE.current_event}")


async def update_fixtures(client: httpx.AsyncClient):
    """获取赛程"""
    url = f"{BASE_URL}/fixtures/?event={CACHE.current_event}"
    print(f"[Fixtures] Fetching from {url}")
    data = await fetch(client, url)
    
    if not data:
        print(f"[Fixtures] No data returned from API")
        return
    
    print(f"[Fixtures] Got {len(data) if isinstance(data, list) else 'non-list'} data from API")
    games = []
    for f in data:
        home_id = f.get('team_h')
        away_id = f.get('team_a')
        
        kickoff_utc = f.get('kickoff_time', '')
        kickoff_bj = '--:--'
        if kickoff_utc:
            try:
                dt = datetime.fromisoformat(kickoff_utc.replace('Z', '+00:00'))
                dt_bj = dt.astimezone(timezone(timedelta(hours=8)))
                kickoff_bj = dt_bj.strftime('%H:%M')
            except:
                kickoff_bj = kickoff_utc[11:16]
        
        games.append({
            'id': f.get('id'),
            'home_team': CACHE.teams.get(home_id, f"Team #{home_id}"),
            'away_team': CACHE.teams.get(away_id, f"Team #{away_id}"),
            'home_score': f.get('team_h_score', 0),
            'away_score': f.get('team_a_score', 0),
            'started': f.get('started', False),
            'finished': f.get('finished', False),
            'kickoff': kickoff_bj
        })
    
    CACHE.fixtures = games
    print(f"[Fixtures] Loaded {len(games)} games for Event {CACHE.current_event}")
