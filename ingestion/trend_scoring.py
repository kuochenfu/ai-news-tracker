from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class TrendScoreInput:
    """Normalized [0, 1] feature inputs used by the trend score engine."""

    hn_discussion_score: float
    x_velocity_score: float
    github_adoption_score: float
    novelty_score: float
    credibility_score: float


@dataclass(frozen=True)
class TrendScoreBreakdown:
    hn_component: float
    x_component: float
    github_component: float
    novelty_component: float
    credibility_component: float
    final_score: float
    verdict: str


WEIGHTS = {
    "hn": 0.30,
    "x": 0.30,
    "github": 0.25,
    "novelty": 0.10,
    "credibility": 0.05,
}


def _clamp_01(value: float) -> float:
    return max(0.0, min(1.0, value))


def classify_verdict(score: float) -> str:
    if score >= 0.75:
        return "high-confidence"
    if score >= 0.50:
        return "watchlist"
    if score >= 0.30:
        return "emerging"
    return "likely-hype"


def compute_trend_score(inputs: TrendScoreInput) -> TrendScoreBreakdown:
    """Compute weighted trend score from normalized source signals.

    Formula:
      0.30 * HN discussion score
    + 0.30 * X velocity score
    + 0.25 * GitHub adoption score
    + 0.10 * novelty score
    + 0.05 * credibility score
    """

    hn = _clamp_01(inputs.hn_discussion_score)
    x = _clamp_01(inputs.x_velocity_score)
    gh = _clamp_01(inputs.github_adoption_score)
    novelty = _clamp_01(inputs.novelty_score)
    credibility = _clamp_01(inputs.credibility_score)

    hn_component = WEIGHTS["hn"] * hn
    x_component = WEIGHTS["x"] * x
    github_component = WEIGHTS["github"] * gh
    novelty_component = WEIGHTS["novelty"] * novelty
    credibility_component = WEIGHTS["credibility"] * credibility

    final_score = hn_component + x_component + github_component + novelty_component + credibility_component
    verdict = classify_verdict(final_score)

    return TrendScoreBreakdown(
        hn_component=hn_component,
        x_component=x_component,
        github_component=github_component,
        novelty_component=novelty_component,
        credibility_component=credibility_component,
        final_score=final_score,
        verdict=verdict,
    )
