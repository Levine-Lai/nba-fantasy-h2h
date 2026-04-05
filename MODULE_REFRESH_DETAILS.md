# 模块刷新说明（当前版）

## 首页主状态 `/api/state`

- 来源：KV `latest_state`
- 默认行为：只读缓存
- 主要用途：首页秒开

## 首页实时补帧 `/api/state?fresh_h2h=1`

- 只在比赛实时窗口内由前端请求
- 刷新内容：
  - H2H 分数
  - fixtures
  - fixture_details
  - 当前 event 阵容实时分
- 不写回 KV

## 单人小窗 `/api/picks/{uid}?fresh=1&panel=1`

- 用途：点开经理卡片下面的小窗
- 刷新内容：
  - transfer_records
  - captain_used
  - chip_status
- 不触发全员 meta refresh

## 比赛详情 `/api/fixture/{id}`

- 先读缓存 `fixture_details`
- 缺失时轻量重建当前 event 比赛详情

## 静态日更刷新 `/api/refresh`

- 默认就是静态刷新
- 刷新内容：
  - picks
  - transfers
  - history
  - ownership
  - weekly transfers
  - chips used
  - good captain
- 会写回 `latest_state`

## 定时任务 `scheduled`

- cron：每 5 分钟触发一次
- 代码内部动态判断是否需要执行

### 触发场景

- 当前 event 变化：执行静态刷新
- 静态 summary 对不上：执行静态刷新
- 赛后缓冲结束：把最终比分写回缓存
- 比赛进行中：不持续写 KV，实时分交给 `fresh_h2h`

## 额外模块

### `/api/injuries`

- 独立缓存
- 小时级刷新

### `/api/player-reference`

- 按需抓取
- 不进入首页主状态

### `/api/team-attack-defense`

- 独立缓存
- 不进入首页主状态
