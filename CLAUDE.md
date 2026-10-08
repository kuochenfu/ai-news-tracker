# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install
npm run refresh      # hit live sources, rewrite src/generated/snapshot.json
npm run dev          # Next.js dev server
npm run build        # static export to out/
npm run typecheck    # tsc --noEmit
npm test             # typecheck + node:test on test/trendScoring.test.ts
```

Run a single TS test: `node --import tsx --test --test-name-pattern "<name>" test/trendScoring.test.ts`

Python ingestion tests have no pytest dependency; they are plain `test_*` functions. Run them **from the repo root** (they open `sql/*.sql` by relative path):

```bash
python3 -B -c "import importlib, inspect, sys; sys.path.insert(0,'.'); mods=['tests.test_ingestion_idempotency','tests.test_trend_engine']; total=0
for m in mods:
    mod=importlib.import_module(m)
    for name, fn in inspect.getmembers(mod, inspect.isfunction):
        if name.startswith('test_'):
            fn(); total += 1
print(f'ran {total} test functions')"
```

Single Python test: `python3 -B -c "import sys; sys.path.insert(0,'.'); from tests.test_trend_engine import test_x; test_x()"`

CI (`.github/workflows/pages.yml`) runs: `npm run refresh` → `npm test` → `npx prisma validate` → `npm audit --omit=dev` → `npm run build`, then deploys `out/` to GitHub Pages. It runs on push to `main`, manually, and on cron at 08:00/16:00 Asia/Taipei.

## Architecture

The deployed site is a **fully static** Next.js App Router export (`output: "export"`). There is no runtime backend or DB access in the deployed site.

Data flow:

1. `scripts/refresh-data.ts` is the real collector. It fetches each source (HN Firebase, GitHub Search, RSS media feeds, official blogs, arXiv, GitHub releases, Hugging Face, npm, PyPI), scores items per source (formulas in `docs/ranking-metrics.md`), and writes one JSON snapshot: `src/generated/snapshot.json` (trends, per-source top lists, source statuses, daily report).
2. `src/mockData.ts` (despite the name) imports that snapshot and exposes `trends`, `sourceTopTrends`, `sourceStatuses`, `dailyReport` to pages.
3. Pages in `app/` (`/`, `/trends/`, `/daily/`, `/sources/`) render from that data at build time.

Ranking is **per source**: each source has its own top-N list. There is no global cross-source ranking in the UI yet. HN/GitHub also feed `computeTrendScore` in `src/trendScoring.ts` (`0.55 * HN + 0.45 * GitHub`).

Base path: when `GITHUB_PAGES=true`, the site is served under `/ai-news-tracker`. Internal links must go through `sitePath()` in `src/paths.ts`. `next.config.mjs` handles the asset prefix.

### Two parallel source models (important)

- **TypeScript / UI**: `src/domain.ts` (`SourceName` union), `src/sources.ts` (`sourceMetadata`, `activeSourceOrder`, tiers/roles/feed URLs). This is the source of truth for what the site shows.
- **Python / ingestion**: `ingestion/` (`source_registry.py`, parsers in `sources.py`, entity clustering, idempotency keys/dedup, tier-aware `trend_scoring.py`, SQLite `writer.py`) plus `sql/` migrations. This layer is **not invoked** by `npm run refresh` or CI. It is a separate library that is tested on its own.
- `prisma/schema.prisma` is a PostgreSQL schema (`DATABASE_URL`) that CI only validates. The app does not use it at runtime.

Adding or changing a source therefore means updating `src/domain.ts`, `src/sources.ts`, the collector in `scripts/refresh-data.ts`, and `ingestion/source_registry.py`. See `docs/retrospectives/` for why. Acceptance checks for source changes:
- Every source in `activeSourceOrder` shows on `/`, `/trends/`, `/daily/`, and `/sources/`. Sources with no observations get an explicit empty state (`components/SourceCoverage.tsx`) and are not filtered out.
- After a refresh, no source is disabled or paused unless that is intentional, and every source has fresh `lastSync`/`nextSync`.
- Prefer a few reliable official feeds over many brittle ones. Feeds that return anti-bot challenges are excluded.

Source tiers: Tier 1 = first-party origin (official blogs, arXiv, GitHub releases), Tier 2 = community/adoption (HN, X, GitHub, HF, npm, PyPI), Tier 3 = media validation (tech RSS). Media is treated as validation, not as a primary signal.

## Env

`.env.example`: `DATABASE_URL`, `GITHUB_TOKEN` (optional, raises GitHub API rate limits), `OPENAI_API_KEY` (not used yet). CI also passes `X_BEARER_TOKEN`.
