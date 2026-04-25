import sqlite3
from datetime import date

from ingestion.dedup import build_content_hash
from ingestion.keys import build_external_id
from ingestion.writer import IngestionWriter


def setup_db() -> sqlite3.Connection:
    conn = sqlite3.connect(":memory:")
    with open("sql/001_ingestion_idempotency.sql", "r", encoding="utf-8") as f:
        conn.executescript(f.read())
    return conn


def test_source_specific_external_ids() -> None:
    assert build_external_id("hn", {"item": {"id": 123}}) == "123"
    assert build_external_id("x", {"tweet_id": "abc"}) == "abc"
    assert (
        build_external_id("github", {"repo_full_name": "openai/openai-python"}, snapshot_date=date(2026, 4, 25))
        == "openai/openai-python:2026-04-25"
    )


def test_content_hash_normalization() -> None:
    first = build_content_hash("Hello  World", "https://example.com/X", "HN")
    second = build_content_hash(" hello world ", "https://example.com/x", "hn")
    assert first == second


def test_upserts_are_idempotent() -> None:
    conn = setup_db()
    writer = IngestionWriter(conn)

    run = writer.start_run()
    writer.upsert_raw_event(
        source="hn",
        external_id="1",
        content_hash=build_content_hash("A", "https://a", "hn"),
        title="A",
        url="https://a",
        payload_json='{"id":1}',
        run_id=run.run_id,
    )
    writer.upsert_raw_event(
        source="hn",
        external_id="1",
        content_hash=build_content_hash("A updated", "https://a", "hn"),
        title="A updated",
        url="https://a",
        payload_json='{"id":1,"updated":true}',
        run_id=run.run_id,
    )

    writer.upsert_source_metric(
        entity_id="openai/openai-python",
        source="github",
        metric_date=date(2026, 4, 25),
        metric_name="stars",
        metric_value=100,
        run_id=run.run_id,
    )
    writer.upsert_source_metric(
        entity_id="openai/openai-python",
        source="github",
        metric_date=date(2026, 4, 25),
        metric_name="stars",
        metric_value=101,
        run_id=run.run_id,
    )

    writer.upsert_trend_score(
        entity_id="openai/openai-python",
        trend_date=date(2026, 4, 25),
        score=0.1,
        run_id=run.run_id,
    )
    writer.upsert_trend_score(
        entity_id="openai/openai-python",
        trend_date=date(2026, 4, 25),
        score=0.2,
        run_id=run.run_id,
    )

    writer.mark_run_error(run.run_id)
    writer.complete_run(run.run_id, status="completed", error_count=1)

    assert conn.execute("SELECT COUNT(*) FROM raw_events").fetchone()[0] == 1
    assert conn.execute("SELECT COUNT(*) FROM source_metrics").fetchone()[0] == 1
    assert conn.execute("SELECT COUNT(*) FROM trend_scores").fetchone()[0] == 1

    updated_title = conn.execute("SELECT title FROM raw_events WHERE source = 'hn' AND external_id = '1'").fetchone()[0]
    assert updated_title == "A updated"

    run_row = conn.execute(
        "SELECT status, error_count, completed_at FROM ingestion_runs WHERE run_id = ?",
        (run.run_id,),
    ).fetchone()
    assert run_row[0] == "completed"
    assert run_row[1] == 1
    assert run_row[2] is not None
