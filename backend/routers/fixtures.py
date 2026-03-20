"""
赛程路由

AI修改指引：
- 修改比赛数据: 修改get_fixtures函数
- 修改详情数据: 修改get_fixture_detail函数
"""

from fastapi import APIRouter

from backend.cache import CACHE

router = APIRouter(prefix="/api", tags=["fixtures"])


@router.get("/fixtures")
def get_fixtures():
    """获取赛程列表"""
    return {
        "event": CACHE.current_event,
        "event_name": CACHE.current_event_name,
        "count": len(CACHE.fixtures),
        "games": CACHE.fixtures
    }


@router.get("/fixture/{fixture_id}")
def get_fixture_detail(fixture_id: int):
    """获取比赛详情"""
    return CACHE.fixture_details.get(fixture_id, {})
