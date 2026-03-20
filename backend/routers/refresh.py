"""
数据刷新路由

AI修改指引：
- 修改刷新逻辑: 修改manual_refresh函数
"""

from fastapi import APIRouter

from backend.cache import CACHE
from backend.data_service import update_all

router = APIRouter(prefix="/api", tags=["refresh"])


@router.post("/refresh")
async def manual_refresh():
    """手动刷新数据"""
    success = await update_all(force_static=False)
    return {
        "success": success,
        "current_event": CACHE.current_event,
        "current_event_name": CACHE.current_event_name
    }


@router.post("/refresh/static")
async def force_refresh_static():
    """强制刷新静态数据"""
    success = await update_all(force_static=True)
    return {
        "success": success,
        "current_event": CACHE.current_event,
        "current_event_name": CACHE.current_event_name
    }
