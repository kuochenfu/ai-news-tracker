# ai-news-tracker

AI Early Signal Intelligence Engine for spotting emerging AI/tech trends across Hacker News, X, and GitHub.

## What this repository now provides

- Idempotent ingestion primitives and run metadata tracking.
- Source-specific external ID normalization for HN, X, and GitHub.
- Cross-source payload normalizers for HN stories, X posts, and GitHub repo search results.
- Trend scoring engine implementing:

  ```text
  0.30 * HN Discussion Score
+ 0.30 * X Velocity Score
+ 0.25 * GitHub Adoption Score
+ 0.10 * Novelty Score
+ 0.05 * Credibility Score
  ```

- Expanded SQL schema for:
  - `raw_events`
  - `entities`
  - `entity_mentions`
  - `source_metrics`
  - `trend_scores`
  - `daily_reports`

## Data model

Migrations:

- `sql/001_ingestion_idempotency.sql`: foundational idempotent ingestion tables.
- `sql/002_trend_engine_schema.sql`: trend-engine expansion and analytical tables.

## Python modules

- `ingestion/writer.py`: replay-safe upsert writer for raw events, source metrics, and trend scores.
- `ingestion/keys.py`: external ID normalization helpers.
- `ingestion/dedup.py`: content hash dedup (`title + url + source`).
- `ingestion/sources.py`: payload normalization from HN, X, GitHub into a common shape.
- `ingestion/trend_scoring.py`: weighted scoring and verdict classification.

## Test

```bash
pytest -q
```
