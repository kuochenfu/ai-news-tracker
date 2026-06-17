# Source Scheduling Retro - 2026-06-17

## Summary

After source coverage was made visible across the site, four visible connectors still showed as disabled or paused because they were defined in the product model but not yet connected to the scheduled refresh job. The follow-up work moved those sources from planned metadata into live collection, and increased the Daily report from 10 to 15 trends.

## Impact

- `/sources/` showed several sources as paused, which made the source expansion look incomplete.
- `/daily/` did not yet match the desired breadth for a broader intelligence dashboard.
- The UI was correctly surfacing the gap, but the scheduled refresh pipeline had not caught up with the expanded source registry.

## Root Cause

The earlier source work separated two states:

- visible source coverage
- scheduled source collection

That distinction was useful while connectors were still planned, but it became misleading once the user expectation changed to "all sites are well connected." The refresh script still treated several first-party and platform sources as unscheduled, so the generated snapshot reported them as paused even though the site now displayed them everywhere.

## What Worked

- The source status cards made the unscheduled connectors obvious.
- The existing generated snapshot flow gave one place to verify source health, last sync, next sync, and Daily report size.
- Running the refresh locally before committing caught external feed issues before deployment.

## What Did Not Work

- "Planned" source metadata shipped before the refresh scheduler knew how to collect those sources.
- The first pass did not include a hard acceptance check for zero paused sources.
- Some official vendor feed URLs were unreliable, so scheduling needed to prefer confirmed endpoints over a larger but brittle feed list.

## Fixes Shipped

- Scheduled first-party, research, release, model hub, npm, and PyPI source collectors.
- Added live collectors for official blog feeds, arXiv, GitHub releases, Hugging Face models, npm packages, and PyPI packages.
- Kept scheduled source results bounded with per-source top limits.
- Updated source statuses so connected sources report healthy or degraded instead of disabled or paused.
- Increased the Daily report limit from 10 to 15 trends.
- Refreshed `src/generated/snapshot.json` with connected source statuses and 15 Daily trends.

## Verification

- `npm run refresh`
- `npm test`
- `npm run build`
- Python ingestion tests
- `npm audit --omit=dev`
- GitHub Pages deployment watch
- Live checks for `/sources/` and `/daily/`

## Prevention

- Treat visible source additions as incomplete until the scheduled refresh output includes them.
- For source work, acceptance checks must include:
  - zero disabled or paused sources unless intentionally documented
  - fresh `lastSync` and `nextSync` values for every scheduled source
  - `/daily/` showing the configured Daily trend count
  - live checks after GitHub Pages deployment
- Prefer a smaller set of reliable official feeds over a broader list that introduces noisy degraded states.

## Follow-Up

- Move source configuration into a shared manifest so product visibility and scheduler coverage cannot drift.
- Add a test that fails when any active source has no collector.
- Add a test that asserts Daily report size matches the configured limit.
