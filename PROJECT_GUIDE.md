# NBA Fantasy H2H Dashboard - Project Guide

## 1. 项目目标

本项目用于展示 NBA Fantasy 私人联赛的实时对阵信息，核心目标是：

- 显示每周 H2H 对阵（总分、今日分）
- 显示球员阵容详情与转会扣分信息
- 显示 FDR（未来赛程难度）
- 支持自动刷新与公网部署（Cloudflare Pages + Worker）

---

## 2. 目录结构

```text
frontend/
  index.html
  css/style.css
  js/app.js

worker/
  src/index.js
  wrangler.toml
  package.json

backend/                # 本地 FastAPI 版本（可选）
cache/
```

说明：

- 线上默认使用 `worker/src/index.js` 作为 API 聚合层。
- 前端通过 `window.__API_BASE__` 指向 Worker 地址。

---

## 3. 当前计分规则（已实现）

### 3.1 今日分（Today）

- 今日分基于当前 Event 的实时球员数据计算。
- 不再把“整周转会扣分”从今日分里再减一次，避免出现异常负分/0分。

### 3.2 周总分（Event Total）

- 周总分：
  - 找到当前 Gameweek 的 Day1~Day7 对应 events
  - 累加 `points / 10` 得到周总分基线
- 转会扣分规则：
  - 每周免费换人 2 次
  - 超过 2 次后，每多 1 次扣 100
  - wildcard 激活时该周不扣分
- 漏扣修正：
  - 计算“应扣分”与“history 已扣分(event_transfers_cost/10)”的差额
  - 仅补扣差额，避免重复扣分

---

## 4. 主要接口

Worker 暴露：

- `GET /api/h2h`：主界面对阵卡
- `GET /api/picks/{uid}`：用户阵容与扣分详情
- `GET /api/fixtures`：今日赛程（北京时间）
- `GET /api/fixture/{id}`：单场球员详情
- `GET /api/fdr`：FDR HTML
- `POST /api/refresh?token=...`：手动刷新
- `GET /api/health`：健康检查

---

## 5. 前端显示规则

- 主界面对阵卡只显示：
  - 总分
  - 今日分
- 扣分明细仅在“点开详情”后展示。
- 阵型字符串（如 `2BC+3FC`）不在主界面显示。

---

## 6. FDR 说明

- FDR 通过固定赛程表（GW22~GW25）生成。
- 使用 `fdr-1 ~ fdr-5` 颜色类，颜色样式由 `frontend/css/style.css` 控制。
- 若前端无颜色，优先检查：
  - `/api/fdr` 是否返回带 `fdr-x` 类名的 HTML
  - 前端是否成功加载 `style.css`

---

## 7. 部署（Cloudflare）

### 7.1 部署 Worker

```powershell
cd F:\NBA\worker
npx wrangler deploy
```

### 7.2 手动刷新缓存

PowerShell 命令：

```powershell
Invoke-WebRequest -Method POST "https://<your-worker-domain>/api/refresh?token=<REFRESH_TOKEN>"
```

## 2026-03-25 架构说明补充

- 线上唯一后端为 `worker/src/index.js`。
- `backend/` 为迁移前的本地 FastAPI 历史版本，不作为线上主逻辑维护。
- 前端推荐通过同域 `/api/*` 调用 Worker API，不再依赖直接访问 `workers.dev` 域名。
- `/api/fdr` 当前返回 JSON，核心字段包括：
  - `weeks`
  - `html`
  - `weights`
  - `ranking_source`
  - `daily_averages`
