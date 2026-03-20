"""
数据模型定义

AI修改指引：
- 添加新字段: 在对应模型中添加字段
- 添加新模型: 创建新类继承BaseModel
"""

from typing import Dict, List, Optional, Any
from pydantic import BaseModel
from datetime import datetime


class PlayerStats(BaseModel):
    """球员统计数据"""
    points: int = 0
    rebounds: int = 0
    assists: int = 0
    steals: int = 0
    blocks: int = 0
    minutes: int = 0
    fantasy: int = 0


class Player(BaseModel):
    """球员信息"""
    id: int
    name: str
    team: int
    position: int
    position_name: str
    value: int = 0
    points_per_game: float = 0
    injury: Optional[str] = None  # 伤病信息，如 "Toe" 或 None


class Pick(BaseModel):
    """用户阵容选择"""
    element_id: int
    name: str
    position_type: int
    position_name: str
    lineup_position: int
    is_captain: bool
    is_vice: bool
    multiplier: int
    base_points: int
    final_points: int
    stats: PlayerStats
    is_effective: bool = False
    injury: Optional[str] = None  # 伤病信息，用于前端展示


class Standing(BaseModel):
    """联赛排名数据"""
    total: int = 0
    today_live: int = 0
    picks: List[Pick] = []


class Game(BaseModel):
    """比赛信息"""
    id: int
    home_team: str
    away_team: str
    home_score: int = 0
    away_score: int = 0
    started: bool = False
    finished: bool = False
    kickoff: str = "--:--"


class FixtureDetail(BaseModel):
    """比赛详情"""
    home_team: str
    away_team: str
    home_players: List[dict] = []
    away_players: List[dict] = []


class H2HMatch(BaseModel):
    """H2H 对阵信息"""
    t1: str
    t2: str
    uid1: int
    uid2: int
    total1: int = 0
    total2: int = 0
    today1: int = 0
    today2: int = 0


class HealthStatus(BaseModel):
    """健康检查状态"""
    status: str
    last_update: Optional[str]
    current_event: int
    current_event_name: str
