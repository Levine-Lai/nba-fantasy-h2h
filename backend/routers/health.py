"""
健康检查路由

AI修改指引：
- 添加健康检查项: 在health函数中添加
"""

from fastapi import APIRouter

from backend.cache import CACHE

router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health")
def health():
    """健康检查接口"""
    return {
        "status": "ok",
        "last_update": CACHE.last_update.isoformat() if CACHE.last_update else None,
        "current_event": CACHE.current_event,
        "current_event_name": CACHE.current_event_name
    }
