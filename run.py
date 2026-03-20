"""
NBA Fantasy H2H Dashboard 启动脚本

用法:
    python run.py           # 启动服务器
    python run.py --reload  # 开发模式（热重载）
"""

import sys
import uvicorn

def main():
    reload_mode = '--reload' in sys.argv
    
    print("NBA Fantasy H2H Dashboard")
    print("Loading...")
    print("http://127.0.0.1:8000")
    
    uvicorn.run(
        "backend.main:app",
        host="127.0.0.1",
        port=8000,
        reload=reload_mode,
        reload_dirs=["backend"] if reload_mode else None
    )

if __name__ == "__main__":
    main()
