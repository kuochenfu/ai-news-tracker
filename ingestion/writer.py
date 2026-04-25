from __future__ import annotations

import sqlite3
from dataclasses import dataclass
from datetime import date, datetime, timezone
from typing import Any
from uuid import uuid4


@dataclass(frozen=True)
class RunMetadata:
    run_id: str
    started_at: datetime
    completed_at: datetime | None = None
    status: str = "running"
    error_count: int = 0


class IngestionWriter:
    """Database writer with idempotent upserts for daily ingestion jobs."""

    def __init__(self, connection: sqlite3.Connection):
        self.conn = connection

    def start_run(self) -> RunMetadata:
        metadata = RunMetadata(run_id=str(uuid4()), started_at=datetime.now(timezone.utc))
        self.conn.execute(
            """
            INSERT INTO ingestion_runs(run_id, started_at, status, error_count)
            VALUES (?, ?, ?, ?)
            """,
            (metadata.run_id, metadata.started_at.isoformat(), metadata.status, metadata.error_count),
        )
        self.conn.commit()
        return metadata

    def complete_run(self, run_id: str, status: str, error_count: int = 0) -> None:
        self.conn.execute(
            """
            UPDATE ingestion_runs
            SET completed_at = ?, status = ?, error_count = ?
            WHERE run_id = ?
            """,
            (datetime.now(timezone.utc).isoformat(), status, error_count, run_id),
        )
        self.conn.commit()

    def upsert_raw_event(self, *, source: str, external_id: str, content_hash: str, title: str | None, url: str | None, payload_json: str, run_id: str) -> None:
        self.conn.execute(
            """
            INSERT INTO raw_events(source, external_id, content_hash, title, url, payload_json, first_seen_run_id, last_seen_run_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(source, external_id)
            DO UPDATE SET
                content_hash = excluded.content_hash,
                title = excluded.title,
                url = excluded.url,
                payload_json = excluded.payload_json,
                last_seen_run_id = excluded.last_seen_run_id,
                updated_at = CURRENT_TIMESTAMP
            """,
            (source, external_id, content_hash, title, url, payload_json, run_id, run_id),
        )
        self.conn.commit()

    def upsert_source_metric(self, *, entity_id: str, source: str, metric_date: date, metric_name: str, metric_value: float, run_id: str) -> None:
        self.conn.execute(
            """
            INSERT INTO source_metrics(entity_id, source, date, metric_name, metric_value, run_id)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(entity_id, source, date)
            DO UPDATE SET
                metric_name = excluded.metric_name,
                metric_value = excluded.metric_value,
                run_id = excluded.run_id,
                updated_at = CURRENT_TIMESTAMP
            """,
            (entity_id, source, metric_date.isoformat(), metric_name, metric_value, run_id),
        )
        self.conn.commit()

    def upsert_trend_score(self, *, entity_id: str, trend_date: date, score: float, run_id: str) -> None:
        self.conn.execute(
            """
            INSERT INTO trend_scores(entity_id, date, score, run_id)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(entity_id, date)
            DO UPDATE SET
                score = excluded.score,
                run_id = excluded.run_id,
                updated_at = CURRENT_TIMESTAMP
            """,
            (entity_id, trend_date.isoformat(), score, run_id),
        )
        self.conn.commit()

    def mark_run_error(self, run_id: str) -> None:
        self.conn.execute(
            """
            UPDATE ingestion_runs
            SET error_count = error_count + 1
            WHERE run_id = ?
            """,
            (run_id,),
        )
        self.conn.commit()
