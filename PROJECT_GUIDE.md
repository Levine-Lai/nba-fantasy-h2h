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

- 周总分优先使用 `entry/{uid}/history/` 的 `current` 明细自行汇总：
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

---

## 8. 常见问题排查

### Q1: 某些人显示今日 0

可能原因：

- 该用户当天有效上场球员确实没有比赛
- 实时 picks 接口短时失败（会回退历史分）
- 当前 Event 切换中，数据还在刷新

建议：

- 先执行一次 `/api/refresh`
- 再看 `/api/picks/{uid}` 中 `total_live`、`event_total` 是否正常

### Q2: 对阵不匹配

- 检查 `worker/src/index.js` 中 `ALL_FIXTURES` 与 `NAME_MAP` 是否一致
- 检查别名是否都能映射到 `UID_MAP`

### Q3: FDR 不显示或无颜色

- 检查 `/api/fdr` 返回是否为空
- 检查前端 `fdr-body` 是否成功 `innerHTML` 注入
- 检查 `.box` 与 `.fdr-1~5` 样式是否被覆盖

---

## 9. 后续可扩展模块（已验证可做）

“每周转会趋势榜”可以实现：

- 数据来源：`entry/{uid}/transfers/`
- 统计维度示例：
  - 本周最多被买入球员
  - 本周最多被卖出球员
  - 某用户本周转会次数排名

实现方式建议：

- Worker 在 refresh 时聚合一次，缓存到 KV
- 前端新增一个 `Transfer Trend` 模块读取 `GET /api/trends/transfers`

