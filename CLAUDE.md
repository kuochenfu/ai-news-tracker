# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install
npm run refresh      # run the pipeline against live sources; writes src/generated/snapshot.json and .data/
npm run dev          # Next.js dev server
npm run build        # static export to out/
npm run typecheck    # tsc --noEmit
npm test             # typecheck + node:test on test/**/*.test.ts
```

Run a single test file: `node --import tsx --test test/build.test.ts`. Filter by name: add `--test-name-pattern "<name>"`.

`npm run refresh` reads and writes history in `DATA_DIR` (default `.data/`, gitignored). Set `GITHUB_TOKEN` locally to avoid GitHub API rate limits (`GITHUB_TOKEN=$(gh auth token) npm run refresh`). 36Kr serves an anti-bot page to some networks; locally it may fail and fall back to stale data.

CI (`.github/workflows/pages.yml`) runs at 00:00 and 08:00 UTC and on push to `main`. It re-enables its own workflow (GitHub pauses schedules after 60 days of inactivity), checks out the `data` branch into `.data`, refreshes, tests, runs `prisma validate` and `npm audit --omit=dev`, builds, force-pushes history to `data`, and deploys `out/` to GitHub Pages.

## Architecture

The deployed site is a fully static Next.js export with no runtime backend. UI copy is Traditional Chinese.

**Pipeline** (`src/pipeline/`, orchestrated by `scripts/refresh-data.ts`):
1. `collectors.ts`: one collector per source. Each returns uniform `Candidate`s and errors and never throws. All network calls go through `http.ts` (timeout plus bounded retries).
2. `build.ts` (`buildSnapshot`, pure and unit-tested): per-source dedupe, then the AI relevance gate (`relevance.ts`, only for `RELEVANCE_FILTERED` sources), then `sourceScore`, percentile, and Top 10 (`ranking.ts`). Next it links entities across sources (`entity.ts`), carries a failed source's last good items forward as stale (up to 3 days), enriches items from history (`history.ts`: firstSeen, seenBefore, metric change), and selects the Daily with quotas.
3. If fewer than `MIN_FRESH_SOURCES` sources returned fresh data, the refresh exits 1 and nothing is published.

**Score semantics matter.** `scores.source` is only comparable within one source. Anything that mixes sources (home feed, Daily, intensity colours) must use `scores.percentile` and `compareAcrossSources`. Never reintroduce a blended cross-source score.

**Honesty rules.** No inferred history: growth (`metric.change`) and `seenBefore` are `null` when there is no stored observation, and the UI hides them. Missing dates stay `null` and are never replaced with "now". Media and community sources show fewer than 10 items rather than off-topic ones.

**Rendering.** `src/snapshot.ts` exposes the generated snapshot to pages; `src/bulletin.ts` holds zh-TW labels and formatting. When `GITHUB_PAGES=true` the site is served under `/ai-news-tracker`; internal links go through `next/link` or `sitePath()` (`src/paths.ts`).

**Sources.** `src/sources.ts` (metadata, tier, role, feed URL) and `src/domain.ts` (`SourceName`) define them. Adding a source means updating both, adding a collector to `collectAll`, and deciding whether it belongs in `RELEVANCE_FILTERED`. Every source in `activeSourceOrder` must render on all four pages, with an explicit empty state when it has no items.

**Relevance fixture.** `test/fixtures/relevance-labels.ts` holds hand-labelled titles. Changing `relevance.ts` must keep precision ≥ 0.95 and recall ≥ 0.90; add a labelled example for every misjudgement you fix.

`prisma/schema.prisma` is validated in CI but unused at runtime.

## Design

`PRODUCT.md` and `DESIGN.md` (with `.impeccable/design.json`) are the product and visual-system records, and are binding for UI work. The CWA intensity colours (`--i0`…`--i8`) encode within-source percentile and nothing else. Status, links, and warnings use ink tones plus icon, weight, or underline.
