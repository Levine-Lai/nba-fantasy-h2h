"""
阵容路由

AI修改指引：
- 修改阵容数据处理: 修改get_picks函数
"""

from fastapi import APIRouter

from backend.cache import CACHE
from backend.config import UID_MAP
from backend.data_service import calculate_effective_score

router = APIRouter(prefix="/api", tags=["picks"])


@router.get("/picks/{uid}")
def get_picks(uid: int):
    """获取用户阵容"""
    picks = CACHE.user_picks.get(uid, [])
    standings = CACHE.standings.get(uid, {})
    
    if picks:
        effective_score, effective_players, formation = calculate_effective_score(picks)
        effective_ids = {p['element_id'] for p in effective_players}
        for pick in picks:
            pick['is_effective'] = pick['element_id'] in effective_ids
    else:
        formation = 'N/A'
    
    return {
        "uid": uid,
        "team_name": UID_MAP.get(uid, "Unknown"),
        "total_live": standings.get('today_live', 0),
        "raw_total_live": standings.get('raw_today_live', standings.get('today_live', 0)),
        "penalty_score": standings.get('penalty_score', 0),
        "transfer_count": standings.get('transfer_count', 0),
        "gd1_transfer_count": standings.get('gd1_transfer_count', 0),
        "gd1_missing_penalty": standings.get('gd1_missing_penalty', 0),
        "wildcard_active": standings.get('wildcard_active', False),
        "event_total": standings.get('total', 0),
        "formation": formation,
        "current_event": CACHE.current_event,
        "current_event_name": CACHE.current_event_name,
        "players": picks
    }
