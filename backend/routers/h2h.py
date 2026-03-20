"""
H2H 对阵路由

AI修改指引：
- 修改返回字段: 修改get_h2h函数
- 添加新接口: 添加新router
"""

from fastapi import APIRouter
from typing import List

from backend.cache import CACHE
from backend.config import FIXTURES_GW22, NAME_TO_UID, UID_MAP

router = APIRouter(prefix="/api", tags=["h2h"])


@router.get("/h2h")
def get_h2h() -> List[dict]:
    """获取H2H对阵数据"""
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
