from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, Iterable, List

import numpy as np
import pandas as pd


@dataclass(frozen=True)
class RollingRobustScalerConfig:
    """Configuration for rolling robust normalization."""

    window_days: int = 30
    min_periods: int = 7
    min_iqr: float = 1e-6
    clip_min: float = -5.0
    clip_max: float = 5.0


@dataclass(frozen=True)
class CalibrationConfig:
    """Controls for freshness + anti-incumbent calibration."""

    freshness_half_life_days: float = 7.0
    anti_incumbent_strength: float = 0.35
    anti_incumbent_reference_stars: float = 5_000.0
    anti_incumbent_age_floor_days: int = 14


@dataclass(frozen=True)
class ScoringConfig:
    """End-to-end scoring configuration."""

    rolling: RollingRobustScalerConfig = field(default_factory=RollingRobustScalerConfig)
    calibration: CalibrationConfig = field(default_factory=CalibrationConfig)
    source_feature_weights: Dict[str, Dict[str, float]] = field(
        default_factory=lambda: {
            "hn": {"hn_score": 0.6, "hn_comments": 0.4},
            "x": {"x_engagement_velocity": 1.0},
            "github": {"github_star_delta": 0.7, "github_fork_delta": 0.3},
        }
    )
    global_source_weights: Dict[str, float] = field(
        default_factory=lambda: {"hn": 0.35, "x": 0.30, "github": 0.35}
    )


REQUIRED_COLUMNS = {"date", "item_id", "source", "created_at"}


def _require_columns(df: pd.DataFrame, required: Iterable[str]) -> None:
    missing = set(required) - set(df.columns)
    if missing:
        raise ValueError(f"Missing required columns: {sorted(missing)}")


def _normalize_feature_by_source(
    df: pd.DataFrame,
    feature: str,
    config: RollingRobustScalerConfig,
) -> pd.Series:
    """
    Per-source daily rolling robust normalization.

    1) robust z-score with median / IQR
    2) fallback percentile-rank transform when IQR is near-zero
    """

    out = pd.Series(index=df.index, dtype="float64")

    for source, source_frame in df.groupby("source", sort=False):
        source_frame = source_frame.sort_values("date")
        dates = source_frame["date"]
        values = source_frame[feature]

        roll = (
            pd.DataFrame({"date": dates, "value": values})
            .set_index("date")
            .rolling(
                f"{config.window_days}D",
                min_periods=config.min_periods,
            )
        )

        med = roll["value"].median().reset_index(drop=True)
        q1 = roll["value"].quantile(0.25).reset_index(drop=True)
        q3 = roll["value"].quantile(0.75).reset_index(drop=True)
        iqr = q3 - q1

        robust_z = (values.reset_index(drop=True) - med) / iqr.clip(lower=config.min_iqr)

        # percentile-rank fallback for low-variance windows
        pct_values: List[float] = []
        for idx in range(len(source_frame)):
            current_date = source_frame.iloc[idx]["date"]
            window_mask = (
                (source_frame["date"] > current_date - pd.Timedelta(days=config.window_days))
                & (source_frame["date"] <= current_date)
            )
            window = source_frame.loc[window_mask, feature]
            if len(window) < config.min_periods:
                pct_values.append(np.nan)
                continue
            rank = (window <= source_frame.iloc[idx][feature]).sum() / len(window)
            pct_values.append(float(rank * 2.0 - 1.0))

        percentile_scaled = pd.Series(pct_values)
        use_percentile = iqr < config.min_iqr * 10
        normalized = robust_z.where(~use_percentile, percentile_scaled)
        normalized = normalized.clip(config.clip_min, config.clip_max)

        out.loc[source_frame.index] = normalized.values

    return out


def _weighted_sum(df: pd.DataFrame, columns_to_weights: Dict[str, float]) -> pd.Series:
    total_weight = float(sum(columns_to_weights.values()))
    if total_weight <= 0:
        raise ValueError("Weights must sum to a positive value")

    result = pd.Series(0.0, index=df.index)
    for col, weight in columns_to_weights.items():
        if col not in df.columns:
            result += 0.0
        else:
            result += df[col].fillna(0.0) * float(weight)
    return result / total_weight


def compute_trend_scores(raw_df: pd.DataFrame, config: ScoringConfig | None = None) -> pd.DataFrame:
    """
    Computes explainable trend scores with:
    - per-source, rolling robust normalization
    - source sub-scores
    - global weighted blend
    - freshness decay
    - anti-incumbent penalty

    Returns one row per input item/day with all intermediate components for persistence.
    """

    config = config or ScoringConfig()
    _require_columns(raw_df, REQUIRED_COLUMNS)

    df = raw_df.copy()
    df["date"] = pd.to_datetime(df["date"]).dt.normalize()
    df["created_at"] = pd.to_datetime(df["created_at"])

    # Normalize each configured feature per source.
    normalized_cols: List[str] = []
    configured_features = {
        feature
        for source_mapping in config.source_feature_weights.values()
        for feature in source_mapping.keys()
    }
    for feature in configured_features:
        norm_col = f"norm_{feature}"
        if feature in df.columns:
            df[norm_col] = _normalize_feature_by_source(df, feature, config.rolling)
        else:
            df[norm_col] = np.nan
        normalized_cols.append(norm_col)

    # Build source sub-scores from normalized components.
    for source, feature_weights in config.source_feature_weights.items():
        norm_weights = {f"norm_{k}": v for k, v in feature_weights.items()}
        score_col = f"subscore_{source}"
        df[score_col] = np.where(
            df["source"] == source,
            _weighted_sum(df, norm_weights),
            0.0,
        )

    # Global weighted source blend.
    for source in config.global_source_weights:
        score_col = f"subscore_{source}"
        if score_col not in df.columns:
            df[score_col] = 0.0

    global_components = {f"subscore_{k}": v for k, v in config.global_source_weights.items()}
    df["base_score"] = _weighted_sum(df, global_components)

    # Freshness decay.
    age_days = (df["date"] - df["created_at"].dt.normalize()).dt.days.clip(lower=0)
    decay = np.exp(-np.log(2.0) * (age_days / config.calibration.freshness_half_life_days))
    df["freshness_multiplier"] = decay

    # Anti-incumbent control (prevents old/high-star incumbents from dominating).
    total_stars = pd.to_numeric(df.get("github_total_stars", 0.0), errors="coerce").fillna(0.0)
    stars_ratio = np.log1p(total_stars) / np.log1p(config.calibration.anti_incumbent_reference_stars)
    age_gate = (age_days >= config.calibration.anti_incumbent_age_floor_days).astype(float)
    penalty = config.calibration.anti_incumbent_strength * stars_ratio.clip(lower=0.0) * age_gate
    df["anti_incumbent_penalty"] = penalty.clip(lower=0.0, upper=0.95)

    df["trend_score"] = df["base_score"] * df["freshness_multiplier"] * (1.0 - df["anti_incumbent_penalty"])

    # Explainability components ready to persist.
    ordered_cols = [
        "date",
        "item_id",
        "source",
        "base_score",
        "freshness_multiplier",
        "anti_incumbent_penalty",
        "trend_score",
        *normalized_cols,
        *[f"subscore_{s}" for s in config.source_feature_weights.keys()],
    ]

    # Keep original raw features if present for traceability.
    raw_feature_cols = [c for c in configured_features if c in df.columns]
    optional_cols = [c for c in ["github_total_stars", "created_at"] if c in df.columns]

    result_cols = [c for c in ordered_cols if c in df.columns] + raw_feature_cols + optional_cols
    return df[result_cols].sort_values(["date", "trend_score"], ascending=[True, False]).reset_index(drop=True)
