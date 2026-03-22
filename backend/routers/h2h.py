"""
H2H 对阵路由
"""

import re
from fastapi import APIRouter
from typing import List, Optional, Tuple

from backend.cache import CACHE
from backend.config import NAME_TO_UID

router = APIRouter(prefix="/api", tags=["h2h"])


# (gameweek, team1, team2)
ALL_FIXTURES = [
    (22, "AI", "纪导"),
    (22, "弗老大", "柯南"),
    (22, "凯文", "大吉鲁"),
    (22, "Kimi", "酸男"),
    (22, "kusuri", "鬼嗨"),
    (22, "马哥", "阿甘"),
    (22, "Paul", "老姜"),
    (22, "桑迪", "紫葱酱"),
    (22, "伍家辉", "笨笨"),
    (22, "堡", "班班"),
    (22, "小火龙", "橘队"),
    (22, "尼弟", "文史哲"),
    (22, "雕哥", "船哥"),
    (23, "AI", "柯南"),
    (23, "文史哲", "大吉鲁"),
    (23, "弗老大", "酸男"),
    (23, "凯文", "鬼嗨"),
    (23, "Kimi", "阿甘"),
    (23, "kusuri", "老姜"),
    (23, "马哥", "紫葱酱"),
    (23, "Paul", "笨笨"),
    (23, "桑迪", "班班"),
    (23, "伍家辉", "橘队"),
    (23, "堡", "文史哲"),
    (23, "小火龙", "船哥"),
    (23, "尼弟", "雕哥"),
    (24, "AI", "大吉鲁"),
    (24, "柯南", "酸男"),
    (24, "文史哲", "鬼嗨"),
    (24, "弗老大", "阿甘"),
    (24, "凯文", "老姜"),
    (24, "Kimi", "紫葱酱"),
    (24, "kusuri", "笨笨"),
    (24, "马哥", "班班"),
    (24, "Paul", "橘队"),
    (24, "桑迪", "文史哲"),
    (24, "伍家辉", "船哥"),
    (24, "堡", "雕哥"),
    (24, "小火龙", "尼弟"),
    (25, "AI", "酸男"),
    (25, "大吉鲁", "鬼嗨"),
    (25, "柯南", "阿甘"),
    (25, "文史哲", "老姜"),
    (25, "弗老大", "紫葱酱"),
    (25, "凯文", "笨笨"),
    (25, "Kimi", "班班"),
    (25, "kusuri", "橘队"),
    (25, "马哥", "文史哲"),
    (25, "Paul", "船哥"),
    (25, "桑迪", "雕哥"),
    (25, "伍家辉", "尼弟"),
    (25, "堡", "小火龙"),
]


def _extract_gameweek(event_name: str, event_id: int) -> Optional[int]:
    """从 event_name (如 GW22.1) 或 event_id 提取 gameweek"""
    if event_name:
        match = re.search(r"(\d+)", str(event_name))
        if match:
            try:
                return int(match.group(1))
            except ValueError:
                pass

    if isinstance(event_id, int) and event_id <= 100:
        return event_id
    return None


def _fixtures_for_current_week() -> Tuple[int, List[Tuple[str, str]]]:
    weeks = sorted({gw for gw, _, _ in ALL_FIXTURES})
    fallback_week = weeks[0] if weeks else 0
    current_week = _extract_gameweek(CACHE.current_event_name, CACHE.current_event) or fallback_week
    weekly_fixtures = [(t1, t2) for gw, t1, t2 in ALL_FIXTURES if gw == current_week]
    return current_week, weekly_fixtures


@router.get("/h2h")
def get_h2h() -> List[dict]:
    """获取 H2H 对阵数据（自动按当前 gameweek 切换）"""
    current_week, weekly_fixtures = _fixtures_for_current_week()

    results = []
    for t1, t2 in weekly_fixtures:
        uid1 = NAME_TO_UID.get(t1)
        uid2 = NAME_TO_UID.get(t2)

        s1 = CACHE.standings.get(uid1, {'total': 0, 'today_live': 0})
        s2 = CACHE.standings.get(uid2, {'total': 0, 'today_live': 0})

        results.append({
            "gameweek": current_week,
            "t1": t1,
            "t2": t2,
            "uid1": uid1,
            "uid2": uid2,
            "total1": s1['total'],
            "total2": s2['total'],
            "today1": s1['today_live'],
            "today2": s2['today_live'],
            "raw_today1": s1.get('raw_today_live', s1['today_live']),
            "raw_today2": s2.get('raw_today_live', s2['today_live']),
            "penalty1": s1.get('penalty_score', 0),
            "penalty2": s2.get('penalty_score', 0),
            "transfer_count1": s1.get('transfer_count', 0),
            "transfer_count2": s2.get('transfer_count', 0),
            "wildcard1": s1.get('wildcard_active', False),
            "wildcard2": s2.get('wildcard_active', False),
        })
    return results
