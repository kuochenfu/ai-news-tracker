# ai-news-tracker

Track AI news daily with idempotent ingestion primitives.

## What's included

- Source-specific external ID normalization for HN, X, and GitHub metrics snapshots.
- Database migration with uniqueness constraints for `raw_events`, `source_metrics`, and `trend_scores`.
- Upsert-first ingestion writer for replay-safe daily jobs.
- Content-hash deduplication (`title + url + source`) to reduce near-duplicate records.
- Ingestion run metadata capture (`run_id`, start/end timestamps, status, and error counts).

## Run tests

```bash
pytest -q
```
