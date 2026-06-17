# ai-news-tracker

A Next.js + TypeScript AI trend intelligence dashboard for tracking first-party releases, research signals, developer adoption, community discussion, and media validation.

## MVP Scope

- Dashboard with a left source switcher and per-source Top 20 lists.
- Entity detail sections with per-source breakdowns.
- Daily report page for top trends, new entities, and likely hype.
- Source status page for ingestion health.
- Typed API clients for HN Firebase, GitHub repository search, and generic RSS feeds.
- Prisma PostgreSQL schema matching the proposal tables.
- Source tier metadata so the product can distinguish first-party origin signals from community discussion, platform adoption, and media validation.
- Entity clustering helpers for repositories, papers, packages, Hugging Face models, canonical URLs, and fallback topics.
- HN and GitHub keep weighted source scoring:

```text
0.55 * HN Discussion Score
+ 0.45 * GitHub Adoption Score
```

- Python ingestion utilities add a tier-aware trend confidence score:

```text
0.05 * Article Relevance
+ 0.25 * First-Party Signal
+ 0.20 * Community Discussion
+ 0.20 * Adoption Velocity
+ 0.10 * Media Validation
+ 0.10 * Novelty
+ 0.10 * Cross-Source Confirmation
```

## Source Tiers

Technology media is treated as validation, not as first-party intelligence.

| Tier | Role | Examples |
| --- | --- | --- |
| Tier 1 | First-party / primary origin | official blogs, arXiv, GitHub releases |
| Tier 2 | Developer/community/adoption | Hacker News, X, GitHub repos, Hugging Face, npm, PyPI |
| Tier 3 | Media validation | technology media RSS and other reporting feeds |

This keeps related but different questions separate:

- `article_relevance_score`: is the article or post about AI?
- `first_party_signal_score`: did the signal originate from a primary source?
- `adoption_velocity_score`: are developer/platform metrics accelerating?
- `trend_confidence_score`: is the same entity confirmed across multiple source tiers?

## API Notes

- Hacker News uses the official Firebase API: `topstories`, `newstories`, `beststories`, and `item/<id>.json`.
- GitHub Trending has no official API; the MVP uses GitHub Search API and optional `GITHUB_TOKEN`.
- Reachable RSS feeds currently included: The Verge, TechCrunch, MIT Technology Review, 36Kr, iThome, TechNews, and The Next Web.
- Sources that returned anti-bot challenges, missing feeds, or blocked crawler responses were not added to the scheduled refresh.
- Per-source Top 10 ranking metrics are documented in `docs/ranking-metrics.md`.
- OpenAI extraction and summaries can be added later with `OPENAI_API_KEY`.
- PostgreSQL access uses `DATABASE_URL`.

## Scripts

```bash
npm install
npm run refresh
npm run dev
npm test
```

Python ingestion verification:

```bash
python3 -B -c "import importlib, inspect, sys; sys.path.insert(0,'.'); mods=['tests.test_ingestion_idempotency','tests.test_trend_engine']; total=0
for m in mods:
    mod=importlib.import_module(m)
    for name, fn in inspect.getmembers(mod, inspect.isfunction):
        if name.startswith('test_'):
            fn(); total += 1
print(f'ran {total} test functions')"
```

## GitHub Pages

The repository includes a GitHub Actions workflow at `.github/workflows/pages.yml`.

- Deploys on pushes to `main` and `codex-restart-typescript-baseline`.
- Can be run manually with `workflow_dispatch`.
- Refreshes trend data and deploys every day at 08:00 and 16:00 Asia/Taipei.
- Uses `GITHUB_PAGES=true` to export the app under `/ai-news-tracker`.

In the GitHub repository settings, set Pages source to **GitHub Actions**.

## Project Layout

- `app/`: Next.js App Router pages for the static dashboard.
- `components/`: reusable dashboard UI.
- `src/`: domain logic, source clients, scoring, and mock data.
- `prisma/`: PostgreSQL schema.
- `test/`: Node test runner tests.
- `ingestion/`: Python ingestion utilities and source-tier intelligence helpers.
- `sql/`: SQLite migrations for ingestion idempotency and historical observations.
