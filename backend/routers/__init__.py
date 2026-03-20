"""API路由模块"""

from .health import router as health_router
from .h2h import router as h2h_router
from .fixtures import router as fixtures_router
from .picks import router as picks_router

__all__ = ['health_router', 'h2h_router', 'fixtures_router', 'picks_router']
