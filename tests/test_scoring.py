import pandas as pd

from src.scoring import ScoringConfig, compute_trend_scores


def _sample_df() -> pd.DataFrame:
    rows = []
    for day in range(1, 15):
        d = pd.Timestamp(f"2026-01-{day:02d}")
        rows.extend(
            [
                {
                    "date": d,
                    "item_id": f"hn-{day}",
                    "source": "hn",
                    "created_at": d,
                    "hn_score": 10 + day,
                    "hn_comments": 4 + day,
                },
                {
                    "date": d,
                    "item_id": f"x-{day}",
                    "source": "x",
                    "created_at": d,
                    "x_engagement_velocity": 100 + (day * 3),
                },
                {
                    "date": d,
                    "item_id": f"gh-{day}",
                    "source": "github",
                    "created_at": d - pd.Timedelta(days=20 if day > 10 else 1),
                    "github_star_delta": 2 + day,
                    "github_fork_delta": 1 + day / 2,
                    "github_total_stars": 100_000 if day > 10 else 500,
                },
            ]
        )
    return pd.DataFrame(rows)


def test_compute_trend_scores_has_explainability_columns():
    scored = compute_trend_scores(_sample_df(), ScoringConfig())

    expected_cols = {
        "base_score",
        "freshness_multiplier",
        "anti_incumbent_penalty",
        "trend_score",
        "norm_hn_score",
        "norm_hn_comments",
        "norm_x_engagement_velocity",
        "norm_github_star_delta",
        "norm_github_fork_delta",
        "subscore_hn",
        "subscore_x",
        "subscore_github",
    }
    assert expected_cols.issubset(set(scored.columns))


def test_anti_incumbent_penalty_reduces_old_high_star_items():
    scored = compute_trend_scores(_sample_df(), ScoringConfig())
    late_gh = scored[(scored["source"] == "github") & (scored["item_id"] == "gh-14")].iloc[0]
    early_gh = scored[(scored["source"] == "github") & (scored["item_id"] == "gh-05")].iloc[0]

    assert late_gh["anti_incumbent_penalty"] > early_gh["anti_incumbent_penalty"]
    assert late_gh["freshness_multiplier"] < early_gh["freshness_multiplier"]
