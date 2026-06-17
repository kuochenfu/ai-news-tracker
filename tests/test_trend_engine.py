import sqlite3
from datetime import datetime, timezone

from ingestion.dedup import build_content_hash
from ingestion.entity_clustering import canonicalize_entity, cluster_events
from ingestion.source_registry import get_source_metadata
from ingestion.sources import (
    parse_arxiv_paper,
    parse_github_release,
    parse_github_repo,
    parse_hn_story,
    parse_hugging_face_model,
    parse_official_blog_post,
    parse_package_release,
    parse_x_post,
)
from ingestion.trend_scoring import (
    TrendIntelligenceInput,
    TrendScoreInput,
    classify_verdict,
    compute_cross_source_confirmation_score,
    compute_growth_velocity_score,
    compute_trend_intelligence_score,
    compute_trend_score,
)
from ingestion.writer import IngestionWriter


def test_trend_score_formula() -> None:
    result = compute_trend_score(
        TrendScoreInput(
            hn_discussion_score=0.8,
            x_velocity_score=0.5,
            github_adoption_score=0.6,
            novelty_score=1.0,
            credibility_score=0.4,
        )
    )

    assert round(result.final_score, 3) == 0.66
    assert result.verdict == "watchlist"


def test_trend_score_clamps_inputs() -> None:
    result = compute_trend_score(
        TrendScoreInput(
            hn_discussion_score=2.0,
            x_velocity_score=-5.0,
            github_adoption_score=1.0,
            novelty_score=1.0,
            credibility_score=1.0,
        )
    )
    assert round(result.final_score, 2) == 0.70


def test_verdict_bands() -> None:
    assert classify_verdict(0.2) == "likely-hype"
    assert classify_verdict(0.4) == "emerging"
    assert classify_verdict(0.55) == "watchlist"
    assert classify_verdict(0.8) == "high-confidence"


def test_source_normalizers() -> None:
    hn = parse_hn_story({"id": 1, "title": "T", "by": "a", "score": 10, "descendants": 3})
    assert hn["external_id"] == "1"
    assert hn["source"] == "hn"

    x = parse_x_post(
        {
            "id": "20",
            "author_id": "u1",
            "text": "new model",
            "created_at": "2026-04-25T00:00:00Z",
            "public_metrics": {"like_count": 5, "retweet_count": 2, "reply_count": 1, "quote_count": 0},
        },
        includes={"users": [{"id": "u1", "username": "alice"}]},
    )
    assert x["author"] == "alice"
    assert x["repost_count"] == 2

    gh = parse_github_repo(
        {
            "id": 99,
            "full_name": "openai/openai-python",
            "owner": {"login": "openai"},
            "stargazers_count": 100,
            "forks_count": 11,
        }
    )
    assert gh["source"] == "github"
    assert gh["stars"] == 100
    assert gh["source_type"] == "platform"
    assert gh["signal_role"] == "adoption"


def test_primary_source_normalizers_are_tiered() -> None:
    arxiv = parse_arxiv_paper(
        {
            "id": "2601.12345",
            "title": "Efficient Agentic Reasoning",
            "summary": "A paper about agent planning.",
            "authors": [{"name": "Ada Lovelace"}],
            "published": "2026-01-01T00:00:00Z",
        }
    )
    assert arxiv["source"] == "arxiv"
    assert arxiv["source_tier"] == 1
    assert arxiv["signal_role"] == "origin"

    release = parse_github_release(
        {
            "id": 123,
            "name": "v1.2.0",
            "tag_name": "v1.2.0",
            "body": "New agent runtime",
            "html_url": "https://github.com/acme/agent/releases/tag/v1.2.0",
        },
        repo_full_name="acme/agent",
    )
    assert release["source_type"] == "first_party"
    assert release["repo_full_name"] == "acme/agent"

    model = parse_hugging_face_model({"modelId": "acme/tiny-agent", "downloads": 100, "likes": 9})
    assert model["source"] == "hugging_face"
    assert model["signal_role"] == "adoption"

    package = parse_package_release({"name": "agent-kit", "version": "0.2.0"}, "npm")
    assert package["external_id"] == "agent-kit:0.2.0"
    assert package["source_type"] == "platform"

    blog = parse_official_blog_post({"guid": "post-1", "title": "Launch", "link": "https://example.com/launch"}, "Acme AI")
    assert blog["source_tier"] == 1
    assert blog["author"] == "Acme AI"


def test_source_registry_classifies_media_as_validation() -> None:
    metadata = get_source_metadata("media:techcrunch")
    assert metadata.source_type == "media"
    assert metadata.signal_role == "validation"
    assert metadata.tier == 3


def test_entity_clustering_groups_canonical_sources() -> None:
    repo_event = parse_github_repo(
        {
            "id": 1,
            "full_name": "Acme/Agent",
            "owner": {"login": "Acme"},
            "html_url": "https://github.com/Acme/Agent",
        }
    )
    release_event = parse_github_release(
        {
            "id": 2,
            "name": "v1",
            "tag_name": "v1",
            "html_url": "https://github.com/acme/agent/releases/tag/v1",
        },
        repo_full_name="acme/agent",
    )

    candidate = canonicalize_entity(repo_event)
    assert candidate.canonical_name == "acme/agent"
    assert candidate.entity_type == "repository"

    clusters = cluster_events([repo_event, release_event])
    assert list(clusters) == ["acme/agent"]
    assert len(clusters["acme/agent"]) == 2


def test_tier_aware_trend_intelligence_score() -> None:
    result = compute_trend_intelligence_score(
        TrendIntelligenceInput(
            article_relevance_score=1.0,
            first_party_signal_score=0.8,
            community_discussion_score=0.7,
            adoption_velocity_score=0.5,
            media_validation_score=0.4,
            novelty_score=0.9,
            source_tier_count=3,
        )
    )

    assert round(result.trend_confidence_score, 2) == 0.72
    assert result.verdict == "watchlist"
    assert compute_growth_velocity_score(150, 100) == 1.0
    assert compute_growth_velocity_score(110, 100) == 0.2
    assert compute_cross_source_confirmation_score([1, 1, 2, 3]) == 1.0


def test_schema_migration_builds_requested_tables() -> None:
    conn = sqlite3.connect(":memory:")
    with open("sql/001_ingestion_idempotency.sql", "r", encoding="utf-8") as f:
        conn.executescript(f.read())
    with open("sql/002_trend_engine_schema.sql", "r", encoding="utf-8") as f:
        conn.executescript(f.read())
    with open("sql/003_source_tiers_and_observations.sql", "r", encoding="utf-8") as f:
        conn.executescript(f.read())

    table_names = {
        row[0]
        for row in conn.execute(
            "SELECT name FROM sqlite_master WHERE type = 'table'"
        ).fetchall()
    }

    assert "entities" in table_names
    assert "entity_mentions" in table_names
    assert "source_observations" in table_names
    assert "daily_reports" in table_names


def test_writer_records_entity_mentions_and_observations() -> None:
    conn = sqlite3.connect(":memory:")
    with open("sql/001_ingestion_idempotency.sql", "r", encoding="utf-8") as f:
        conn.executescript(f.read())
    with open("sql/002_trend_engine_schema.sql", "r", encoding="utf-8") as f:
        conn.executescript(f.read())
    with open("sql/003_source_tiers_and_observations.sql", "r", encoding="utf-8") as f:
        conn.executescript(f.read())

    writer = IngestionWriter(conn)
    run = writer.start_run()
    raw_event_id = writer.upsert_raw_event(
        source="github_releases",
        external_id="acme/agent:v1",
        content_hash=build_content_hash("v1", "https://github.com/acme/agent/releases/tag/v1", "github_releases"),
        title="v1",
        url="https://github.com/acme/agent/releases/tag/v1",
        payload_json='{"tag_name":"v1"}',
        run_id=run.run_id,
    )
    entity_id = writer.upsert_entity(
        canonical_name="acme/agent",
        entity_type="repository",
        aliases=["Acme Agent"],
        github_repo_url="https://github.com/acme/agent",
    )
    writer.link_entity_mention(
        entity_id=entity_id,
        raw_event_id=raw_event_id,
        source="github_releases",
        confidence=0.98,
    )
    writer.record_source_observation(
        entity_id=entity_id,
        raw_event_id=raw_event_id,
        source="github_releases",
        metric_name="release_count",
        metric_value=1,
        observed_at=datetime(2026, 1, 1, tzinfo=timezone.utc),
        run_id=run.run_id,
    )
    writer.upsert_trend_intelligence_score(
        entity_id="acme/agent",
        trend_date=datetime(2026, 1, 1, tzinfo=timezone.utc).date(),
        article_relevance_score=1.0,
        first_party_signal_score=1.0,
        community_discussion_score=0.4,
        adoption_velocity_score=0.5,
        media_validation_score=0.0,
        cross_source_confirmation_score=0.33,
        novelty_score=0.9,
        final_score=0.6,
        verdict="watchlist",
        run_id=run.run_id,
    )

    raw_row = conn.execute("SELECT source_type, signal_role, source_tier FROM raw_events").fetchone()
    assert raw_row == ("first_party", "origin", 1)
    assert conn.execute("SELECT COUNT(*) FROM entity_mentions").fetchone()[0] == 1
    assert conn.execute("SELECT COUNT(*) FROM source_observations").fetchone()[0] == 1
    score_row = conn.execute(
        "SELECT first_party_signal_score, final_score, verdict FROM trend_scores WHERE entity_id = 'acme/agent'"
    ).fetchone()
    assert score_row == (1.0, 0.6, "watchlist")
