# Source Coverage Retro - 2026-06-17

## Summary

The first implementation added new first-party and adoption sources to the Python ingestion layer, but the deployed Next.js UI reads a separate TypeScript source registry and generated snapshot. As a result, the new sources did not appear on the live site until the frontend registry and page-level source coverage were updated.

## Impact

- `/sources/` initially did not show the newly planned sources.
- After the first UI fix, `/sources/` showed the sources, but `/`, `/trends/`, and `/daily/` still did not reflect them consistently.
- The live site created a misleading impression that source expansion had not been implemented.

## Root Cause

The project has two source models:

- Python ingestion model: `ingestion/source_registry.py`
- Next.js UI model: `src/sources.ts`, `src/domain.ts`, and `src/generated/snapshot.json`

The original change updated the ingestion model but did not update all frontend consumers. The page-level logic also filtered sources by current ranked results, so planned sources with no observations were hidden from dashboard views.

## What Worked

- TypeScript caught the missing `SourceName` cases in `SourcePill`.
- GitHub Pages deployment checks made it clear when the production site had updated.
- Direct HTML checks against `/`, `/trends/`, `/daily/`, and `/sources/` verified the final behavior.

## What Did Not Work

- Source metadata was duplicated across Python and TypeScript without an explicit synchronization check.
- The initial acceptance check only looked at `/sources/`, not every page that communicates source coverage.
- Ranking pages treated "no ranked observations" as "source does not exist."

## Fixes Shipped

- Added planned sources to `src/domain.ts` and `src/sources.ts`.
- Added source tier, type, and role metadata to frontend source definitions.
- Updated `/sources/` to show all defined sources, including planned connectors.
- Added `components/SourceCoverage.tsx`.
- Updated `/` and `/trends/` to show all defined sources with empty states when no ranked observations exist.
- Updated `/daily/` with source coverage across all defined sources.

## Prevention

- Treat `src/sources.ts` as the source of truth for visible site navigation and status until the Python and TypeScript source registries are generated from one shared manifest.
- Any future source addition must update or generate both:
  - ingestion source metadata
  - frontend source metadata and UI coverage
- Acceptance checks for source changes must include:
  - `/`
  - `/trends/`
  - `/daily/`
  - `/sources/`
- Empty states should be explicit for planned sources, rather than filtering them out.

## Follow-Up

- Create a shared `sources.json` manifest and generate both `src/sources.ts` and `ingestion/source_registry.py` from it.
- Add a test that asserts every `activeSourceOrder` entry appears on `/`, `/trends/`, `/daily/`, and `/sources/` after static build.
