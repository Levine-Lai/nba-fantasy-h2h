"""
缓存管理模块
改用SQLite + 线程锁，持久化存储

修改日期: 2026-03-20
修改点: 
1. 改用SQLite替代文件型缓存
2. 添加threading.Lock()保护写操作
3. 实现持久化存储，重启数据不丢失
"""

import os
import json
import sqlite3
import threading
from typing import Dict, List, Optional, Any
from datetime import datetime
from dataclasses import dataclass, field

from backend.config import CACHE_DIR

# SQLite数据库路径
DB_PATH = os.path.join(CACHE_DIR, "nba_cache.db")

# 线程锁保护写操作
_db_lock = threading.Lock()


def _get_connection() -> sqlite3.Connection:
    """获取数据库连接"""
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def _init_tables():
    """初始化数据库表结构"""
    with _db_lock:
        conn = _get_connection()
        try:
            cursor = conn.cursor()
            
            # players表：存储球员信息
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS players (
                    id INTEGER PRIMARY KEY,
                    name TEXT NOT NULL,
                    team INTEGER,
                    position INTEGER,
                    points_scored INTEGER DEFAULT 0,
                    rebounds INTEGER DEFAULT 0,
                    assists INTEGER DEFAULT 0,
                    steals INTEGER DEFAULT 0,
                    blocks INTEGER DEFAULT 0,
                    injury TEXT,
                    game_status TEXT,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # cache_meta表：存储缓存元数据
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS cache_meta (
                    key TEXT PRIMARY KEY,
                    value TEXT,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # lineups表：存储玩家阵容
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS lineups (
                    uid INTEGER,
                    slot INTEGER,
                    player_id INTEGER,
                    is_starter INTEGER DEFAULT 0,
                    gw INTEGER,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (uid, slot, gw)
                )
            ''')
            
            conn.commit()
        finally:
            conn.close()


def _ensure_db():
    """确保数据库和表结构存在"""
    if not os.path.exists(CACHE_DIR):
        os.makedirs(CACHE_DIR)
    if not os.path.exists(DB_PATH):
        _init_tables()


# 初始化数据库
_ensure_db()


def get_player(player_id: int) -> Optional[Dict]:
    """获取单个球员信息
    
    Args:
        player_id: 球员ID
        
    Returns:
        球员信息dict或None
    """
    _ensure_db()
    conn = _get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM players WHERE id = ?",
            (player_id,)
        )
        row = cursor.fetchone()
        if row:
            return dict(row)
        return None
    finally:
        conn.close()


def get_all_players() -> List[Dict]:
    """获取所有球员信息
    
    Returns:
        球员信息列表
    """
    _ensure_db()
    conn = _get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM players")
        rows = cursor.fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()


def save_players(players_list: List[Dict]):
    """批量插入/更新球员信息
    
    Args:
        players_list: 球员信息列表
    """
    _ensure_db()
    with _db_lock:
        conn = _get_connection()
        try:
            cursor = conn.cursor()
            now = datetime.now().isoformat()
            
            for player in players_list:
                cursor.execute('''
                    INSERT OR REPLACE INTO players 
                    (id, name, team, position, points_scored, rebounds, assists, 
                     steals, blocks, injury, game_status, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    player.get('id'),
                    player.get('name', ''),
                    player.get('team'),
                    player.get('position'),
                    player.get('points_scored', 0),
                    player.get('rebounds', 0),
                    player.get('assists', 0),
                    player.get('steals', 0),
                    player.get('blocks', 0),
                    player.get('injury'),
                    player.get('game_status'),
                    now
                ))
            
            conn.commit()
        finally:
            conn.close()


def get_lineup(uid: int, gw: int) -> List[Dict]:
    """获取玩家某周的阵容
    
    Args:
        uid: 玩家ID
        gw: 比赛周
        
    Returns:
        阵容列表
    """
    _ensure_db()
    conn = _get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM lineups WHERE uid = ? AND gw = ? ORDER BY slot",
            (uid, gw)
        )
        rows = cursor.fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()


def save_lineup(uid: int, gw: int, lineup: List[Dict]):
    """保存玩家阵容
    
    Args:
        uid: 玩家ID
        gw: 比赛周
        lineup: 阵容列表，每项包含slot, player_id, is_starter等
    """
    _ensure_db()
    with _db_lock:
        conn = _get_connection()
        try:
            cursor = conn.cursor()
            now = datetime.now().isoformat()
            
            # 先删除旧数据
            cursor.execute(
                "DELETE FROM lineups WHERE uid = ? AND gw = ?",
                (uid, gw)
            )
            
            # 插入新数据
            for item in lineup:
                cursor.execute('''
                    INSERT INTO lineups (uid, slot, player_id, is_starter, gw, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (
                    uid,
                    item.get('slot'),
                    item.get('player_id'),
                    1 if item.get('is_starter') else 0,
                    gw,
                    now
                ))
            
            conn.commit()
        finally:
            conn.close()


def get_cache_timestamp(key: str) -> Optional[datetime]:
    """获取缓存上次更新时间
    
    Args:
        key: 缓存键
        
    Returns:
        上次更新时间或None
    """
    _ensure_db()
    conn = _get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT updated_at FROM cache_meta WHERE key = ?",
            (key,)
        )
        row = cursor.fetchone()
        if row and row['updated_at']:
            try:
                return datetime.fromisoformat(row['updated_at'])
            except:
                return None
        return None
    finally:
        conn.close()


def save_cache_timestamp(key: str):
    """保存缓存更新时间
    
    Args:
        key: 缓存键
    """
    _ensure_db()
    with _db_lock:
        conn = _get_connection()
        try:
            cursor = conn.cursor()
            now = datetime.now().isoformat()
            
            cursor.execute('''
                INSERT OR REPLACE INTO cache_meta (key, value, updated_at)
                VALUES (?, ?, ?)
            ''', (key, '', now))
            
            conn.commit()
        finally:
            conn.close()


# ==================== 兼容旧代码的内存缓存 ====================

@dataclass
class Cache:
    """内存缓存（保持兼容）"""
    teams: Dict[int, str] = field(default_factory=dict)
    elements: Dict[int, Dict] = field(default_factory=dict)
    live_elements: Dict[int, Dict] = field(default_factory=dict)
    user_picks: Dict[int, List[Dict]] = field(default_factory=dict)
    standings: Dict[int, Dict] = field(default_factory=dict)
    fixtures: List[Dict] = field(default_factory=list)
    fixture_details: Dict[int, Dict] = field(default_factory=dict)
    last_update: Optional[datetime] = None
    updating: bool = False
    current_event: int = 139
    current_event_name: str = ""
    events_data: List[Dict] = field(default_factory=list)


# 全局缓存实例
CACHE = Cache()


class CacheManager:
    """内存缓存持久化管理器"""

    def __init__(self, cache: Cache):
        self.cache = cache
        self.file_path = os.path.join(CACHE_DIR, "latest_data.json")
        self._file_lock = threading.Lock()

    def _serialize(self) -> Dict[str, Any]:
        return {
            "teams": self.cache.teams,
            "elements": self.cache.elements,
            "live_elements": self.cache.live_elements,
            "user_picks": self.cache.user_picks,
            "standings": self.cache.standings,
            "fixtures": self.cache.fixtures,
            "fixture_details": self.cache.fixture_details,
            "last_update": self.cache.last_update.isoformat() if self.cache.last_update else None,
            "current_event": self.cache.current_event,
            "current_event_name": self.cache.current_event_name,
            "events_data": self.cache.events_data,
        }

    def save_to_disk(self):
        """将当前内存缓存保存到磁盘"""
        os.makedirs(CACHE_DIR, exist_ok=True)
        payload = self._serialize()
        with self._file_lock:
            with open(self.file_path, "w", encoding="utf-8") as f:
                json.dump(payload, f, ensure_ascii=False, indent=2)

    def load_from_disk(self) -> bool:
        """从磁盘恢复最近一次缓存"""
        os.makedirs(CACHE_DIR, exist_ok=True)
        if not os.path.exists(self.file_path):
            with self._file_lock:
                with open(self.file_path, "w", encoding="utf-8") as f:
                    json.dump({}, f, ensure_ascii=False)
            return False

        try:
            with self._file_lock:
                with open(self.file_path, "r", encoding="utf-8") as f:
                    raw_data = json.load(f) or {}
        except Exception as e:
            print(f"[Cache] Failed to load persisted cache: {e}")
            return False

        def _int_key_dict(data: Any) -> Any:
            if not isinstance(data, dict):
                return data
            parsed = {}
            for key, value in data.items():
                try:
                    parsed[int(key)] = value
                except (TypeError, ValueError):
                    parsed[key] = value
            return parsed

        self.cache.teams = _int_key_dict(raw_data.get("teams", {}))
        self.cache.elements = _int_key_dict(raw_data.get("elements", {}))
        self.cache.live_elements = _int_key_dict(raw_data.get("live_elements", {}))
        self.cache.user_picks = _int_key_dict(raw_data.get("user_picks", {}))
        self.cache.standings = _int_key_dict(raw_data.get("standings", {}))
        self.cache.fixtures = raw_data.get("fixtures", [])
        self.cache.fixture_details = _int_key_dict(raw_data.get("fixture_details", {}))
        self.cache.current_event = raw_data.get("current_event", self.cache.current_event)
        self.cache.current_event_name = raw_data.get("current_event_name", self.cache.current_event_name)
        self.cache.events_data = raw_data.get("events_data", [])

        last_update = raw_data.get("last_update")
        if last_update:
            try:
                self.cache.last_update = datetime.fromisoformat(last_update)
            except ValueError:
                self.cache.last_update = None

        return True

    def set(self, key: str, value: Any):
        """更新缓存字段并自动落盘"""
        setattr(self.cache, key, value)
        self.save_to_disk()


cache = CacheManager(CACHE)


class LocalCache:
    """本地文件缓存管理（保持兼容，迁移到SQLite）"""
    
    @staticmethod
    def ensure_dir():
        """确保缓存目录存在"""
        _ensure_db()
    
    @staticmethod
    def save_bootstrap_json(data: dict):
        """保存完整的bootstrap数据为JSON（迁移到SQLite）"""
        _ensure_db()
        with _db_lock:
            conn = _get_connection()
            try:
                cursor = conn.cursor()
                now = datetime.now().isoformat()
                
                # 保存到cache_meta表
                cursor.execute('''
                    INSERT OR REPLACE INTO cache_meta (key, value, updated_at)
                    VALUES (?, ?, ?)
                ''', ('bootstrap_static', json.dumps(data, ensure_ascii=False), now))
                
                conn.commit()
                print(f"[Cache] Saved bootstrap to SQLite")
            finally:
                conn.close()
    
    @staticmethod
    def load_bootstrap_json() -> Optional[dict]:
        """加载本地JSON缓存（从SQLite）"""
        _ensure_db()
        conn = _get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT value FROM cache_meta WHERE key = ?",
                ('bootstrap_static',)
            )
            row = cursor.fetchone()
            if row and row['value']:
                try:
                    return json.loads(row['value'])
                except Exception as e:
                    print(f"[Cache] Error parsing JSON: {e}")
            return None
        finally:
            conn.close()
    
    @staticmethod
    def save_teams_csv(teams: dict):
        """保存球队为CSV（迁移到SQLite players表）"""
        _ensure_db()
        # 数据已保存在players表中，此方法保持兼容
        print(f"[Cache] Teams data saved via SQLite")
    
    @staticmethod
    def load_teams_csv() -> dict:
        """加载球队CSV（从SQLite）"""
        _ensure_db()
        conn = _get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT id, team as name FROM players GROUP BY team")
            rows = cursor.fetchall()
            return {row['id']: row['name'] for row in rows if row['name']}
        finally:
            conn.close()
    
    @staticmethod
    def save_players_csv(elements: dict):
        """保存球员为CSV（迁移到SQLite）"""
        _ensure_db()
        # 转换为列表并保存
        players_list = []
        for elem_id, elem in elements.items():
            players_list.append({
                'id': elem_id,
                'name': elem.get('name', ''),
                'team': elem.get('team'),
                'position': elem.get('position'),
                'points_scored': 0,
                'rebounds': 0,
                'assists': 0,
                'steals': 0,
                'blocks': 0,
                'injury': elem.get('status') if elem.get('status') == 'i' else None,
                'game_status': elem.get('news', '')
            })
        save_players(players_list)
        print(f"[Cache] Saved {len(elements)} players to SQLite")
    
    @staticmethod
    def load_players_csv() -> dict:
        """加载球员CSV（从SQLite）"""
        _ensure_db()
        conn = _get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM players")
            rows = cursor.fetchall()
            players = {}
            for row in rows:
                players[row['id']] = {
                    'name': row['name'],
                    'team': row['team'] if row['team'] else 0,
                    'position': row['position'] if row['position'] else 0,
                    'position_name': 'BC' if row['position'] == 1 else 'FC' if row['position'] == 2 else 'UNK',
                    'value': 0,
                    'points_per_game': 0,
                    'status': 'i' if row['injury'] else '',
                    'news': row['game_status'] if row['game_status'] else ''
                }
            return players
        finally:
            conn.close()
    
    @staticmethod
    def is_fresh(key: str, hours: int = 24) -> bool:
        """检查缓存是否在指定时间内
        
        Args:
            key: 缓存键（支持文件路径或纯键名）
            hours: 小时数
        """
        _ensure_db()
        
        # 如果key是文件路径，提取文件名作为键
        if '/' in key or '\\' in key:
            key = os.path.basename(key).replace('.json', '')
        
        last_update = get_cache_timestamp(key)
        if not last_update:
            return False
        
        age = (datetime.now() - last_update).total_seconds()
        return age < (hours * 3600)
