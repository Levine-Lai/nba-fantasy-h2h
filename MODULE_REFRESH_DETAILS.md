# Module Refresh Details

## Overview
This document summarizes the current refresh strategy for each major module, along with the approximate Workers KV cost under the current implementation.

Notes:
- KV numbers below are approximate per request or per scheduled run.
- `read` means `NBA_CACHE.get(...)`
- `write` means `NBA_CACHE.put(...)`
- Frontend static assets and Pages HTML do not consume KV by themselves.

## 1. Main Homepage State

Route:
- `/api/state`

Includes:
- `Live H2H`
- `Today's Fixtures`
- `Overall Transfer In / Out`
- `Ownership Top 10`
- `FDR`

Refresh strategy:
- Homepage reads the cached state by default.
- If cache is missing, the backend performs a full refresh once.
- During Beijing time `07:00 - 14:00`, the Worker cron runs every 5 minutes in chunk mode.
- Frontend auto-refresh is enabled only in the active game window and currently refreshes every `120s`.

KV cost:
- Normal `/api/state` hit: about `1 read`, `0 write`
- Cold start without cache: about `2 reads`, `2 writes`
- Scheduled chunk refresh: about `2 reads`, `2 writes` each run

Current schedule:
- Worker cron: `*/5 23,0,1,2,3,4,5,6 * * *`
- Equivalent to Beijing time `07:00 - 14:00`, every 5 minutes

## 2. Live H2H / Fixtures / FDR / Transfer Trends

Routes:
- `/api/h2h`
- `/api/fixtures`
- `/api/fdr`
- `/api/trends/transfers`

Refresh strategy:
- These are all derived from the main cached state.
- They do not maintain separate KV caches.

KV cost:
- Each request first loads state: about `1 read`, `0 write`

Important note:
- `Overall Transfer In / Out` now updates on every state rebuild, including chunk refresh.
- Reason: global transfer trends are recalculated from current `bootstrap-static` event transfer counts each time state is rebuilt.

## 3. Lineup / Match Detail

Routes:
- `/api/picks/{uid}`
- `/api/fixture/{id}`

Refresh strategy:
- `/api/fixture/{id}` reads from cached state.
- `/api/picks/{uid}` reads from cached state by default.
- `/api/picks/{uid}?fresh=1` recalculates that single manager payload in memory and returns it without writing back to KV.

KV cost:
- `/api/fixture/{id}`: about `1 read`, `0 write`
- `/api/picks/{uid}`: about `1 read`, `0 write`
- `/api/picks/{uid}?fresh=1`: about `1 read`, `0 write`

## 4. Injuries

Route:
- `/api/injuries`

Refresh strategy:
- Separate KV cache with `60` minute TTL
- Also forced once per hour by cron at minute `00`

KV cost:
- Cache hit: about `1 read`, `0 write`
- Cache miss or forced refresh: about `1 read`, `1 write`

Current schedule:
- Hourly refresh at `minute 00`

## 5. Player Reference

Route:
- `/api/player-reference`

Refresh strategy:
- On-demand fetch from official NBA Fantasy API
- Current implementation does not persist a separate KV cache for arbitrary player queries
- Default Jokic page is still loaded on demand like other players

KV cost:
- Current implementation: `0 read`, `0 write`

Cost tradeoff:
- Lower KV usage
- More upstream API work when users search different players

## 6. Player Options

Route:
- `/api/player-options`

Refresh strategy:
- Built directly from `bootstrap-static`
- No KV persistence

KV cost:
- Current implementation: `0 read`, `0 write`

## 7. Refresh Endpoint

Route:
- `/api/refresh`

Refresh strategy:
- Manual refresh
- Default mode is `chunk`
- Full refresh is available via `?mode=full`

KV cost:
- Chunk refresh: about `2 reads`, `2 writes`
- Full refresh: about `2 reads`, `2 writes`

Difference between chunk and full:
- KV writes are similar
- Full refresh performs many more upstream API calls

## 8. Scheduled Tasks

### State Chunk Refresh
- Time: Beijing `07:00 - 14:00`
- Frequency: every 5 minutes
- KV cost per run: about `2 reads`, `2 writes`

### Injury Refresh
- Time: every hour at minute `00`
- KV cost per run: about `1 read`, `1 write`

### Player Reference Scheduled Refresh
- Current Worker schedule still triggers the daily job hook at Beijing `16:00`
- Current player-reference implementation is effectively on-demand and does not write KV
- KV cost per run: currently `0 read`, `0 write`

## 9. Daily KV Budget Rough Estimate

Main fixed KV usage from cron:
- State chunk refresh: about `84 runs/day` in active window
- Approximate fixed state cost: `168 reads + 168 writes/day`
- Injury hourly refresh: about `24 reads + 24 writes/day`

Approximate fixed total:
- Reads: about `192/day`
- Writes: about `192/day`

This means most remaining KV budget is consumed by:
- Homepage `/api/state` reads
- Manual refreshes
- Cold starts when cache is missing

## 10. Frontend Auto Deployment

Current deployment behavior:
- `git push` to the connected GitHub repository triggers Pages frontend deployment
- `npx wrangler deploy` updates the Worker backend

Recommended operational flow:
1. Code change
2. Update `README.md`
3. `git commit`
4. `git push`
5. `npx wrangler deploy`
6. Optional `/api/refresh`
