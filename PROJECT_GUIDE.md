# 项目维护指引

这份文档面向维护者，重点是“平时怎么跑、什么时候刷新、出了问题先查哪条链路”。

## 1. 当前项目结构

```text
frontend/
  index.html
  css/style.css
  js/app.js
  season-summary/

worker/
  src/index.js
  wrangler.toml
  package.json

functions/
  api/[[path]].js
  season-summary/[[path]].js
```

当前真正生产使用的后端只有：

- `worker/src/index.js`

---

## 2. 平时要记住的刷新分层

### 实时比分层

- 用于比赛进行时
- 接口：`/api/state?fresh_h2h=1`
- 只更新比分、fixtures、fixture_details
- 同时会重算当前周总分，避免首页只刷新今日分
- 当前 event 分数按本站自己的有效五人逻辑结算：
  - 合法阵型只能是 `3BC+2FC` 或 `2BC+3FC`
  - 先看首发，再按替补顺序补位
- 不更新 Good Captain / Chips Used / Weekly Transfers / Ownership

### DDL 静态层

- 用于每天过 DDL 后
- 接口：`POST /api/refresh?token=...`
- 统一更新：
  - picks
  - transfers
  - history
  - chip_status
  - captain_used
  - weekly transfers
  - ownership
  - good captain

### 赛后落缓存层

- 当天最后一场比赛结束后 15 分钟
- 把最终比分写回 KV
- 之后首页默认读缓存即可

---

## 3. 本地开发

### 跑前端

```powershell
cd F:\NBA\frontend
python -m http.server 8080
```

### 跑 Worker

```powershell
cd F:\NBA\worker
npx wrangler dev --local-protocol http
```

### 本地访问

```text
http://127.0.0.1:8080/index.html
```

如果想强制指定本地 API：

```text
http://127.0.0.1:8080/index.html?api_base=http://127.0.0.1:8787
```

---

## 4. 线上操作

### 部署 Worker

```powershell
cd F:\NBA\worker
npx wrangler deploy
```

### 手动刷新静态数据

```powershell
Invoke-WebRequest -Method POST "https://nba-fantasy-api.nbafantasy.workers.dev/api/refresh?token=040517"
```

默认就是 DDL 静态刷新。

---

## 5. 什么时候应该手动刷新

### 过了当天 DDL 后

建议手动刷一次，确保这些模块立刻更新：

- Weekly Transfers
- Ownership
- Special Guy
- Chips Used
- Good Captain
- 单人小窗里的转会记录和 Captain Used

### 比赛全部结束后

如果想立即把最终比分落进缓存，也可以手动再刷一次。

---

## 6. 当前 cron 策略

`worker/wrangler.toml` 现在改成：

- 每 5 分钟触发一次 `scheduled`

但真正是否刷新，由 Worker 代码内部动态判断：

- 当前 event 是否变化
- 是否已经到比赛实时窗口
- 是否已经赛后需要落缓存

这比固定北京时间窗口更稳。

---

## 7. 遇到问题先查哪里

### 首页比分慢或错

先查：

- `/api/state`
- `/api/state?fresh_h2h=1`
- 当前 event fixtures/live

### Good Captain 人数和 Chips Used 对不上

先查：

- `chips_used_summary`
- `good_captain_summary`
- `refresh_meta.meta_event`

### 单人小窗没有数据

先查：

- `/api/picks/{uid}?fresh=1&panel=1`

### 比赛详情一直 loading

先查：

- `/api/fixture/{id}`
- `fixture_details`

---

## 8. 当前最重要的规则

### 不要再做

- 不要在首页实时补帧里重算 Good Captain
- 不要在 `/api/picks/{uid}` 请求里顺手触发全员刷新
- 不要再用固定北京时间窗口硬控刷新

### 继续坚持

- 实时层只做实时比分
- DDL 层只做静态数据统一刷新
- 赛后再把最终比分写回缓存

---

## 9. 文档优先级

后续维护时优先看：

1. `README.md`
2. `API_REFRESH_CHAIN.md`
3. `CODEBASE_CONTEXT.md`

这三份如果和旧日志冲突，以新的三份为准。
