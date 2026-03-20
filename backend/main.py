"""
FastAPI 应用主入口

AI修改指引：
- 添加中间件: 在create_app函数中添加
- 添加新路由: 在create_app函数中注册
- 修改启动事件: 修改startup_event函数
"""

import asyncio
import logging
import httpx

# 设置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from backend.config import LEAGUE_ID, CACHE_DIR, FDR_HTML
from backend.cache import CACHE, LocalCache
from backend.api_client import load_static_data, update_static_data, update_live_data
from backend.api_client import update_fixtures
from backend.data_service import update_fixture_details, update_standings

# 导入路由
from backend.routers import health_router, h2h_router, fixtures_router, picks_router
from backend.routers.refresh import router as refresh_router


def create_app() -> FastAPI:
    """创建FastAPI应用"""
    app = FastAPI(title="NBA Fantasy H2H Dashboard")
    
    # CORS中间件
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # 注册路由
    app.include_router(health_router)
    app.include_router(h2h_router)
    app.include_router(fixtures_router)
    app.include_router(picks_router)
    app.include_router(refresh_router)
    
    # 静态文件服务
    app.mount("/static", StaticFiles(directory="frontend"), name="static")
    
    # 首页路由
    @app.get("/")
    def index():
        return FileResponse("frontend/index.html")
    
    # FDR数据路由
    @app.get("/api/fdr")
    def get_fdr():
        return {"html": FDR_HTML}
    
    return app


app = create_app()


async def background_task():
    """后台定时更新（只更新实时数据，静态数据24小时更新一次）"""
    from backend.data_service import update_all
    while True:
        await update_all(force_static=False)
        await asyncio.sleep(60)


@app.on_event("startup")
async def startup():
    """启动事件"""
    logger.info("[Startup] Starting up...")
    # 启动时尝试加载本地缓存
    cache_loaded = load_static_data()
    logger.info(f"[Startup] Cache loaded: {cache_loaded}")
    if not cache_loaded:
        logger.info("[Startup] No local cache found, fetching from API...")
        await update_all(force_static=True)
    else:
        # 有缓存，检查是否需要更新event
        async with httpx.AsyncClient() as client:
            if not LocalCache.is_fresh(f"{CACHE_DIR}/bootstrap_static.json", hours=1):
                logger.info("[Startup] Cache is stale, checking for new event...")
                await update_static_data(client, force=True)
            else:
                json_data = LocalCache.load_bootstrap_json()
                if json_data and 'events' in json_data:
                    from backend.api_client import get_current_event
                    event_id, event_name = get_current_event(json_data['events'])
                    CACHE.current_event = event_id
                    CACHE.current_event_name = event_name
                    logger.info(f"[Startup] Using cached data, current event: {event_name} (ID: {event_id})")
            
            # 更新实时数据
            logger.info("[Startup] Updating live data...")
            await update_live_data(client)
            logger.info("[Startup] Updating fixture details...")
            await update_fixture_details(client)
            logger.info("[Startup] Updating standings...")
            await update_standings(client)
            logger.info("[Startup] Updating fixtures...")
            await update_fixtures(client)
            logger.info(f"[Startup] Fixtures count: {len(CACHE.fixtures)}")
    
    asyncio.create_task(background_task())


# 导入放在最后避免循环依赖
from backend.data_service import update_all


if __name__ == "__main__":
    import uvicorn
    print("🚀 NBA Fantasy H2H Dashboard")
    print("📊 Loading...")
    uvicorn.run(app, host="127.0.0.1", port=8000)
