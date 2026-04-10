# GW25 Title Race

独立页面路径：

- `/gw25-title-race/index.html`

数据接口：

- `/api/gw25-title-race-data?gw=25`

说明：

- 页面只依赖上面这个独立接口，不改主站现有页面逻辑。
- 过去已结算 Day 使用官方 `entry/{uid}/history` 数据回算。
- 当前进行中的 Day 会叠加 `/api/picks/{uid}?fresh=1` 的实时 `event_total`。
- 导出优先 MP4；若浏览器不支持直接 MP4，会先录制 WebM 再尝试前端转码。
