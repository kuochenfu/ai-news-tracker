import sqlite3

from ingestion.sources import parse_github_repo, parse_hn_story, parse_x_post
from ingestion.trend_scoring import TrendScoreInput, classify_verdict, compute_trend_score


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


def test_schema_migration_builds_requested_tables() -> None:
    conn = sqlite3.connect(":memory:")
    with open("sql/001_ingestion_idempotency.sql", "r", encoding="utf-8") as f:
        conn.executescript(f.read())
    with open("sql/002_trend_engine_schema.sql", "r", encoding="utf-8") as f:
        conn.executescript(f.read())

    table_names = {
        row[0]
        for row in conn.execute(
            "SELECT name FROM sqlite_master WHERE type = 'table'"
        ).fetchall()
    }

    assert "entities" in table_names
    assert "entity_mentions" in table_names
    assert "daily_reports" in table_names
