# API / 缓存刷新链路（当前版）

这份文档专门解释现在项目里“哪些数据什么时候刷新、为什么这么刷新”。

## 1. 设计目标

刷新链路现在遵循三条原则：

1. 比赛分数只在比赛进行时走实时补帧，不频繁写 KV  
2. 每天过 DDL 后，静态模块只统一刷新一次  
3. Good Captain、小窗、比赛详情都必须服从这套分层，不能再各走一条半独立逻辑  

---

## 2. 当前缓存结构

主状态存放在 KV：

- `latest_state`

游标缓存：

- `refresh_cursor`

主状态里当前最关键的字段：

- `current_event`
- `current_event_name`
- `fixtures`
- `fixture_details`
- `h2h`
- `picks_by_uid`
- `transfer_trends`
- `chips_used_summary`
- `good_captain_summary`
- `refresh_meta`

---

## 3. `/api/state`

### 作用

首页默认主接口。

### 当前逻辑

1. 先读 KV 里的 `latest_state`
2. 如果 KV 为空，再做一次完整重建
3. 正常情况下只返回缓存，不做额外重算

### 为什么这样做

- 首屏要快
- 不能让每个用户访问首页都去触发全员刷新

---

## 4. `/api/state?fresh_h2h=1`

### 作用

首页比赛进行时的轻量实时补帧接口。

### 当前只刷新什么

- H2H 卡片里的 `today / total / diff`
- 当前 event 的 `fixtures`
- 当前 event 的 `fixture_details`
- 当前 event 阵容实时分

### 当前明确不刷新什么

- `chips_used_summary`
- `good_captain_summary`
- `transfer_trends`
- `ownership`

### 为什么这样改

之前最容易出问题的地方，就是把 `fresh_h2h` 也拿去重算：

- Good Captain
- Chips Used
- Weekly Transfers

结果就是：

- 上面人数对，下面人数错
- chips 对了，小窗不对
- 修完一个，另一个又漂

现在这条链被收回成纯“实时比分层”。

---

## 5. DDL 静态刷新链 `/api/refresh`

### 默认模式

```powershell
Invoke-WebRequest -Method POST "https://nba-fantasy-api.nbafantasy.workers.dev/api/refresh?token=040517"
```

默认就是静态刷新，不需要额外带 `mode=meta`。

### 当前负责刷新什么

- 全员当前 event `picks`
- 全员 `history`
- 全员 `transfers`
- 基于上面三类数据统一更新：
  - `players`
  - `transfer_records`
  - `chip_status`
  - `captain_used`
  - `chips_used_summary`
  - `good_captain_summary`
  - `transfer_trends`
  - `ownership_top`

### 为什么它是“DDL 后日更入口”

因为每天过了 DDL 以后，真正发生变化的是：

- 新的一天 `picks`
- 新的一天转会记录
- 新的一天 Captain / WC / AS 状态

这些都不是比赛实时分，而是“日更静态数据”。

---

## 6. DDL 的判定方式

DDL 不再硬编码成某个北京时间。

现在项目内部的理解是：

- 官方 `bootstrap-static` 当前 `is_current` 的 event 一旦变化
- 就说明已经过了这一天的 DDL
- 网站应该刷新一次静态数据

所以：

- DDL 刷新看的是 `current_event` 是否变化
- 不是看“今天是不是新的一天”

---

## 7. 动态实时刷新窗口

### 当前规则

- 开始：当天第一场比赛开球
- 结束：当天最后一场比赛预计结束后 15 分钟

由于官方 fixture 没有稳定的“最终结束时间”，当前用：

- `最后一场 kickoff_time + 5 小时 + 15 分钟`

来估算实时窗口结束时间。

### Worker cron

`wrangler.toml` 现在是：

- 每 5 分钟触发一次

但不是每次都真刷新，而是 Worker 自己判断：

- 是否已经到实时窗口
- 是否已经过 DDL
- 是否已经赛后落缓存

---

## 8. `scheduled()` 当前逻辑

### A. 如果当前 event 已变化

- 直接跑一次 DDL 静态刷新

### B. 如果静态 summary 缺失或对不上

例如：

- `chips_used_summary.captain.used_count`
  与
- `good_captain_summary` 的经理人数

不一致时：

- 再跑一次 DDL 静态刷新

### C. 如果当前处于比赛实时窗口

- 不往 KV 持续写实时比分
- 实时数据交给 `/api/state?fresh_h2h=1`

### D. 如果已经过了赛后缓冲时间

- 把实时比分固化进 KV
- 这样之后首页就能只读缓存显示最终比分

---

## 9. `/api/picks/{uid}`

### 默认

- 直接读缓存里的 `picks_by_uid[uid]`

### `?fresh=1&panel=1`

这是小窗专用轻量刷新。

### 当前只补什么

- `transfer_records`
- `captain_used`
- `chip_status`

### 为什么不再顺手触发全员 meta refresh

之前请求路径里混进了“按需全员 meta refresh”，结果是：

- 点小窗很慢
- 有时直接 `Load failed`
- 某些请求把主页缓存也拖进来了

现在这条路已经切干净了：

- 小窗请求只对当前 uid 负责

---

## 10. `/api/fixture/{id}`

### 当前逻辑

1. 先读缓存 `state.fixture_details[id]`
2. 如果缓存缺失或不完整，再轻量重建当前 event 的比赛详情

### 当前修复点

以前如果某些球员 live 里 `stats` 为空，就会整个人被跳过，导致：

- 某场比赛详情一直 loading
- 某支球队列表不完整

现在已经改成：

- 即便 `stats` 为空，也照样保留球员条目
- 分数默认按 0 / fallback 处理

---

## 11. Good Captain 的正确数据链

Good Captain 必须满足：

- 数据来源：DDL 静态刷新结果
- 单人是否参与统计：看本周是否真的用了 `Captain`
- 具体展示：看 `captain_used`

### 当前统一规则

- `chips_used_summary` 负责“总人数”
- `good_captain_summary` 负责“这些人是谁、选了谁、得了多少分”
- `buildGoodCaptainSummary()` 现在按 `chip_status.captain_used` 兜底，不再因为 `captain_name` 一时缺失就把人漏掉

---

## 12. 当前链路最重要的结论

如果以后再排 bug，优先按下面这个思路判断：

### 看到的是比分问题

先查：

- `fresh_h2h`
- `fixture_details`
- 当前 event picks/live

### 看到的是 chips / good captain / weekly transfers / ownership 问题

先查：

- DDL 静态刷新有没有跑
- `current_event` 是否已经变化
- `refresh_meta.meta_event` 是否跟上

### 看到的是小窗问题

先查：

- `/api/picks/{uid}?fresh=1&panel=1`

不要再去猜是不是首页实时补帧把它带坏了。
