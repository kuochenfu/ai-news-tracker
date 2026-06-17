from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable


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


@dataclass(frozen=True)
class TrendIntelligenceInput:
    """Normalized [0, 1] inputs for tier-aware trend confidence."""

    article_relevance_score: float
    first_party_signal_score: float
    community_discussion_score: float
    adoption_velocity_score: float
    media_validation_score: float
    novelty_score: float
    source_tier_count: int


@dataclass(frozen=True)
class TrendIntelligenceBreakdown:
    article_relevance_component: float
    first_party_component: float
    community_component: float
    adoption_velocity_component: float
    media_validation_component: float
    novelty_component: float
    cross_source_confirmation_component: float
    trend_confidence_score: float
    verdict: str


WEIGHTS = {
    "hn": 0.30,
    "x": 0.30,
    "github": 0.25,
    "novelty": 0.10,
    "credibility": 0.05,
}

INTELLIGENCE_WEIGHTS = {
    "article_relevance": 0.05,
    "first_party": 0.25,
    "community": 0.20,
    "adoption_velocity": 0.20,
    "media_validation": 0.10,
    "novelty": 0.10,
    "cross_source_confirmation": 0.10,
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


def compute_growth_velocity_score(current_value: float, previous_value: float | None) -> float:
    """Score metric growth without requiring long historical backfill.

    A 50% or greater positive delta maps to 1.0. Flat or negative growth maps
    to 0.0. A new non-zero metric with no previous snapshot maps to 0.5.
    """

    current = max(0.0, current_value)
    if previous_value is None:
        return 0.5 if current > 0 else 0.0
    previous = max(0.0, previous_value)
    if previous == 0:
        return 1.0 if current > 0 else 0.0
    growth_ratio = (current - previous) / previous
    return _clamp_01(growth_ratio / 0.50)


def compute_cross_source_confirmation_score(source_tiers: Iterable[int]) -> float:
    """Reward validation across first-party, community/platform, and media tiers."""

    distinct_tiers = {tier for tier in source_tiers if tier in {1, 2, 3}}
    return _clamp_01(len(distinct_tiers) / 3)


def compute_trend_intelligence_score(inputs: TrendIntelligenceInput) -> TrendIntelligenceBreakdown:
    """Compute tier-aware trend confidence.

    This intentionally separates article relevance from trend confidence so
    media pickup cannot masquerade as first-party evidence.
    """

    article_relevance = _clamp_01(inputs.article_relevance_score)
    first_party = _clamp_01(inputs.first_party_signal_score)
    community = _clamp_01(inputs.community_discussion_score)
    adoption_velocity = _clamp_01(inputs.adoption_velocity_score)
    media_validation = _clamp_01(inputs.media_validation_score)
    novelty = _clamp_01(inputs.novelty_score)
    cross_source_confirmation = compute_cross_source_confirmation_score(range(1, inputs.source_tier_count + 1))

    article_relevance_component = INTELLIGENCE_WEIGHTS["article_relevance"] * article_relevance
    first_party_component = INTELLIGENCE_WEIGHTS["first_party"] * first_party
    community_component = INTELLIGENCE_WEIGHTS["community"] * community
    adoption_velocity_component = INTELLIGENCE_WEIGHTS["adoption_velocity"] * adoption_velocity
    media_validation_component = INTELLIGENCE_WEIGHTS["media_validation"] * media_validation
    novelty_component = INTELLIGENCE_WEIGHTS["novelty"] * novelty
    cross_source_confirmation_component = INTELLIGENCE_WEIGHTS["cross_source_confirmation"] * cross_source_confirmation

    trend_confidence_score = (
        article_relevance_component
        + first_party_component
        + community_component
        + adoption_velocity_component
        + media_validation_component
        + novelty_component
        + cross_source_confirmation_component
    )

    return TrendIntelligenceBreakdown(
        article_relevance_component=article_relevance_component,
        first_party_component=first_party_component,
        community_component=community_component,
        adoption_velocity_component=adoption_velocity_component,
        media_validation_component=media_validation_component,
        novelty_component=novelty_component,
        cross_source_confirmation_component=cross_source_confirmation_component,
        trend_confidence_score=trend_confidence_score,
        verdict=classify_verdict(trend_confidence_score),
    )
