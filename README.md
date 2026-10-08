# ai-news-tracker

A Next.js + TypeScript AI trend intelligence dashboard for tracking first-party releases, research signals, developer adoption, community discussion, and media validation.

## MVP Scope

- Traditional Chinese dashboard: the last 24 hours (`/`), a 15-item Daily (`/daily/`), per-source Top 10 (`/trends/`), and source health (`/sources/`).
- Collectors for HN, GitHub search and releases, arXiv, official blogs, Hugging Face, npm, PyPI, and media RSS, with timeouts and retries.
- An AI relevance gate, per-source ranking, within-source percentiles, and a quota-based Daily. See `docs/ranking-metrics.md`.
- Real history on the `data` branch: first-seen dates, metric changes, and stale fallback when a source fails.

## Source Tiers

Technology media is treated as validation, not as first-party intelligence.

| Tier | Role | Examples |
| --- | --- | --- |
| Tier 1 | First-party / primary origin | official blogs, arXiv, GitHub releases |
| Tier 2 | Developer/community/adoption | Hacker News, GitHub repos, Hugging Face, npm, PyPI |
| Tier 3 | Media validation | technology media RSS and other reporting feeds |

Each item keeps three separate scores: AI relevance, the source's own score, and its percentile within the source. There is no blended cross-source trend score.

## API Notes

- Hacker News uses the official Firebase API: `topstories`, `newstories`, `beststories`, and `item/<id>.json`.
- GitHub Trending has no official API; the MVP uses GitHub Search API and optional `GITHUB_TOKEN`.
- Reachable RSS feeds currently included: The Verge, TechCrunch, MIT Technology Review, 36Kr, iThome, TechNews, and The Next Web.
- Sources that returned anti-bot challenges, missing feeds, or blocked crawler responses were not added to the scheduled refresh.
- Ranking, relevance, history, and failure handling are documented in `docs/ranking-metrics.md`.
- `prisma/schema.prisma` is a PostgreSQL schema that CI validates. Nothing reads or writes it at runtime.

## Scripts

```bash
npm install
npm run refresh
npm run dev
npm test
```

`npm run refresh` reads and writes history in `.data/` (override with `DATA_DIR`). Locally it starts empty. In CI it is the `data` branch.

## GitHub Pages

The repository includes a GitHub Actions workflow at `.github/workflows/pages.yml`.

- Deploys on pushes to `main`.
- Can be run manually with `workflow_dispatch`.
- Refreshes trend data and deploys every day at 08:00 and 16:00 Asia/Taipei.
- Uses `GITHUB_PAGES=true` to export the app under `/ai-news-tracker`.
- Saves refresh history to the `data` branch after a successful build.
- Re-enables itself on every run, so GitHub's 60-day inactivity rule cannot pause the schedule.

In the GitHub repository settings, set Pages source to **GitHub Actions**.

## Project Layout

- `app/`: Next.js App Router pages for the static dashboard.
- `components/`: dashboard UI.
- `src/pipeline/`: collectors, relevance, ranking, entity identity, history, and snapshot assembly.
- `src/`: domain types, source registry, and snapshot accessors for pages.
- `scripts/refresh-data.ts`: runs the pipeline and writes `src/generated/snapshot.json`.
- `test/`: Node test runner tests, including the labelled relevance fixture.
- `prisma/`: PostgreSQL schema (validated only).
