# ai-news-tracker

Track AI news daily with explainable trend scoring.

## What this includes

- **Per-source daily feature vectors**:
  - Hacker News: `hn_score`, `hn_comments`
  - X/Twitter: `x_engagement_velocity`
  - GitHub: `github_star_delta`, `github_fork_delta`
- **Rolling robust normalization** (by source/date) using median+IQR, with percentile-rank fallback in low-variance windows.
- **Source sub-scores** from normalized components, then **global source weighting**.
- **Freshness decay** and **anti-incumbent penalty** controls so old high-star repos cannot dominate rankings.
- **Explainability-ready persistence** into `trend_scores`.

## Files

- `src/scoring.py` — normalization + calibration + final `trend_score` computation.
- `src/persistence.py` — maps computed columns to storage payload and emits explainability JSON.
- `sql/trend_scores.sql` — schema for score storage with intermediate components.
- `tests/test_scoring.py` — baseline behavior checks.

## Quick start

```python
import pandas as pd
from src.scoring import compute_trend_scores
from src.persistence import prepare_trend_scores_for_storage

raw = pd.DataFrame([
    {
        "date": "2026-04-20",
        "item_id": "gh-foo",
        "source": "github",
        "created_at": "2026-03-15",
        "github_star_delta": 120,
        "github_fork_delta": 18,
        "github_total_stars": 82000,
    }
])

scored = compute_trend_scores(raw)
rows_for_db = prepare_trend_scores_for_storage(scored)
```
