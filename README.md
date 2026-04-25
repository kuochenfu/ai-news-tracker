# ai-news-tracker (TypeScript Edition)

AI Early Signal Intelligence Engine for spotting emerging AI/tech trends across Hacker News, X, and GitHub.

## What this repository now provides

- A complete TypeScript rewrite of ingestion helpers and trend scoring logic.
- Source-specific external ID normalization for HN, X, and GitHub.
- Cross-source payload normalizers for HN stories, X posts, and GitHub repository search results.
- Trend scoring engine implementing:

  ```text
  0.30 * HN Discussion Score
+ 0.30 * X Velocity Score
+ 0.25 * GitHub Adoption Score
+ 0.10 * Novelty Score
+ 0.05 * Credibility Score
  ```

- A minimal TypeScript web app (Vite) that renders a trend-score demo.
- GitHub Pages deployment workflow via GitHub Actions.

## Project layout

- `src/core/keys.ts`: external ID normalization helpers.
- `src/core/dedup.ts`: content hash dedup (`title + url + source`).
- `src/core/sources.ts`: payload normalization from HN, X, GitHub into a common shape.
- `src/core/trendScoring.ts`: weighted scoring and verdict classification.
- `src/core/writer.ts`: idempotent SQL writer wrapper.
- `src/main.ts`: small UI demo for score display.
- `.github/workflows/deploy-pages.yml`: CI build + Pages deployment.

## Local development

```bash
npm install
npm run dev
```

## Test

```bash
npm test
```

## Build

```bash
npm run build
```

## Deploy to GitHub Pages

1. Push this repo to GitHub.
2. In repository settings, enable **Pages** and set source to **GitHub Actions**.
3. Ensure your default branch is `main` (workflow triggers on pushes to `main`).
4. Push commits; the `Deploy to GitHub Pages` workflow builds `dist/` and deploys automatically.
