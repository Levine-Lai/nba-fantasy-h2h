# Codebase Context

## Current Runtime

- Frontend entry: `frontend/index.html`
- Frontend logic: `frontend/js/app.js`
- Frontend style: `frontend/css/style.css`
- Live backend source of truth: `worker/src/index.js`
- Pages same-origin API proxy: `functions/api/[[path]].js`

## Important Architecture Notes

- `worker/src/index.js` is the only backend file that matters for production now.
- `backend/` is the old FastAPI version kept only as historical reference.
- Homepage uses `/api/state?fresh_h2h=1`.
- The homepage fresh path should only refresh live score totals.
- Chips, weekly transfers, and chips summary should come from cached daily meta data, not per-request homepage recomputation.

## Chips Rules

- `Captain`: used if `phcapt` appears in the current week.
- `Wildcard`: used if `wildcard` or `wild_card` appears from `GW17` onward.
- `All-Stars`: used if `rich` appears anywhere in the season.
- Official chip source: `https://nbafantasy.nba.com/api/entry/{entry_id}/history/`

## Refresh Strategy

- `chunk` refresh:
  - updates a small UID batch
  - cheaper for normal scheduled refresh
- `meta` refresh:
  - refreshes all managers' `history`
  - updates chips and `Chips Used`
  - this is the lightweight all-manager chip metadata refresh
- default `/api/refresh?token=...`:
  - now defaults to the lightweight history-based chip refresh
  - this is the preferred manual refresh entrypoint
- `full` refresh:
  - expensive
  - should only be used when the whole cache must be rebuilt

## Commands

### Deploy Worker

```powershell
cd F:\NBA\worker
npx wrangler deploy
```

### Default Manual Refresh

```powershell
Invoke-WebRequest -Method POST "https://nba-fantasy-api.nbafantasy.workers.dev/api/refresh?token=040517"
```

### Meta Only Refresh

```powershell
Invoke-WebRequest -Method POST "https://nba-fantasy-api.nbafantasy.workers.dev/api/refresh?mode=meta&token=040517"
```

## Known UI/Data Areas

- `Weekly Transfers` should show league current-week transfer totals, not global event transfer trends.
- `Chips Used` sits above `Ownership Top 10`.
- `Chips Used` is derived from official `/history/` chip state and refreshed in daily meta refresh.
- Detail modal requests should avoid default `fresh=1` unless a real cache miss/event change happens.

## Recent Real-Data Sanity Checks

- `阿甘` (`uid 6412`) has official `rich` usage in event `63`.
- `酸男` (`uid 14`) current chip status should be:
  - `Captain ✓`
  - `WC ✕`
  - `AS ✕`
- `柯南` (`uid 6562`) current chip status should be:
  - `Captain ✓`
  - `WC ✕`
  - `AS ✕`

## Files Worth Keeping

- `README.md`
- `PROJECT_GUIDE.md`
- `MODULE_REFRESH_DETAILS.md`
- `CODEBASE_CONTEXT.md`
- `functions/api/[[path]].js`
- `worker/src/index.js`
- `frontend/`

## Likely Redundant / Deletion Candidates

- `backend/__pycache__/`
  - generated Python cache files, safe to remove
- `backend/`
  - removable if you are sure the old FastAPI implementation is no longer needed as reference
- `logs/`
  - local runtime artifact directory if you no longer use the old FastAPI stack
- `cache/`
  - local cache artifact directory if not used in your current workflow

## Deletion Advice

- Safe first cleanup:
  - `backend/__pycache__/`
  - old preview/report docs if no longer needed
  - old `logs/` contents
- More aggressive cleanup:
  - entire `backend/`
  - entire `cache/`
- Keep `functions/` unless you also change your Pages/API routing setup.
