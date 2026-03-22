"""
NBA Fantasy API 客户端
添加熔断器和重试机制

修改日期: 2026-03-20
修改点:
1. 添加类变量记录失败状态
2. 连续失败3次后进入5分钟熔断期
3. API调用添加try-except，超时10秒
4. 失败时记录error日志
"""

import asyncio
import logging
from typing import Optional, Any, Tuple, List, Dict
from datetime import datetime, timezone, timedelta

import httpx

from backend.config import BASE_URL, POSITION_MAP
from backend.cache import CACHE, LocalCache, save_cache_timestamp, get_cache_timestamp
from backend.config import STATIC_JSON

logger = logging.getLogger(__name__)

# 熔断器状态
class CircuitBreaker:
    """简单熔断器"""
    failures_count: int = 0
    last_failure_time: Optional[datetime] = None
    circuit_open: bool = False
    
    # 配置
    FAILURE_THRESHOLD: int = 3
    CIRCUIT_TIMEOUT_SECONDS: int = 300  # 5分钟
    
    @classmethod
    def record_failure(cls):
        """记录失败"""
        cls.failures_count += 1
        cls.last_failure_time = datetime.now()
        logger.error(f"[CircuitBreaker] Failure recorded. Count: {cls.failures_count}")
        
        if cls.failures_count >= cls.FAILURE_THRESHOLD:
            cls.circuit_open = True
            logger.error(f"[CircuitBreaker] Circuit OPENED! Will block requests for {cls.CIRCUIT_TIMEOUT_SECONDS}s")
    
    @classmethod
    def record_success(cls):
        """记录成功，重置失败计数"""
        if cls.failures_count > 0:
            cls.failures_count = 0
            cls.circuit_open = False
            cls.last_failure_time = None
            logger.info("[CircuitBreaker] Failure count reset after success")
    
    @classmethod
    def is_circuit_open(cls) -> bool:
        """检查熔断器是否打开"""
        if not cls.circuit_open:
            return False
        
        # 检查是否超过熔断时间
        if cls.last_failure_time:
            elapsed = (datetime.now() - cls.last_failure_time).total_seconds()
            if elapsed > cls.CIRCUIT_TIMEOUT_SECONDS:
                # 熔断期结束，半开状态
                cls.circuit_open = False
                cls.failures_count = 0
                logger.info("[CircuitBreaker] Circuit HALF-OPEN, allowing request through")
                return False
        
        return True
    
    @classmethod
    def get_fallback_message(cls) -> str:
        """获取熔断期间的降级消息"""
        return "使用缓存数据（API服务暂时不可用）"


async def fetch(client: httpx.AsyncClient, url: str, retries: int = 3) -> Optional[Any]:
    """带重试和熔断的HTTP请求
    
    Args:
        client: HTTP客户端
        url: 请求URL
        retries: 重试次数
        
    Returns:
        响应数据或None
    """
    # 检查熔断器
    if CircuitBreaker.is_circuit_open():
        logger.warning(f"[CircuitBreaker] Request blocked for {url}")
        raise Exception(CircuitBreaker.get_fallback_message())
    
    for i in range(retries):
        try:
            resp = await client.get(url, timeout=10.0, headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            })
            resp.raise_for_status()
            
            # 成功，重置熔断器
            CircuitBreaker.record_success()
            
            return resp.json()
            
        except httpx.TimeoutException as e:
            logger.error(f"[Error] Timeout fetching {url}: {e}")
            if i == retries - 1:
                CircuitBreaker.record_failure()
                return None
            await asyncio.sleep(1 * (i + 1))
            
        except httpx.HTTPStatusError as e:
            logger.error(f"[Error] HTTP error fetching {url}: {e.response.status_code}")
            if i == retries - 1:
                CircuitBreaker.record_failure()
                return None
            await asyncio.sleep(1 * (i + 1))
            
        except Exception as e:
            logger.error(f"[Error] Failed to fetch {url}: {e}")
            if i == retries - 1:
                CircuitBreaker.record_failure()
                return None
            await asyncio.sleep(1 * (i + 1))
    
    return None


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
        print("[Cache] Loading from local SQLite...")
        _parse_bootstrap(json_data)
        return True
    
    teams = LocalCache.load_teams_csv()
    players = LocalCache.load_players_csv()
    
    if teams and players:
        print("[Cache] Loading from local SQLite...")
        CACHE.teams = teams
        CACHE.elements = players
        return True
    
    return False


async def update_static_data(client: httpx.AsyncClient, force: bool = False):
    """
    获取静态数据，优先使用缓存
    force=True 强制刷新缓存
    """
    # 检查缓存是否新鲜（使用cache_meta表）
    cache_key = 'bootstrap_static'
    last_update = get_cache_timestamp(cache_key)
    is_fresh = False
    if last_update:
        age = (datetime.now() - last_update).total_seconds()
        is_fresh = age < (24 * 3600)  # 24小时
    
    if not force and is_fresh:
        json_data = LocalCache.load_bootstrap_json()
        if json_data:
            print("[Cache] Using fresh local cache")
            _parse_bootstrap(json_data)
            return
    
    print("[API] Fetching bootstrap-static...")
    url = f"{BASE_URL}/bootstrap-static/"
    
    try:
        data = await fetch(client, url)
    except Exception as e:
        logger.error(f"[API] Fetch failed: {e}")
        if load_static_data():
            print("[Cache] Using stale local cache due to API failure")
            return
        raise Exception("Failed to load static data")
    
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
    
    try:
        data = await fetch(client, url)
    except Exception as e:
        logger.error(f"[Live] Failed to fetch live data: {e}")
        return
    
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
    
    try:
        data = await fetch(client, url)
    except Exception as e:
        logger.error(f"[Fixtures] Failed to fetch fixtures: {e}")
        return
    
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


async def get_entry_transfers(client: httpx.AsyncClient, entry_id: int) -> List[Dict]:
    """获取用户转会记录"""
    url = f"{BASE_URL}/entry/{entry_id}/transfers/"
    data = await fetch(client, url)
    return data if isinstance(data, list) else []


async def get_entry_history(client: httpx.AsyncClient, entry_id: int) -> Dict:
    """获取用户历史记录（含卡片使用信息）"""
    url = f"{BASE_URL}/entry/{entry_id}/history/"
    data = await fetch(client, url)
    return data if isinstance(data, dict) else {}
