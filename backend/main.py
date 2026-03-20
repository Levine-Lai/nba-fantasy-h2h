"""
FastAPI 应用主入口
添加启动检查和日志配置

修改日期: 2026-03-20
修改点:
1. 应用启动时检查SQLite文件是否存在，不存在则初始化
2. 检查上次更新时间，超过2小时自动触发数据刷新
3. 配置Python logging，写入logs/app.log，保留7天
"""

import os
import asyncio
import logging
import logging.handlers
import httpx

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from backend.config import LEAGUE_ID, CACHE_DIR, FDR_HTML
from backend.cache import CACHE, LocalCache, _ensure_db, get_cache_timestamp, DB_PATH
from backend.api_client import load_static_data, update_static_data, update_live_data
from backend.api_client import update_fixtures, CircuitBreaker
from backend.data_service import update_fixture_details, update_standings

# 配置日志
os.makedirs("logs", exist_ok=True)
log_formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')

# 文件日志处理器，保留7天，每天轮转
file_handler = logging.handlers.TimedRotatingFileHandler(
    "logs/app.log",
    when="midnight",
    interval=1,
    backupCount=7,
    encoding="utf-8"
)
file_handler.setFormatter(log_formatter)
file_handler.setLevel(logging.INFO)

# 控制台日志处理器
console_handler = logging.StreamHandler()
console_handler.setFormatter(log_formatter)
console_handler.setLevel(logging.INFO)

# 配置根日志器
logging.basicConfig(
    level=logging.INFO,
    handlers=[file_handler, console_handler]
)

logger = logging.getLogger(__name__)

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
    
    # 1. 检查SQLite文件是否存在，不存在则初始化
    if not os.path.exists(DB_PATH):
        logger.info(f"[Startup] SQLite database not found at {DB_PATH}, initializing...")
        _ensure_db()
        logger.info("[Startup] SQLite database initialized")
    else:
        logger.info(f"[Startup] SQLite database found at {DB_PATH}")
    
    # 2. 检查上次更新时间，如果超过2小时则自动触发数据刷新
    last_update = get_cache_timestamp('bootstrap_static')
    cache_stale = False
    if last_update:
        hours_since_update = (datetime.now() - last_update).total_seconds() / 3600
        logger.info(f"[Startup] Last data update: {last_update}, {hours_since_update:.1f} hours ago")
        if hours_since_update > 2:
            cache_stale = True
            logger.info("[Startup] Cache is stale (>2 hours), will refresh data")
    else:
        logger.info("[Startup] No cache timestamp found, will fetch fresh data")
        cache_stale = True
    
    # 启动时尝试加载本地缓存
    cache_loaded = load_static_data()
    logger.info(f"[Startup] Cache loaded: {cache_loaded}")
    
    if not cache_loaded or cache_stale:
        logger.info("[Startup] Fetching from API...")
        try:
            await update_all(force_static=True)
            logger.info("[Startup] Initial data fetch completed")
        except Exception as e:
            logger.error(f"[Startup] Failed to fetch initial data: {e}")
            if CircuitBreaker.is_circuit_open():
                logger.warning("[Startup] Circuit breaker is open, using cached data if available")
    else:
        # 有缓存，检查是否需要更新event
        async with httpx.AsyncClient() as client:
            # 检查缓存是否超过1小时
            if cache_stale:
                logger.info("[Startup] Cache is stale, checking for new event...")
                try:
                    await update_static_data(client, force=True)
                except Exception as e:
                    logger.error(f"[Startup] Failed to update static data: {e}")
            else:
                json_data = LocalCache.load_bootstrap_json()
                if json_data and 'events' in json_data:
                    from backend.api_client import get_current_event
                    event_id, event_name = get_current_event(json_data['events'])
                    CACHE.current_event = event_id
                    CACHE.current_event_name = event_name
                    logger.info(f"[Startup] Using cached data, current event: {event_name} (ID: {event_id})")
            
            # 更新实时数据
            try:
                logger.info("[Startup] Updating live data...")
                await update_live_data(client)
                logger.info("[Startup] Updating fixture details...")
                await update_fixture_details(client)
                logger.info("[Startup] Updating standings...")
                await update_standings(client)
                logger.info("[Startup] Updating fixtures...")
                await update_fixtures(client)
                logger.info(f"[Startup] Fixtures count: {len(CACHE.fixtures)}")
            except Exception as e:
                logger.error(f"[Startup] Error updating live data: {e}")
    
    # 启动后台任务
    asyncio.create_task(background_task())
    logger.info("[Startup] Background task started")


# 导入放在最后避免循环依赖
from backend.data_service import update_all
from datetime import datetime


if __name__ == "__main__":
    import uvicorn
    print("🚀 NBA Fantasy H2H Dashboard")
    print("📊 Loading...")
    uvicorn.run(app, host="127.0.0.1", port=8000)
