# NBA Fantasy H2H Dashboard - 项目结构指南

## 📁 目录结构

```
NBA/
├── backend/                  # 后端代码
│   ├── __init__.py
│   ├── main.py              # FastAPI 应用入口
│   ├── config.py            # 配置（联盟ID、用户映射、赛程等）
│   ├── cache.py             # 缓存管理（内存缓存+本地文件缓存）
│   ├── models.py            # 数据模型（Pydantic）
│   ├── api_client.py        # NBA Fantasy API 客户端
│   ├── data_service.py      # 数据处理服务（得分计算、阵容处理）
│   └── routers/             # API 路由
│       ├── __init__.py
│       ├── health.py        # 健康检查
│       ├── h2h.py           # H2H 对阵
│       ├── fixtures.py      # 赛程
│       ├── picks.py         # 阵容
│       └── refresh.py       # 数据刷新
├── frontend/                # 前端代码
│   ├── index.html           # 主页面
│   ├── css/
│   │   └── style.css        # 样式表
│   └── js/
│       └── app.js           # 前端逻辑
├── cache/                   # 缓存数据目录
├── run.py                   # 启动脚本
├── PROJECT_GUIDE.md         # 本文件
└── main_v1.py               # 原始单文件版本（备份）
```

## 🎯 前后端拆分优势

### 1. 上下文节省
- AI 修改时只需处理相关文件，无需复制整个大文件
- 每个文件职责单一，代码量少

### 2. 模块化维护
- **修改配置** → 只改 `config.py`
- **修改样式** → 只改 `frontend/css/style.css`
- **修改API** → 只改 `backend/routers/` 下对应文件
- **修改前端逻辑** → 只改 `frontend/js/app.js`

### 3. 团队协作
- 前后端可以独立开发和测试
- 代码冲突概率降低

## 📝 AI 修改模版

### 场景1：修改用户映射
```
文件: backend/config.py
修改: UID_MAP 字典
示例:
    UID_MAP = {
        5410: "kusuri",
        3455: "Paul",
        # ... 添加或修改用户
    }
```

### 场景2：修改赛程
```
文件: backend/config.py
修改: FIXTURES_GW22 列表
示例:
    FIXTURES_GW22 = [
        ("玩家1", "玩家2"),
        ("玩家3", "玩家4"),
        # ... 修改对阵
    ]
```

### 场景3：修改计分规则
```
文件: backend/data_service.py
函数: calculate_fantasy_score()
示例:
    def calculate_fantasy_score(stats: Dict) -> int:
        pts = stats.get('points_scored', 0)
        reb = stats.get('rebounds', 0)
        ast = stats.get('assists', 0)
        # 修改权重
        return int(pts * 1 + reb * 1 + ast * 2 + stl * 3 + blk * 3)
```

### 场景4：修改样式颜色
```
文件: frontend/css/style.css
修改: 颜色代码
示例:
    .fdr-1 { background: #02894e; }
    .fdr-2 { background: #00ff85; }
    .fdr-3 { background: #ebebeb; }
    # ... 修改颜色值
```

### 场景5：修改前端交互
```
文件: frontend/js/app.js
函数: 对应的事件处理函数
示例:
    async function showLineup(uid, name) {
        // 修改阵容显示逻辑
    }
```

### 场景6：添加新API
```
文件: backend/routers/xxx.py
示例:
    @router.get("/api/new-endpoint")
    def new_endpoint():
        return {"data": "value"}

然后在 backend/main.py 中注册路由
```

## 🚀 运行项目

### 启动服务器
```bash
python run.py
```

### 开发模式（热重载）
```bash
python run.py --reload
```

### 访问地址
- 主页: http://127.0.0.1:8000
- API文档: http://127.0.0.1:8000/docs

## 🔧 技术栈

- **后端**: FastAPI + httpx
- **前端**: 原生 HTML + CSS + JavaScript
- **缓存**: 本地 JSON/CSV 文件

## 📌 注意事项

1. **不要直接修改 main_v1.py**，它是备份文件
2. 所有后端代码都在 `backend/` 目录下
3. 所有前端代码都在 `frontend/` 目录下
4. 缓存文件会自动生成在 `cache/` 目录下
