# Cloudflare 零成本部署指南（Pages + Worker + KV）

这份指南会把当前项目部署成：
- 前端：Cloudflare Pages（静态站）
- 后端：Cloudflare Worker（定时抓 NBA API 并计算）
- 缓存：Cloudflare KV（保存最新快照）

## 1. 准备账号与工具

1. 注册 Cloudflare 账号并登录控制台。
2. 本机安装 Node.js 18+。
3. 在项目根目录打开终端，安装 Wrangler：

```bash
npm install -g wrangler
wrangler login
```

## 2. 部署 Worker API

Worker 代码在 `worker/src/index.js`。

1. 进入 Worker 目录：

```bash
cd worker
npm install
```

2. 创建 KV Namespace：

```bash
wrangler kv namespace create NBA_CACHE
```

你会得到一段 `id`，例如：

```toml
[[kv_namespaces]]
binding = "NBA_CACHE"
id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

3. 打开 `worker/wrangler.toml`，把 `id` 替换成你刚创建的真实 ID。

4. （可选但建议）设置手动刷新口令：

```bash
wrangler secret put REFRESH_TOKEN
```

5. 首次部署：

```bash
wrangler deploy
```

部署成功后会看到 Worker 地址，例如：
`https://nba-fantasy-api.<subdomain>.workers.dev`

6. 初始化数据（手动触发一次）：

```bash
curl -X POST "https://nba-fantasy-api.<subdomain>.workers.dev/api/refresh?token=你的REFRESH_TOKEN"
```

如果没设置 `REFRESH_TOKEN`，可直接：

```bash
curl -X POST "https://nba-fantasy-api.<subdomain>.workers.dev/api/refresh"
```

7. 验证 API：

```bash
curl "https://nba-fantasy-api.<subdomain>.workers.dev/api/health"
curl "https://nba-fantasy-api.<subdomain>.workers.dev/api/h2h"
curl "https://nba-fantasy-api.<subdomain>.workers.dev/api/picks/6441"
```

## 3. 部署 Pages 前端

前端在 `frontend/` 目录（纯静态）。

1. 进入 `frontend/index.html`，设置：

```html
window.__API_BASE__ = "https://nba-fantasy-api.<subdomain>.workers.dev";
```

2. 将仓库推送到 GitHub。
3. Cloudflare Dashboard -> Pages -> Create a project -> 连接该仓库。
4. 构建设置：
- Framework preset: `None`
- Build command: 留空
- Build output directory: `frontend`

5. 点击 Deploy。

## 4. 上线后检查

1. 打开 Pages 地址，确认能看到列表和对阵。
2. 核对 `6441`：
- `/api/picks/6441` 中查看 `penalty_score`、`gd1_missing_penalty`。
3. 观察 5 分钟后数据是否自动刷新（Cron 已在 `wrangler.toml` 配置为 `*/5 * * * *`）。

## 5. 日常维护

1. 改业务逻辑：修改 `worker/src/index.js` 后执行 `wrangler deploy`。
2. 改页面：改 `frontend/` 后推送 GitHub，Pages 自动重部署。
3. 紧急刷新：调用 `POST /api/refresh`。

## 6. 常见问题

1. 页面空白或 API 失败：
- 检查 `window.__API_BASE__` 是否填了 Worker 域名。
- 打开浏览器开发者工具看网络请求是否到达 Worker。

2. 403/401：
- 你设置了 `REFRESH_TOKEN`，但刷新接口没带 `token` 参数。

3. `api/state` 没数据：
- 先手动 `POST /api/refresh` 初始化。

