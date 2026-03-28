# Module Refresh Details

## Main State `/api/state`
- Covers homepage core data:
  - `Live H2H`
  - `Today's Fixtures`
  - `Overall Transfer In / Out`
  - `Ownership Top 10`
  - `FDR`
- Refresh source:
  - Reads from `latest_state`
  - If cache is missing, triggers a full rebuild once
  - Scheduled chunk refresh during Beijing `07:00 - 14:00`, every 5 minutes
- Approximate KV cost:
  - Normal request: `1 read`, `0 write`
  - Cold start rebuild: about `2 reads`, `2 writes`
  - Scheduled chunk refresh: about `2 reads`, `2 writes`

## Transfer Trends `/api/trends/transfers`
- Data source:
  - League transfer records from cached manager payloads
  - Global transfer in/out from current `bootstrap-static` event counters
- Refresh behavior:
  - League transfer pair stats are fully rebuilt on full refresh
  - Global `Overall Transfer In / Out` is now recalculated on every state rebuild, including chunk refresh
- Approximate KV cost:
  - Separate request: `1 read`, `0 write`
  - No dedicated KV namespace

## Fixtures `/api/fixtures`
- Refresh behavior:
  - Derived from cached main state
  - Frontend auto-refresh only during Beijing `07:00 - 14:00`
  - Frontend interval: `120s`
- Approximate KV cost:
  - `1 read`, `0 write`

## Live H2H `/api/h2h`
- Refresh behavior:
  - Derived from cached main state
  - Homepage can request `/api/state?fresh_h2h=1` to get fresher card values
- Approximate KV cost:
  - Normal request: `1 read`, `0 write`

## Lineup Detail `/api/picks/{uid}`
- Refresh behavior:
  - Cached payload by default
  - `?fresh=1` rebuilds only that single manager payload in memory
- Approximate KV cost:
  - Cached request: `1 read`, `0 write`
  - `fresh=1`: `1 read`, `0 write`

## Injuries `/api/injuries`
- Cache key:
  - `injury_state`
- Refresh behavior:
  - TTL: `60 minutes`
  - Hourly forced refresh at cron minute `00`
- Approximate KV cost:
  - Cache hit: `1 read`, `0 write`
  - Refresh: `1 read`, `1 write`

## Player Reference `/api/player-reference`
- Refresh behavior:
  - On-demand fetch from official NBA Fantasy API
  - No dedicated KV persistence for arbitrary player queries
- Approximate KV cost:
  - `0 read`, `0 write`

## Player Options `/api/player-options`
- Refresh behavior:
  - Built directly from current `bootstrap-static`
  - No dedicated KV persistence
- Approximate KV cost:
  - `0 read`, `0 write`

## FDR `/api/fdr`
- Refresh behavior:
  - Derived from cached main state
- Approximate KV cost:
  - `1 read`, `0 write`

## Manual Refresh `/api/refresh`
- Default mode:
  - `chunk`
- Optional:
  - `mode=full`
- Approximate KV cost:
  - Chunk refresh: about `2 reads`, `2 writes`
  - Full refresh: about `2 reads`, `2 writes`
- Operational difference:
  - Full refresh uses many more upstream API calls

## Current Schedules
- State chunk refresh:
  - Worker cron: `*/5 23,0,1,2,3,4,5,6 * * *`
  - Equivalent to Beijing `07:00 - 14:00`, every 5 minutes
- Injury refresh:
  - Every hour at minute `00`

## Rough Daily Fixed KV Budget
- Main state scheduled refresh:
  - about `84 runs/day`
  - about `168 reads + 168 writes/day`
- Injury hourly refresh:
  - about `24 reads + 24 writes/day`
- Fixed total:
  - about `192 reads/day`
  - about `192 writes/day`
