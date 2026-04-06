# NBA Fantasy H2H

这是一个面向 NBA Fantasy 私人联赛的可视化站点，当前线上核心由两部分组成：

- 前端页面：`frontend/`
- 后端聚合：`worker/src/index.js`

## 项目目标

- 首页展示当前比赛周的 H2H 对阵、今日比赛、Chips、Weekly Transfers、Ownership 等核心信息
- 在比赛进行时尽量实时更新球员分数和经理总分
- 在每天 DDL 之后只刷新一次静态数据，避免重复写 KV
- 保持单人小窗、比赛详情、Good Captain、Chips Used 口径一致

## 当前架构

生产环境真正生效的文件只有这几类：

- 前端入口：`frontend/index.html`
- 前端逻辑：`frontend/js/app.js`
- 前端样式：`frontend/css/style.css`
- Worker：`worker/src/index.js`
- Pages API 转发：`functions/api/[[path]].js`

`backend/` 是旧 FastAPI 历史版本，不再是当前线上主链路。

## 当前数据口径

### H2H 分数

- 经理当日分数来自当前 event 的实时 `picks + live`
- 当日分数必须由“有效五人”手工结算：
  - 只接受 `3BC+2FC` 或 `2BC+3FC`
  - 先按首发顺序统计
  - 不合法或有人不上场时，再按替补顺序补位
- 经理本周总分来自“本周已结算 history + 当前 event 实时分数”
- 本周总分口径是“历史已结算天数 + 当前 event 手工实时分数 - 本周扣分”，不直接吃官方当前 event 总分
- 比赛进行时不把实时结果频繁写回 KV
- 当天最后一场比赛结束后 15 分钟，才把最终比分写回缓存

### DDL 与“新的一天”

- NBA Fantasy 的“新一天”以官方 `bootstrap-static.events[*].deadline_time` 为准
- 当前 event 一旦切换，说明已经过了当天 DDL
- 过了 DDL 后，转会记录、队长/卡片状态、持有率、Good Captain 等静态模块都应该按新 event 刷一次

### Chips 规则

- `Captain`：本周内历史里出现 `phcapt` 记为已用
- `Wildcard`：`GW17+` 出现 `wildcard / wild_card` 记为已用
- `All-Stars`：赛季内出现 `rich` 记为已用

官方来源统一是：

- `https://nbafantasy.nba.com/api/entry/{entry_id}/history/`

### Good Captain

Good Captain 不是“今天谁的球员分最高”，而是：

- 只统计本周真实开过 `Captain` 的经理
- 按他们实际 `Captain Used` 的球员与得分做排行
- 这份数据属于 DDL 后静态刷新结果，不属于首页实时补帧逻辑

## 刷新分层

### 1. 缓存主状态 `/api/state`

- 默认只读 `latest_state`
- 不在普通请求里重跑整套 manager meta
- 作用是首页秒开

### 2. 实时补帧 `/api/state?fresh_h2h=1`

- 只在“当天有比赛且处于实时刷新窗口”时使用
- 只补：
  - H2H 经理分数
  - 当天 fixtures
  - 比赛详情 `fixture_details`
  - 当前 event 的阵容实时分
- 同时会重新读取当前周 `history`，用来重算本周总分，避免首页只更新今日分但周总分仍停留在旧缓存
- 不再重算：
  - `chips_used_summary`
  - `good_captain_summary`
  - `weekly transfers`
  - `ownership`

### 3. DDL 静态刷新 `/api/refresh`

默认 `POST /api/refresh?token=...` 走静态刷新：

- 读取全员当前 event `picks`
- 读取全员 `history`
- 读取全员 `transfers`
- 统一更新：
  - `picks_by_uid`
  - `transfer_records`
  - `chip_status`
  - `captain_used`
  - `chips_used_summary`
  - `good_captain_summary`
  - `transfer_trends`
- `ownership_top`

补充说明：

- 默认 `/api/refresh` 现在只负责静态缓存刷新，不再在同一次调用里顺手跑首页实时 `fresh_h2h`
- 这样可以避免 Cloudflare 免费版的单次 subrequest 超限
- 首页是否展示“今天实时数据”，改由 `/api/state` 在比赛窗口内自动判断并返回 fresh 结果

这一步是“每天 DDL 后的一次日更刷新”的主入口。

### 4. 赛后落缓存

- 刷新窗口结束后（最后一场比赛预计结束 + 15 分钟）
- Worker 会把实时比分固化进 KV
- 之后首页默认直接读缓存即可

## 动态刷新窗口

不再固定按北京时间 `08:00 - 14:00`。

现在刷新窗口根据当天真实 fixtures 动态计算：

- 开始：第一场比赛开球
- 结束：最后一场比赛预计结束后 15 分钟

Worker 的 cron 改成每 5 分钟全天触发一次，真正是否刷新由 Worker 内部判断。

## 主要接口

- `GET /api/state`
  - 首页缓存态
- `GET /api/state?fresh_h2h=1`
  - 首页实时补帧态
- `GET /api/fixture/{id}`
  - 单场比赛详情
- `GET /api/picks/{uid}`
  - 单个经理完整阵容
- `GET /api/picks/{uid}?fresh=1&panel=1`
  - 单人小窗轻量刷新
- `GET /api/trends/transfers`
  - Weekly Transfers / Ownership 数据
- `POST /api/refresh?token=...`
  - 手动触发静态刷新

## 当前前端策略

- 首页先读缓存 `/api/state`
- 只有在实时刷新窗口内，才再请求一次 `/api/state?fresh_h2h=1`
- 自动轮询也只在实时刷新窗口内继续跑
- 单人小窗优先秒开缓存，不完整时再补轻量 fresh
- 比赛详情优先用首页已拿到的 `fixture_details`，缺失时再请求 `/api/fixture/{id}`

## 本地开发

### 前端

```powershell
cd F:\NBA\frontend
python -m http.server 8080
```

### Worker

```powershell
cd F:\NBA\worker
npx wrangler dev --local-protocol http
```

### 本地访问

```text
http://127.0.0.1:8080/index.html
```

如果要强制前端走本地 Worker：

```text
http://127.0.0.1:8080/index.html?api_base=http://127.0.0.1:8787
```

## 线上运维命令

### 部署 Worker

```powershell
cd F:\NBA\worker
npx wrangler deploy
```

### 手动静态刷新

```powershell
Invoke-WebRequest -Method POST "https://nba-fantasy-api.nbafantasy.workers.dev/api/refresh?token=040517"
```

## 更新记录

### 2026-03-27

- 新增伤病信息页与对阵参考页
- 首页/详情页开始统一走 Worker 聚合接口

### 2026-03-28

- 对阵详情、小窗、未来赛程、排行榜等功能继续扩展
- 前端结构逐步从“单页卡片”整理为“首页 + 子页”

### 2026-03-30

- Weekly Transfers 与 Ownership 改为更清晰的可视化模块
- Chips、Captain、转会展示开始统一从官方 API 衍生

### 2026-04-01

- 增加赛季总结预览页与独立子路由的雏形
- 首页继续收紧交互与模块布局

### 2026-04-05

- 重新梳理刷新链路，明确拆成：
  - 缓存主状态
  - 比赛进行时实时补帧
  - DDL 后静态刷新
  - 赛后最终比分落缓存
- `fresh_h2h` 不再重算 `Good Captain / Chips Used / Weekly Transfers / Ownership`
- `Good Captain` 回归 DDL 静态数据链路，减少人数漂移
- 单人小窗改为“先秒开缓存，再按需轻量补全”
- 比赛详情补充当前 event 的实时回退，避免卡死在 loading
- Worker cron 改为全天每 5 分钟触发，由代码内部动态判断是否刷新
