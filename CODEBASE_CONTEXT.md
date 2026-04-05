# 代码库上下文（当前版）

这份文档用于快速提醒后续维护时最重要的上下文，避免再次把实时链路、DDL 静态链路和小窗链路混在一起。

## 1. 当前线上真正生效的文件

- 前端入口：`frontend/index.html`
- 前端逻辑：`frontend/js/app.js`
- 前端样式：`frontend/css/style.css`
- Worker：`worker/src/index.js`
- Pages API 代理：`functions/api/[[path]].js`

`backend/` 只是旧 FastAPI 历史参考，不是当前生产主链路。

## 2. 三条核心数据链

### A. 首页缓存主链

- 接口：`GET /api/state`
- 作用：首页秒开
- 特点：只读 KV 主状态，不做重计算

### B. 首页实时补帧链

- 接口：`GET /api/state?fresh_h2h=1`
- 只在当天有比赛且处于实时窗口时使用
- 只更新：
  - H2H 分数
  - fixtures
  - fixture_details
  - 当前 event 阵容实时分
- 当前 event 阵容实时分只认本站自己的有效五人结算：
  - 合法阵型必须是 `3BC+2FC` 或 `2BC+3FC`
  - 先按首发顺序，再按替补顺序补位
- 明确不更新：
  - `chips_used_summary`
  - `good_captain_summary`
  - `transfer_trends`
  - `ownership`

### C. DDL 静态刷新链

- 接口：`POST /api/refresh?token=...`
- 这是每天 DDL 后最重要的一次刷新
- 负责统一更新：
  - 当前 event 的 `players`
  - 本周 `transfer_records`
  - `chip_status`
  - `captain_used`
  - `chips_used_summary`
  - `good_captain_summary`
  - `transfer_trends`
  - `ownership_top`

## 3. 动态刷新窗口

不再固定北京时间。

当前逻辑：

- 开始：当天第一场比赛开球
- 结束：最后一场比赛预计结束后 15 分钟

Worker cron 现在全天每 5 分钟触发一次，但真正是否刷新由代码内部判断。

## 4. Good Captain 的正确定位

Good Captain 是一个“本周 Captain chip 使用榜”：

- 只统计本周真实开过 `phcapt` 的经理
- 用的是他们真实的 `captain_used`
- 它属于 DDL 后静态数据，不属于实时补帧

判断时要牢记：

- `chips_used_summary` 负责统计“本周有多少人开了 Captain”
- `good_captain_summary` 负责展示“这些人分别选了谁、得了多少分”
- 两者必须来自同一条静态刷新链，否则人数一定会漂

## 5. 当前 Chips 规则

- `Captain`：本周内 `history.chips` 出现 `phcapt`
- `Wildcard`：`GW17+` 出现 `wildcard / wild_card`
- `All-Stars`：赛季内出现 `rich`

官方来源统一是：

- `https://nbafantasy.nba.com/api/entry/{entry_id}/history/`

## 6. 单人小窗的当前原则

单人小窗不应该再触发整套 manager meta 刷新。

当前原则：

1. 优先使用首页已拿到的缓存 `picks_by_uid[uid]`
2. 如果只是详情不完整，再走：
   - `GET /api/picks/{uid}?fresh=1&panel=1`
3. 这条轻量接口只补：
   - `transfer_records`
   - `captain_used`
   - `chip_status`

## 7. 比赛详情的当前原则

- 比赛详情优先用首页已拿到的 `fixture_details`
- 如果首页没有完整数据，再请求：
  - `GET /api/fixture/{id}`
- 当前 event 实时回退必须允许“0 数据球员”也显示出来，不能因为 `stats` 为空就整队被跳过

## 8. 当前最容易踩坑的点

### 不要再做的事

- 不要在 `fresh_h2h` 里重算 `Good Captain`
- 不要在 `/api/picks/{uid}` 请求路径里顺手触发全员 meta refresh
- 不要再用固定北京时间窗口控制首页实时刷新
- 不要让 chunk refresh 改写联赛级 summary

### 应该坚持的事

- 比赛实时态只改比分，不改静态汇总
- DDL 后静态态一次性更新 chips / transfers / ownership / good captain
- 赛后再把最终比分写回缓存

## 9. 现在应该优先相信的文档

- 总览：`README.md`
- 刷新链路：`API_REFRESH_CHAIN.md`
- 运维与命令：`PROJECT_GUIDE.md`

如果这些文档和旧日志冲突，以这三份新文档为准。
