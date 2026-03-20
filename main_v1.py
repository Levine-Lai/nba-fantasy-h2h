import uvicorn
from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
import httpx
import asyncio
import json
import csv
import os
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Any, Tuple

app = FastAPI(title="NBA Fantasy H2H Dashboard")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== 配置 ====================

LEAGUE_ID = 1653
# CURRENT_EVENT 不再固定，改为动态获取
CURRENT_PHASE = 23

# 本地缓存文件路径
CACHE_DIR = "./cache"
STATIC_JSON = f"{CACHE_DIR}/bootstrap_static.json"
TEAMS_CSV = f"{CACHE_DIR}/teams.csv"
PLAYERS_CSV = f"{CACHE_DIR}/players.csv"

POSITION_MAP = {1: 'BC', 2: 'FC'}

UID_MAP = {
    5410: "kusuri", 3455: "Paul", 32: "伍家辉", 4319: "Kimi", 17: "堡", 
    2: "大吉鲁", 10: "弗老大", 14: "酸男", 6: "紫葱酱", 189: "凯文", 
    9: "雕哥", 4224: "班班", 22761: "纪导", 4: "尼弟", 16447: "文史哲", 
    6562: "柯南", 23: "橘队", 11: "船哥", 5101: "鬼嗨", 6441: "马哥", 
    15: "笨笨", 5095: "AI", 5467: "老姜", 6412: "阿甘", 8580: "小火龙", 42: "桑迪"
}
NAME_TO_UID = {v: k for k, v in UID_MAP.items()}

FIXTURES_GW22 = [
    ("AI", "纪导"), ("弗老大", "柯南"), ("凯文", "大吉鲁"), ("Kimi", "酸男"),
    ("kusuri", "鬼嗨"), ("马哥", "阿甘"), ("Paul", "老姜"), ("桑迪", "紫葱酱"),
    ("伍家辉", "笨笨"), ("堡", "班班"), ("小火龙", "橘队"), ("尼弟", "文史哲"), ("雕哥", "船哥")
]

BASE_URL = "https://nbafantasy.nba.com/api"

# ==================== 缓存管理 ====================

class LocalCache:
    """本地文件缓存管理"""
    
    @staticmethod
    def ensure_dir():
        if not os.path.exists(CACHE_DIR):
            os.makedirs(CACHE_DIR)
    
    @staticmethod
    def save_bootstrap_json(data: dict):
        """保存完整的bootstrap数据为JSON"""
        LocalCache.ensure_dir()
        with open(STATIC_JSON, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False)
        print(f"[Cache] Saved bootstrap to {STATIC_JSON}")
    
    @staticmethod
    def load_bootstrap_json() -> Optional[dict]:
        """加载本地JSON缓存"""
        if os.path.exists(STATIC_JSON):
            try:
                with open(STATIC_JSON, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception as e:
                print(f"[Cache] Error loading JSON: {e}")
        return None
    
    @staticmethod
    def save_teams_csv(teams: dict):
        """保存球队为CSV"""
        LocalCache.ensure_dir()
        with open(TEAMS_CSV, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(['id', 'name', 'short_name'])
            for team_id, team_data in teams.items():
                if isinstance(team_data, dict):
                    writer.writerow([
                        team_id,
                        team_data.get('name', ''),
                        team_data.get('short_name', '')
                    ])
                else:
                    writer.writerow([team_id, team_data, ''])
        print(f"[Cache] Saved {len(teams)} teams to {TEAMS_CSV}")
    
    @staticmethod
    def load_teams_csv() -> dict:
        """加载球队CSV"""
        teams = {}
        if os.path.exists(TEAMS_CSV):
            try:
                with open(TEAMS_CSV, 'r', encoding='utf-8') as f:
                    reader = csv.DictReader(f)
                    for row in reader:
                        teams[int(row['id'])] = row['name']
            except Exception as e:
                print(f"[Cache] Error loading teams CSV: {e}")
        return teams
    
    @staticmethod
    def save_players_csv(elements: dict):
        """保存球员为CSV"""
        LocalCache.ensure_dir()
        with open(PLAYERS_CSV, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(['id', 'name', 'team', 'position', 'position_name', 'value', 'points_per_game'])
            for elem_id, elem in elements.items():
                writer.writerow([
                    elem_id,
                    elem.get('name', ''),
                    elem.get('team', ''),
                    elem.get('position', ''),
                    elem.get('position_name', ''),
                    elem.get('value', 0),
                    elem.get('points_per_game', 0)
                ])
        print(f"[Cache] Saved {len(elements)} players to {PLAYERS_CSV}")
    
    @staticmethod
    def load_players_csv() -> dict:
        """加载球员CSV"""
        players = {}
        if os.path.exists(PLAYERS_CSV):
            try:
                with open(PLAYERS_CSV, 'r', encoding='utf-8') as f:
                    reader = csv.DictReader(f)
                    for row in reader:
                        players[int(row['id'])] = {
                            'name': row['name'],
                            'team': int(row['team']) if row['team'] else 0,
                            'position': int(row['position']) if row['position'] else 0,
                            'position_name': row['position_name'],
                            'value': int(row['value']) if row['value'] else 0,
                            'points_per_game': float(row['points_per_game']) if row['points_per_game'] else 0
                        }
            except Exception as e:
                print(f"[Cache] Error loading players CSV: {e}")
        return players
    
    @staticmethod
    def is_fresh(filepath: str, hours: int = 24) -> bool:
        """检查缓存是否在指定时间内"""
        if not os.path.exists(filepath):
            return False
        mtime = os.path.getmtime(filepath)
        age = datetime.now().timestamp() - mtime
        return age < (hours * 3600)

# ==================== 内存缓存 ====================

class Cache:
    def __init__(self):
        self.teams: Dict[int, str] = {}
        self.elements: Dict[int, Dict] = {}
        self.live_elements: Dict[int, Dict] = {}
        self.user_picks: Dict[int, List[Dict]] = {}
        self.standings: Dict[int, Dict] = {}
        self.fixtures: List[Dict] = []
        self.fixture_details: Dict[int, Dict] = {}
        self.last_update: Optional[datetime] = None
        self.updating = False
        self.current_event: int = 139  # 默认值，会被动态更新
        self.current_event_name: str = ""  # 当前event名称
        self.events_data: List[Dict] = []  # 存储所有events数据

CACHE = Cache()

# ==================== 数据抓取 ====================

async def fetch(client: httpx.AsyncClient, url: str, retries: int = 3) -> Optional[Any]:
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
    now_bj = datetime.now(timezone(timedelta(hours=8)))  # 当前北京时间
    
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
                # 解析UTC时间并转换为北京时间
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

def load_static_data() -> bool:
    """
    加载静态数据（优先本地缓存）
    返回是否成功加载
    """
    # 尝试加载本地JSON（最完整）
    json_data = LocalCache.load_bootstrap_json()
    if json_data:
        print("[Cache] Loading from local JSON...")
        _parse_bootstrap(json_data)
        return True
    
    # 尝试加载CSV（轻量级）
    teams = LocalCache.load_teams_csv()
    players = LocalCache.load_players_csv()
    
    if teams and players:
        print("[Cache] Loading from local CSV...")
        CACHE.teams = teams
        CACHE.elements = players
        return True
    
    return False

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
                'points_per_game': elem.get('points_per_game', 0)
            }
    
    # 解析events数据，自动确定当前event
    if 'events' in data:
        CACHE.events_data = data['events']
        event_id, event_name = get_current_event(data['events'])
        CACHE.current_event = event_id
        CACHE.current_event_name = event_name

async def update_static_data(client: httpx.AsyncClient, force: bool = False):
    """
    获取静态数据，优先使用缓存
    force=True 强制刷新缓存
    """
    # 检查本地缓存是否新鲜（24小时内）
    if not force and LocalCache.is_fresh(STATIC_JSON, hours=24):
        json_data = LocalCache.load_bootstrap_json()
        if json_data:
            print("[Cache] Using fresh local cache")
            _parse_bootstrap(json_data)
            return
    
    # 从API获取
    print("[API] Fetching bootstrap-static...")
    url = f"{BASE_URL}/bootstrap-static/"
    data = await fetch(client, url)
    
    if not data:
        # API失败，尝试加载旧缓存
        if load_static_data():
            print("[Cache] Using stale local cache")
            return
        raise Exception("Failed to load static data")
    
    # 解析并保存
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

async def update_fixture_details(client: httpx.AsyncClient):
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

async def update_user_picks(client: httpx.AsyncClient, uid: int) -> Tuple[Optional[int], List[Dict]]:
    """获取用户阵容"""
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
            'stats': stats
        })
    
    CACHE.user_picks[uid] = picks
    effective_score, _, _ = calculate_effective_score(picks)
    return effective_score, picks

def calculate_effective_score(picks: List[Dict]) -> Tuple[int, List[Dict], str]:
    """计算有效得分（3+2规则）"""
    starters = [p for p in picks if p['lineup_position'] <= 5]
    bench = [p for p in picks if p['lineup_position'] > 5]
    
    bc_starters = sorted([p for p in starters if p['position_type'] == 1], key=lambda x: x['final_points'], reverse=True)
    fc_starters = sorted([p for p in starters if p['position_type'] == 2], key=lambda x: x['final_points'], reverse=True)
    bc_bench = sorted([p for p in bench if p['position_type'] == 1], key=lambda x: x['final_points'], reverse=True)
    fc_bench = sorted([p for p in bench if p['position_type'] == 2], key=lambda x: x['final_points'], reverse=True)
    
    def try_combination(bc_count: int, fc_count: int):
        bc_pool = bc_starters + bc_bench
        fc_pool = fc_starters + fc_bench
        selected_bc = bc_pool[:bc_count]
        selected_fc = fc_pool[:fc_count]
        
        for p in selected_bc:
            p['is_effective_starter'] = p['lineup_position'] <= 5
        for p in selected_fc:
            p['is_effective_starter'] = p['lineup_position'] <= 5
            
        return selected_bc + selected_fc
    
    combo1 = try_combination(3, 2)
    score1 = sum(p['final_points'] for p in combo1)
    
    combo2 = try_combination(2, 3)
    score2 = sum(p['final_points'] for p in combo2)
    
    if score1 >= score2:
        return score1, combo1, '3BC+2FC'
    else:
        return score2, combo2, '2BC+3FC'

async def update_standings(client: httpx.AsyncClient):
    """获取联赛排名"""
    url = f"{BASE_URL}/leagues-classic/{LEAGUE_ID}/standings/?phase={CURRENT_PHASE}"
    data = await fetch(client, url)
    
    if not data or 'standings' not in data or 'results' not in data['standings']:
        return
    
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

async def update_fixtures(client: httpx.AsyncClient):
    """获取赛程"""
    url = f"{BASE_URL}/fixtures/?event={CACHE.current_event}"
    data = await fetch(client, url)
    
    if not data:
        return
    
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

async def update_all(force_static: bool = False):
    """更新所有数据"""
    if CACHE.updating:
        return False
    
    CACHE.updating = True
    print(f"\n[{datetime.now().strftime('%H:%M:%S')}] Updating...")
    
    try:
        async with httpx.AsyncClient() as client:
            # 静态数据（优先缓存，但会检查是否需要切换event）
            await update_static_data(client, force=force_static)
            # 实时数据（使用自动检测到的current_event）
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

async def background_task():
    """后台定时更新（只更新实时数据，静态数据24小时更新一次）"""
    while True:
        await update_all(force_static=False)
        await asyncio.sleep(60)

@app.on_event("startup")
async def startup():
    # 启动时尝试加载本地缓存，如果没有则获取
    if not load_static_data():
        print("[Startup] No local cache found, fetching from API...")
        await update_all(force_static=True)
    else:
        # 有缓存，检查是否需要更新event，然后更新实时数据
        async with httpx.AsyncClient() as client:
            # 先获取最新静态数据以确认当前event（如果缓存超过1小时）
            if not LocalCache.is_fresh(STATIC_JSON, hours=1):
                print("[Startup] Cache is stale, checking for new event...")
                await update_static_data(client, force=True)
            else:
                # 使用缓存但重新计算当前event（基于时间）
                json_data = LocalCache.load_bootstrap_json()
                if json_data and 'events' in json_data:
                    event_id, event_name = get_current_event(json_data['events'])
                    CACHE.current_event = event_id
                    CACHE.current_event_name = event_name
                    print(f"[Startup] Using cached data, current event: {event_name} (ID: {event_id})")
            
            # 更新实时数据
            await update_live_data(client)
            await update_fixture_details(client)
            await update_standings(client)
            await update_fixtures(client)
    
    asyncio.create_task(background_task())

# ==================== API ====================

@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "last_update": CACHE.last_update.isoformat() if CACHE.last_update else None,
        "current_event": CACHE.current_event,
        "current_event_name": CACHE.current_event_name
    }

@app.get("/api/h2h")
def get_h2h():
    results = []
    for t1, t2 in FIXTURES_GW22:
        uid1 = NAME_TO_UID.get(t1)
        uid2 = NAME_TO_UID.get(t2)
        
        s1 = CACHE.standings.get(uid1, {'total': 0, 'today_live': 0})
        s2 = CACHE.standings.get(uid2, {'total': 0, 'today_live': 0})
        
        results.append({
            "t1": t1, "t2": t2,
            "uid1": uid1, "uid2": uid2,
            "total1": s1['total'],
            "total2": s2['total'],
            "today1": s1['today_live'],
            "today2": s2['today_live']
        })
    return results

@app.get("/api/fixtures")
def get_fixtures():
    return {
        "event": CACHE.current_event,
        "event_name": CACHE.current_event_name,
        "count": len(CACHE.fixtures),
        "games": CACHE.fixtures
    }

@app.get("/api/fixture/{fixture_id}")
def get_fixture_detail(fixture_id: int):
    return CACHE.fixture_details.get(fixture_id, {})

@app.post("/api/refresh")
async def manual_refresh():
    success = await update_all(force_static=False)
    return {
        "success": success,
        "current_event": CACHE.current_event,
        "current_event_name": CACHE.current_event_name
    }

@app.post("/api/refresh/static")
async def force_refresh_static():
    """强制刷新静态数据"""
    success = await update_all(force_static=True)
    return {
        "success": success,
        "current_event": CACHE.current_event,
        "current_event_name": CACHE.current_event_name
    }

@app.get("/api/picks/{uid}")
def get_picks(uid: int):
    picks = CACHE.user_picks.get(uid, [])
    standings = CACHE.standings.get(uid, {})
    
    if picks:
        effective_score, effective_players, formation = calculate_effective_score(picks)
        effective_ids = {p['element_id'] for p in effective_players}
        for pick in picks:
            pick['is_effective'] = pick['element_id'] in effective_ids
    
    return {
        "uid": uid,
        "team_name": UID_MAP.get(uid, "Unknown"),
        "total_live": standings.get('today_live', 0),
        "event_total": standings.get('total', 0),
        "formation": calculate_effective_score(picks)[2] if picks else 'N/A',
        "current_event": CACHE.current_event,
        "current_event_name": CACHE.current_event_name,
        "players": picks
    }

# ==================== FDR HTML ====================

FDR_HTML = """<tr><td class='t-name'>尼弟</td><td><div class='box fdr-2'>文史哲</div></td><td><div class='box fdr-3'>雕哥</div></td><td><div class='box fdr-1'>小火龙</div></td><td><div class='box fdr-2'>伍家辉</div></td><td class='avg-col'>2.0</td></tr>
<tr><td class='t-name'>堡</td><td><div class='box fdr-3'>班班</div></td><td><div class='box fdr-2'>文史哲</div></td><td><div class='box fdr-3'>雕哥</div></td><td><div class='box fdr-1'>小火龙</div></td><td class='avg-col'>2.25</td></tr>
<tr><td class='t-name'>雕哥</td><td><div class='box fdr-2'>船哥</div></td><td><div class='box fdr-2'>尼弟</div></td><td><div class='box fdr-4'>堡</div></td><td><div class='box fdr-1'>桑迪</div></td><td class='avg-col'>2.25</td></tr>
<tr><td class='t-name'>Paul</td><td><div class='box fdr-1'>老姜</div></td><td><div class='box fdr-5'>笨笨</div></td><td><div class='box fdr-2'>橘队</div></td><td><div class='box fdr-2'>船哥</div></td><td class='avg-col'>2.5</td></tr>
<tr><td class='t-name'>文史哲</td><td><div class='box fdr-2'>尼弟</div></td><td><div class='box fdr-4'>堡</div></td><td><div class='box fdr-1'>桑迪</div></td><td><div class='box fdr-3'>马哥</div></td><td class='avg-col'>2.5</td></tr>
<tr><td class='t-name'>小火龙</td><td><div class='box fdr-2'>橘队</div></td><td><div class='box fdr-2'>船哥</div></td><td><div class='box fdr-2'>尼弟</div></td><td><div class='box fdr-4'>堡</div></td><td class='avg-col'>2.5</td></tr>
<tr><td class='t-name'>弗老大</td><td><div class='box fdr-1'>柯南</div></td><td><div class='box fdr-4'>酸男</div></td><td><div class='box fdr-2'>阿甘</div></td><td><div class='box fdr-4'>紫葱酱</div></td><td class='avg-col'>2.75</td></tr>
<tr><td class='t-name'>Kusuri</td><td><div class='box fdr-3'>鬼嗨</div></td><td><div class='box fdr-1'>老姜</div></td><td><div class='box fdr-5'>笨笨</div></td><td><div class='box fdr-2'>橘队</div></td><td class='avg-col'>2.75</td></tr>
<tr><td class='t-name'>马哥</td><td><div class='box fdr-2'>阿甘</div></td><td><div class='box fdr-4'>紫葱酱</div></td><td><div class='box fdr-3'>班班</div></td><td><div class='box fdr-2'>文史哲</div></td><td class='avg-col'>2.75</td></tr>
<tr><td class='t-name'>伍家辉</td><td><div class='box fdr-5'>笨笨</div></td><td><div class='box fdr-2'>橘队</div></td><td><div class='box fdr-2'>船哥</div></td><td><div class='box fdr-2'>尼弟</div></td><td class='avg-col'>2.75</td></tr>
<tr><td class='t-name'>橘队</td><td><div class='box fdr-1'>小火龙</div></td><td><div class='box fdr-2'>伍家辉</div></td><td><div class='box fdr-5'>Paul</div></td><td><div class='box fdr-3'>Kusuri</div></td><td class='avg-col'>2.75</td></tr>
<tr><td class='t-name'>船哥</td><td><div class='box fdr-3'>雕哥</div></td><td><div class='box fdr-1'>小火龙</div></td><td><div class='box fdr-2'>伍家辉</div></td><td><div class='box fdr-5'>Paul</div></td><td class='avg-col'>2.75</td></tr>
<tr><td class='t-name'>大吉鲁</td><td><div class='box fdr-3'>凯文</div></td><td><div class='box fdr-2'>纪导</div></td><td><div class='box fdr-4'>AI</div></td><td><div class='box fdr-3'>鬼嗨</div></td><td class='avg-col'>3.0</td></tr>
<tr><td class='t-name'>AI</td><td><div class='box fdr-2'>纪导</div></td><td><div class='box fdr-1'>柯南</div></td><td><div class='box fdr-5'>大吉鲁</div></td><td><div class='box fdr-4'>酸男</div></td><td class='avg-col'>3.0</td></tr>
<tr><td class='t-name'>桑迪</td><td><div class='box fdr-4'>紫葱酱</div></td><td><div class='box fdr-3'>班班</div></td><td><div class='box fdr-2'>文史哲</div></td><td><div class='box fdr-3'>雕哥</div></td><td class='avg-col'>3.0</td></tr>
<tr><td class='t-name'>笨笨</td><td><div class='box fdr-2'>伍家辉</div></td><td><div class='box fdr-5'>Paul</div></td><td><div class='box fdr-3'>Kusuri</div></td><td><div class='box fdr-3'>凯文</div></td><td class='avg-col'>3.25</td></tr>
<tr><td class='t-name'>Kimi</td><td><div class='box fdr-4'>酸男</div></td><td><div class='box fdr-2'>阿甘</div></td><td><div class='box fdr-4'>紫葱酱</div></td><td><div class='box fdr-3'>班班</div></td><td class='avg-col'>3.25</td></tr>
<tr><td class='t-name'>紫葱酱</td><td><div class='box fdr-1'>桑迪</div></td><td><div class='box fdr-3'>马哥</div></td><td><div class='box fdr-5'>Kimi</div></td><td><div class='box fdr-4'>弗老大</div></td><td class='avg-col'>3.25</td></tr>
<tr><td class='t-name'>班班</td><td><div class='box fdr-4'>堡</div></td><td><div class='box fdr-1'>桑迪</div></td><td><div class='box fdr-3'>马哥</div></td><td><div class='box fdr-5'>Kimi</div></td><td class='avg-col'>3.25</td></tr>
<tr><td class='t-name'>鬼嗨</td><td><div class='box fdr-3'>Kusuri</div></td><td><div class='box fdr-3'>凯文</div></td><td><div class='box fdr-2'>纪导</div></td><td><div class='box fdr-5'>大吉鲁</div></td><td class='avg-col'>3.25</td></tr>
<tr><td class='t-name'>纪导</td><td><div class='box fdr-4'>AI</div></td><td><div class='box fdr-5'>大吉鲁</div></td><td><div class='box fdr-3'>鬼嗨</div></td><td><div class='box fdr-1'>老姜</div></td><td class='avg-col'>3.25</td></tr>
<tr><td class='t-name'>阿甘</td><td><div class='box fdr-3'>马哥</div></td><td><div class='box fdr-5'>Kimi</div></td><td><div class='box fdr-4'>弗老大</div></td><td><div class='box fdr-1'>柯南</div></td><td class='avg-col'>3.25</td></tr>
<tr><td class='t-name'>老姜</td><td><div class='box fdr-5'>Paul</div></td><td><div class='box fdr-3'>Kusuri</div></td><td><div class='box fdr-3'>凯文</div></td><td><div class='box fdr-2'>纪导</div></td><td class='avg-col'>3.25</td></tr>
<tr><td class='t-name'>酸男</td><td><div class='box fdr-5'>Kimi</div></td><td><div class='box fdr-4'>弗老大</div></td><td><div class='box fdr-1'>柯南</div></td><td><div class='box fdr-4'>AI</div></td><td class='avg-col'>3.5</td></tr>
<tr><td class='t-name'>凯文</td><td><div class='box fdr-5'>大吉鲁</div></td><td><div class='box fdr-3'>鬼嗨</div></td><td><div class='box fdr-1'>老姜</div></td><td><div class='box fdr-5'>笨笨</div></td><td class='avg-col'>3.5</td></tr>
<tr><td class='t-name'>柯南</td><td><div class='box fdr-4'>弗老大</div></td><td><div class='box fdr-4'>AI</div></td><td><div class='box fdr-4'>酸男</div></td><td><div class='box fdr-2'>阿甘</div></td><td class='avg-col'>3.5</td></tr>"""

# ==================== 页面 ====================

@app.get("/", response_class=HTMLResponse)
def index():
    return f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NBA Fantasy H2H | {CACHE.current_event_name or "GW22"}</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        
        body {{
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background: #ffffff;
            color: #1a1a1a;
            line-height: 1.5;
        }}
        
        .header {{
            background: #fff;
            border-bottom: 1px solid #e0e0e0;
            padding: 16px 32px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            position: sticky;
            top: 0;
            z-index: 100;
        }}
        
        .brand h1 {{
            font-size: 20px;
            font-weight: 800;
            color: #1a1a1a;
        }}
        
        .brand span {{
            font-size: 13px;
            color: #999;
            margin-left: 12px;
        }}
        
        .controls {{
            display: flex;
            align-items: center;
            gap: 12px;
        }}
        
        .status {{
            font-size: 12px;
            color: #888;
            display: flex;
            align-items: center;
            gap: 6px;
        }}
        
        .pulse {{
            width: 6px;
            height: 6px;
            background: #00c853;
            border-radius: 50%;
            animation: pulse 2s infinite;
        }}
        
        @keyframes pulse {{
            0%, 100% {{ opacity: 1; }}
            50% {{ opacity: 0.4; }}
        }}
        
        .btn {{
            padding: 6px 14px;
            border: 1px solid #ddd;
            background: #fff;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 600;
            color: #555;
            cursor: pointer;
            transition: all 0.2s;
        }}
        
        .btn:hover {{
            background: #f5f5f5;
            border-color: #ccc;
        }}
        
        .btn:disabled {{
            opacity: 0.6;
            cursor: not-allowed;
        }}
        
        .container {{
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 24px;
            padding: 24px 32px;
            max-width: 1400px;
            margin: 0 auto;
        }}
        
        .column {{
            background: #fff;
            border-radius: 12px;
            border: 1px solid #f0f0f0;
            padding: 20px;
            min-height: 700px;
        }}
        
        .col-header {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
            padding-bottom: 12px;
            border-bottom: 1px solid #f5f5f5;
        }}
        
        .col-title {{
            font-size: 14px;
            font-weight: 800;
            color: #1a1a1a;
        }}
        
        .col-badge {{
            font-size: 11px;
            padding: 3px 8px;
            background: #f5f5f5;
            color: #666;
            border-radius: 12px;
            font-weight: 700;
        }}
        
        .game-list {{
            display: flex;
            flex-direction: column;
            gap: 10px;
        }}
        
        .game-item {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 14px 12px;
            border-radius: 8px;
            border: 1px solid #f5f5f5;
            background: #fafafa;
            transition: all 0.2s;
            cursor: pointer;
        }}
        
        .game-item:hover {{
            background: #f0f0f0;
            transform: translateX(3px);
            border-color: #e0e0e0;
        }}
        
        .game-teams {{
            flex: 1;
        }}
        
        .game-row {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin: 2px 0;
        }}
        
        .game-team {{
            font-size: 13px;
            font-weight: 600;
            color: #333;
        }}
        
        .game-score {{
            font-size: 14px;
            font-weight: 700;
            font-variant-numeric: tabular-nums;
        }}
        
        .game-score.winning {{
            color: #00c853;
        }}
        
        .game-score.losing {{
            color: #ff1744;
        }}
        
        .game-meta {{
            text-align: right;
            min-width: 50px;
        }}
        
        .game-time {{
            font-size: 13px;
            font-weight: 700;
            color: #1a1a1a;
        }}
        
        .game-status {{
            font-size: 10px;
            color: #888;
            margin-top: 2px;
        }}
        
        .h2h-list {{
            display: flex;
            flex-direction: column;
            gap: 16px;
        }}
        
        .match-card {{
            display: flex;
            height: 100px;
            border-radius: 12px;
            border: 2px solid #e8e8e8;
            overflow: hidden;
            background: #fff;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }}
        
        .match-card:hover {{
            transform: scale(1.02);
            box-shadow: 0 8px 24px rgba(0,0,0,0.12);
            border-color: #d0d0d0;
            z-index: 10;
        }}
        
        .team-side {{
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            padding: 12px;
            position: relative;
            gap: 6px;
        }}
        
        .team-side.winning {{
            border-left: 4px solid #00c853;
        }}
        
        .team-side.losing {{
            border-left: 4px solid #ff1744;
        }}
        
        .team-side:last-child.winning {{
            border-right: 4px solid #00c853;
            border-left: none;
        }}
        
        .team-side:last-child.losing {{
            border-right: 4px solid #ff1744;
            border-left: none;
        }}
        
        .team-name {{
            font-size: 14px;
            font-weight: 700;
            color: #444;
        }}
        
        .score-main {{
            font-size: 36px;
            font-weight: 900;
            font-variant-numeric: tabular-nums;
            color: #1a1a1a;
            line-height: 1;
        }}
        
        .score-main.winning {{
            color: #00c853;
        }}
        
        .score-main.losing {{
            color: #ff1744;
        }}
        
        .score-sub {{
            font-size: 12px;
            color: #888;
            font-weight: 600;
            background: #f5f5f5;
            padding: 2px 8px;
            border-radius: 10px;
        }}
        
        .vs-divider {{
            width: 50px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            color: #ccc;
            font-weight: 800;
            background: #f8f8f8;
            border-left: 1px solid #f0f0f0;
            border-right: 1px solid #f0f0f0;
        }}
        
        .fdr-table {{
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            font-size: 11px;
        }}
        
        .fdr-table th {{
            font-size: 10px;
            color: #bbb;
            font-weight: 500;
            padding: 8px 2px;
            text-align: center;
            border-bottom: 1px solid #f0f0f0;
        }}
        
        .fdr-table td {{
            padding: 2px;
            text-align: center;
        }}
        
        .fdr-table .t-name {{
            text-align: left;
            font-size: 12px;
            font-weight: 700;
            color: #242424;
            width: 70px;
            padding-left: 0;
        }}
        
        .fdr-table .avg-col {{
            font-size: 11px;
            font-weight: 800;
            color: #666;
            text-align: right;
            padding-right: 0;
        }}
        
        .box {{
            height: 28px;
            border-radius: 4px;
            display: flex;
            justify-content: center;
            align-items: center;
            font-size: 10px;
            font-weight: 700;
            color: white;
        }}
        
        .fdr-1 {{ background: #02894e; }}
        .fdr-2 {{ background: #00ff85; color: #242424; }}
        .fdr-3 {{ background: #ebebeb; color: #444; }}
        .fdr-4 {{ background: #ff003c; }}
        .fdr-5 {{ background: #6b001a; }}
        
        .modal-overlay {{
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.6);
            z-index: 1000;
            justify-content: center;
            align-items: center;
            backdrop-filter: blur(4px);
        }}
        
        .modal-overlay.active {{
            display: flex;
        }}
        
        .modal {{
            background: white;
            border-radius: 16px;
            width: 90%;
            max-width: 900px;
            max-height: 85vh;
            overflow: hidden;
            box-shadow: 0 25px 50px rgba(0,0,0,0.25);
        }}
        
        .modal-header {{
            padding: 20px 24px;
            background: linear-gradient(135deg, #1a1a1a 0%, #333 100%);
            color: white;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }}
        
        .modal-title {{
            font-size: 18px;
            font-weight: 800;
        }}
        
        .modal-close {{
            width: 32px;
            height: 32px;
            border: none;
            background: rgba(255,255,255,0.2);
            border-radius: 50%;
            cursor: pointer;
            font-size: 18px;
            color: white;
        }}
        
        .modal-close:hover {{
            background: rgba(255,255,255,0.3);
            transform: rotate(90deg);
        }}
        
        .modal-body {{
            padding: 20px;
            max-height: 65vh;
            overflow-y: auto;
            background: #f8f9fa;
        }}
        
        .game-detail-container {{
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }}
        
        .team-section h3 {{
            font-size: 16px;
            font-weight: 800;
            color: #1a1a1a;
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 2px solid #e0e0e0;
        }}
        
        .stats-table {{
            width: 100%;
            border-collapse: collapse;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }}
        
        .stats-table th {{
            background: #f5f5f5;
            padding: 10px 8px;
            font-size: 11px;
            font-weight: 700;
            color: #666;
            text-align: center;
        }}
        
        .stats-table td {{
            padding: 10px 8px;
            font-size: 12px;
            text-align: center;
            border-bottom: 1px solid #f5f5f5;
        }}
        
        .stats-table tr:hover {{
            background: #fafafa;
        }}
        
        .stats-table .player-name {{
            text-align: left;
            font-weight: 700;
            color: #1a1a1a;
        }}
        
        .stats-table .fantasy-score {{
            font-weight: 900;
            color: #00c853;
            font-size: 14px;
        }}
        
        .lineup-container {{
            display: flex;
            flex-direction: column;
            gap: 16px;
        }}
        
        .lineup-section h4 {{
            font-size: 14px;
            font-weight: 800;
            color: #666;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            gap: 8px;
        }}
        
        .lineup-section.starters h4 {{
            color: #00c853;
        }}
        
        .lineup-section.bench h4 {{
            color: #888;
        }}
        
        .player-card {{
            display: flex;
            align-items: center;
            background: white;
            border-radius: 10px;
            padding: 12px 16px;
            box-shadow: 0 2px 6px rgba(0,0,0,0.04);
            border: 2px solid transparent;
            transition: all 0.2s;
        }}
        
        .player-card:hover {{
            transform: translateX(4px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }}
        
        .player-card.effective {{
            border-color: #00c853;
            background: linear-gradient(135deg, #fff 0%, #f0fff4 100%);
        }}
        
        .player-card.ineffective {{
            opacity: 0.6;
        }}
        
        .pos-badge {{
            width: 32px;
            height: 32px;
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            font-weight: 900;
            color: white;
            margin-right: 12px;
        }}
        
        .pos-BC {{ background: #1e88e5; }}
        .pos-FC {{ background: #e53935; }}
        
        .player-info {{
            flex: 1;
        }}
        
        .player-name-row {{
            display: flex;
            align-items: center;
            gap: 6px;
        }}
        
        .player-name {{
            font-size: 15px;
            font-weight: 700;
            color: #1a1a1a;
        }}
        
        .captain-badge {{
            font-size: 10px;
            padding: 2px 6px;
            background: #ffd700;
            color: #333;
            border-radius: 4px;
            font-weight: 800;
        }}
        
        .player-stats {{
            font-size: 12px;
            color: #888;
            margin-top: 2px;
        }}
        
        .player-score {{
            text-align: right;
        }}
        
        .score-final {{
            font-size: 20px;
            font-weight: 900;
            color: #1a1a1a;
        }}
        
        .score-base {{
            font-size: 11px;
            color: #999;
        }}
        
        .formation-info {{
            background: #e8f5e9;
            padding: 12px 16px;
            border-radius: 8px;
            margin-bottom: 16px;
            font-size: 13px;
            color: #2e7d32;
            font-weight: 600;
        }}
        
        .loading {{
            text-align: center;
            padding: 40px;
            color: #999;
        }}
        
        .spinner {{
            width: 40px;
            height: 40px;
            border: 4px solid #f0f0f0;
            border-top-color: #1a1a1a;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 12px;
        }}
        
        @keyframes spin {{
            to {{ transform: rotate(360deg); }}
        }}
        
        @media (max-width: 1200px) {{
            .container {{
                grid-template-columns: 1fr;
                padding: 16px;
            }}
            .game-detail-container {{
                grid-template-columns: 1fr;
            }}
        }}
    </style>
</head>
<body>
    <div class="header">
        <div class="brand">
            <h1>NBA Fantasy H2H</h1>
            <span id="event-info">{CACHE.current_event_name or "GW22"} • League #{LEAGUE_ID}</span>
        </div>
        <div class="controls">
            <div class="status">
                <span class="pulse"></span>
                <span id="update-time">加载中...</span>
            </div>
            <button class="btn" onclick="manualRefresh()" id="refresh-btn">🔄 刷新数据</button>
        </div>
    </div>

    <div class="container">
        <div class="column">
            <div class="col-header">
                <div class="col-title">🏀 今日赛程</div>
                <span class="col-badge" id="game-count">-</span>
            </div>
            <div class="game-list" id="game-list">
                <div class="loading"><div class="spinner"></div>加载中...</div>
            </div>
        </div>

        <div class="column">
            <div class="col-header">
                <div class="col-title">⚔️ 实时对阵</div>
                <span class="col-badge" id="match-count">-</span>
            </div>
            <div class="h2h-list" id="h2h-list">
                <div class="loading"><div class="spinner"></div>加载中...</div>
            </div>
        </div>

        <div class="column">
            <div class="col-header">
                <div class="col-title">📊 FDR 赛程排行</div>
                <span class="col-badge">GW22-25</span>
            </div>
            <table class="fdr-table">
                <thead>
                    <tr>
                        <th class="t-name">TEAM</th>
                        <th>22</th><th>23</th><th>24</th><th>25</th>
                        <th class="avg-col">AVG</th>
                    </tr>
                </thead>
                <tbody>{FDR_HTML}</tbody>
            </table>
        </div>
    </div>

    <div class="modal-overlay" id="lineup-modal" onclick="closeModal(event, 'lineup-modal')">
        <div class="modal" onclick="event.stopPropagation()">
            <div class="modal-header">
                <div class="modal-title" id="lineup-title">阵容详情</div>
                <button class="modal-close" onclick="closeModal(null, 'lineup-modal')">×</button>
            </div>
            <div class="modal-body" id="lineup-body">
                <div class="loading"><div class="spinner"></div>加载中...</div>
            </div>
        </div>
    </div>

    <div class="modal-overlay" id="game-modal" onclick="closeModal(event, 'game-modal')">
        <div class="modal" onclick="event.stopPropagation()" style="max-width: 1000px;">
            <div class="modal-header">
                <div class="modal-title" id="game-title">比赛详情</div>
                <button class="modal-close" onclick="closeModal(null, 'game-modal')">×</button>
            </div>
            <div class="modal-body" id="game-body">
                <div class="loading"><div class="spinner"></div>加载中...</div>
            </div>
        </div>
    </div>

    <script>
        const POSITION_NAME = {{1: 'BC', 2: 'FC'}};
        let currentEventName = "{CACHE.current_event_name or 'GW22'}";
        
        document.addEventListener('DOMContentLoaded', () => {{
            loadAll();
        }});
        
        async function loadAll() {{
            await Promise.all([loadGames(), loadH2H()]);
            updateTime();
        }}
        
        function updateTime() {{
            const now = new Date();
            document.getElementById('update-time').textContent = 
                now.toLocaleTimeString('zh-CN', {{hour:'2-digit', minute:'2-digit', second:'2-digit'}});
        }}
        
        async function manualRefresh() {{
            const btn = document.getElementById('refresh-btn');
            btn.disabled = true;
            btn.textContent = '⏳ 刷新中...';
            
            try {{
                const res = await fetch('/api/refresh', {{method: 'POST'}});
                const data = await res.json();
                if(data.success) {{
                    // 更新event信息显示
                    if(data.current_event_name) {{
                        document.getElementById('event-info').textContent = 
                            `${{data.current_event_name}} • League #1653`;
                    }}
                    await loadAll();
                }}
            }} catch(e) {{
                console.error(e);
            }} finally {{
                btn.disabled = false;
                btn.textContent = '🔄 刷新数据';
            }}
        }}
        
        async function loadGames() {{
            try {{
                const res = await fetch('/api/fixtures');
                const data = await res.json();
                document.getElementById('game-count').textContent = data.count + '场';
                
                // 更新event名称显示
                if(data.event_name) {{
                    document.getElementById('event-info').textContent = 
                        `${{data.event_name}} • League #1653`;
                }}
                
                if(data.count === 0) {{
                    document.getElementById('game-list').innerHTML = 
                        '<div style="text-align:center;padding:40px;color:#999;">暂无比赛</div>';
                    return;
                }}
                
                const html = data.games.map(g => {{
                    const isLive = g.started && !g.finished;
                    const status = isLive ? '进行中' : (g.finished ? '已结束' : '未开始');
                    const homeClass = g.home_score > g.away_score ? 'winning' : (g.home_score < g.away_score ? 'losing' : '');
                    const awayClass = g.away_score > g.home_score ? 'winning' : (g.away_score < g.home_score ? 'losing' : '');
                    
                    return `
                        <div class="game-item" onclick="showGameDetail(${{g.id}})">
                            <div class="game-teams">
                                <div class="game-row">
                                    <span class="game-team">${{g.home_team}}</span>
                                    <span class="game-score ${{homeClass}}">${{g.home_score}}</span>
                                </div>
                                <div class="game-row">
                                    <span class="game-team">${{g.away_team}}</span>
                                    <span class="game-score ${{awayClass}}">${{g.away_score}}</span>
                                </div>
                            </div>
                            <div class="game-meta">
                                <div class="game-time">${{g.kickoff}}</div>
                                <div class="game-status">${{status}}</div>
                            </div>
                        </div>
                    `;
                }}).join('');
                
                document.getElementById('game-list').innerHTML = html;
            }} catch(e) {{
                console.error('Games error:', e);
            }}
        }}
        
        async function loadH2H() {{
            try {{
                const res = await fetch('/api/h2h');
                const data = await res.json();
                document.getElementById('match-count').textContent = data.length + '场';
                
                const html = data.map(m => {{
                    const isT1Win = m.total1 > m.total2;
                    const isDraw = m.total1 === m.total2;
                    const leftClass = isDraw ? '' : (isT1Win ? 'winning' : 'losing');
                    const rightClass = isDraw ? '' : (isT1Win ? 'losing' : 'winning');
                    const s1Class = isDraw ? '' : (isT1Win ? 'winning' : 'losing');
                    const s2Class = isDraw ? '' : (isT1Win ? 'losing' : 'winning');
                    
                    return `
                        <div class="match-card" onclick="showLineup(${{m.uid1}}, '${{m.t1}}')">
                            <div class="team-side ${{leftClass}}">
                                <div class="team-name">${{m.t1}}</div>
                                <div class="score-main ${{s1Class}}">${{m.total1}}</div>
                                <div class="score-sub">今日 ${{m.today1}}</div>
                            </div>
                            <div class="vs-divider">VS</div>
                            <div class="team-side ${{rightClass}}" onclick="event.stopPropagation(); showLineup(${{m.uid2}}, '${{m.t2}}')">
                                <div class="team-name">${{m.t2}}</div>
                                <div class="score-main ${{s2Class}}">${{m.total2}}</div>
                                <div class="score-sub">今日 ${{m.today2}}</div>
                            </div>
                        </div>
                    `;
                }}).join('');
                
                document.getElementById('h2h-list').innerHTML = html;
            }} catch(e) {{
                console.error('H2H error:', e);
            }}
        }}
        
        async function showGameDetail(fixtureId) {{
            document.getElementById('game-modal').classList.add('active');
            document.getElementById('game-body').innerHTML = '<div class="loading"><div class="spinner"></div>加载中...</div>';
            
            try {{
                const res = await fetch(`/api/fixture/${{fixtureId}}`);
                const data = await res.json();
                
                if(!data.home_players) {{
                    document.getElementById('game-body').innerHTML = '<div style="text-align:center;padding:20px;">暂无数据</div>';
                    return;
                }}
                
                document.getElementById('game-title').textContent = `${{data.away_team}} @ ${{data.home_team}}`;
                
                const createTable = (players, teamName) => {{
                    const rows = players.map(p => `
                        <tr>
                            <td class="player-name">${{p.name}}</td>
                            <td>${{p.position_name}}</td>
                            <td>${{p.points}}</td>
                            <td>${{p.rebounds}}</td>
                            <td>${{p.assists}}</td>
                            <td>${{p.steals}}</td>
                            <td>${{p.blocks}}</td>
                            <td class="fantasy-score">${{p.fantasy}}</td>
                        </tr>
                    `).join('');
                    
                    return `
                        <div class="team-section">
                            <h3>${{teamName}}</h3>
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
                                <tbody>${{rows}}</tbody>
                            </table>
                        </div>
                    `;
                }};
                
                document.getElementById('game-body').innerHTML = `
                    <div class="game-detail-container">
                        ${{createTable(data.away_players, data.away_team)}}
                        ${{createTable(data.home_players, data.home_team)}}
                    </div>
                `;
            }} catch(e) {{
                console.error(e);
                document.getElementById('game-body').innerHTML = '<div style="text-align:center;padding:20px;">加载失败</div>';
            }}
        }}
        
        async function showLineup(uid, name) {{
            document.getElementById('lineup-modal').classList.add('active');
            document.getElementById('lineup-title').textContent = name + ' 的阵容';
            document.getElementById('lineup-body').innerHTML = '<div class="loading"><div class="spinner"></div>加载中...</div>';
            
            try {{
                const res = await fetch(`/api/picks/${{uid}}`);
                const data = await res.json();
                
                if(!data.players || data.players.length === 0) {{
                    document.getElementById('lineup-body').innerHTML = '<div style="text-align:center;padding:20px;">暂无数据</div>';
                    return;
                }}
                
                const starters = data.players.filter(p => p.lineup_position <= 5);
                const bench = data.players.filter(p => p.lineup_position > 5);
                
                const createPlayerCard = (p) => {{
                    const isCaptain = p.is_captain && p.multiplier > 1;
                    const badge = isCaptain ? '<span class="captain-badge">C</span>' : '';
                    const posClass = p.position_name === 'BC' ? 'pos-BC' : 'pos-FC';
                    const effectiveClass = p.is_effective ? 'effective' : 'ineffective';
                    const baseDisplay = isCaptain ? `${{p.base_points}}×${{p.multiplier}}` : `${{p.base_points}}`;
                    
                    return `
                        <div class="player-card ${{effectiveClass}}">
                            <div class="pos-badge ${{posClass}}">${{p.position_name}}</div>
                            <div class="player-info">
                                <div class="player-name-row">
                                    <div class="player-name">${{p.name}}</div>
                                    ${{badge}}
                                </div>
                                <div class="player-stats">
                                    ${{p.stats.points}}分 ${{p.stats.rebounds}}板 ${{p.stats.assists}}助 
                                    ${{p.stats.steals}}断 ${{p.stats.blocks}}帽
                                </div>
                            </div>
                            <div class="player-score">
                                <div class="score-final">${{p.final_points}}</div>
                            </div>
                        </div>
                    `;
                }};
                
                document.getElementById('lineup-body').innerHTML = `
                    <div class="lineup-container">
                        <div class="lineup-section starters">
                            <h4>⭐ 首发</h4>
                            ${{starters.map(createPlayerCard).join('')}}
                        </div>
                        <div class="lineup-section bench">
                            <h4>🪑 替补</h4>
                            ${{bench.map(createPlayerCard).join('')}}
                        </div>
                    </div>
                `;
            }} catch(e) {{
                console.error(e);
                document.getElementById('lineup-body').innerHTML = '<div style="text-align:center;padding:20px;">加载失败</div>';
            }}
        }}
        
        function closeModal(e, modalId) {{
            if(e && e.target !== e.currentTarget) return;
            document.getElementById(modalId).classList.remove('active');
        }}
        
        document.addEventListener('keydown', e => {{
            if(e.key === 'Escape') {{
                document.getElementById('lineup-modal').classList.remove('active');
                document.getElementById('game-modal').classList.remove('active');
            }}
        }});
    </script>
</body>
</html>"""

if __name__ == "__main__":
    print("🚀 NBA Fantasy H2H Dashboard")
    print("📊 Loading...")
    uvicorn.run(app, host="127.0.0.1", port=8000)


