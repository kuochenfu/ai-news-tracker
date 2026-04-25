# ai-news-tracker

A Next.js + TypeScript AI Early Signal Intelligence Engine for tracking early AI and developer adoption signals across Hacker News, X, and GitHub.

## MVP Scope

- Dashboard for today's ranked AI trends.
- Entity detail pages with HN, X, GitHub source breakdowns.
- Daily report page for top trends, new entities, and likely hype.
- Source status page for ingestion health.
- Typed API clients for HN Firebase, X recent search, and GitHub repository search.
- Prisma PostgreSQL schema matching the proposal tables.
- Weighted trend scoring:

```text
0.30 * HN Discussion Score
+ 0.30 * X Velocity Score
+ 0.25 * GitHub Adoption Score
+ 0.10 * Novelty Score
+ 0.05 * Credibility Score
```

## API Notes

- Hacker News uses the official Firebase API: `topstories`, `newstories`, `beststories`, and `item/<id>.json`.
- X recent search requires `X_BEARER_TOKEN`.
- GitHub Trending has no official API; the MVP uses GitHub Search API and optional `GITHUB_TOKEN`.
- OpenAI extraction and summaries will use `OPENAI_API_KEY`.
- PostgreSQL access uses `DATABASE_URL`.

## Scripts

```bash
npm install
npm run refresh
npm run dev
npm test
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
