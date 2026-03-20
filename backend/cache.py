"""
缓存管理模块
包含内存缓存和本地文件缓存

AI修改指引：
- 修改缓存时间: 修改is_fresh中的hours参数
- 添加新缓存类型: 参照现有方法添加
"""

import os
import json
import csv
from typing import Dict, List, Optional, Any
from datetime import datetime
from dataclasses import dataclass, field

from backend.config import CACHE_DIR, STATIC_JSON, TEAMS_CSV, PLAYERS_CSV


@dataclass
class Cache:
    """内存缓存"""
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


class LocalCache:
    """本地文件缓存管理"""
    
    @staticmethod
    def ensure_dir():
        """确保缓存目录存在"""
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
