from __future__ import annotations

import sqlite3
import json
from dataclasses import dataclass
from datetime import date, datetime, timezone
from typing import Any
from uuid import uuid4

from .source_registry import get_source_metadata


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

    def _table_columns(self, table_name: str) -> set[str]:
        return {row[1] for row in self.conn.execute(f"PRAGMA table_info({table_name})").fetchall()}

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

    def upsert_raw_event(self, *, source: str, external_id: str, content_hash: str, title: str | None, url: str | None, payload_json: str, run_id: str) -> int:
        metadata = get_source_metadata(source)
        values: dict[str, Any] = {
            "source": source,
            "external_id": external_id,
            "content_hash": content_hash,
            "title": title,
            "url": url,
            "payload_json": payload_json,
            "first_seen_run_id": run_id,
            "last_seen_run_id": run_id,
            "source_type": metadata.source_type,
            "signal_role": metadata.signal_role,
            "source_tier": metadata.tier,
            "source_label": metadata.label,
        }
        columns = [column for column in values if column in self._table_columns("raw_events")]
        placeholders = ", ".join("?" for _ in columns)
        update_columns = [
            column
            for column in columns
            if column not in {"source", "external_id", "first_seen_run_id"}
        ]
        assignments = ",\n                ".join(
            f"{column} = excluded.{column}" for column in update_columns
        )
        self.conn.execute(
            f"""
            INSERT INTO raw_events({", ".join(columns)})
            VALUES ({placeholders})
            ON CONFLICT(source, external_id)
            DO UPDATE SET
                {assignments},
                updated_at = CURRENT_TIMESTAMP
            """,
            tuple(values[column] for column in columns),
        )
        self.conn.commit()
        row = self.conn.execute(
            "SELECT id FROM raw_events WHERE source = ? AND external_id = ?",
            (source, external_id),
        ).fetchone()
        return int(row[0])

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

    def upsert_trend_intelligence_score(
        self,
        *,
        entity_id: str,
        trend_date: date,
        article_relevance_score: float,
        first_party_signal_score: float,
        community_discussion_score: float,
        adoption_velocity_score: float,
        media_validation_score: float,
        cross_source_confirmation_score: float,
        novelty_score: float,
        final_score: float,
        verdict: str,
        run_id: str,
    ) -> None:
        self.conn.execute(
            """
            INSERT INTO trend_scores(
                entity_id,
                date,
                score,
                run_id,
                article_relevance_score,
                first_party_signal_score,
                community_discussion_score,
                adoption_velocity_score,
                media_validation_score,
                cross_source_confirmation_score,
                novelty_score,
                final_score,
                verdict
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(entity_id, date)
            DO UPDATE SET
                score = excluded.score,
                run_id = excluded.run_id,
                article_relevance_score = excluded.article_relevance_score,
                first_party_signal_score = excluded.first_party_signal_score,
                community_discussion_score = excluded.community_discussion_score,
                adoption_velocity_score = excluded.adoption_velocity_score,
                media_validation_score = excluded.media_validation_score,
                cross_source_confirmation_score = excluded.cross_source_confirmation_score,
                novelty_score = excluded.novelty_score,
                final_score = excluded.final_score,
                verdict = excluded.verdict,
                updated_at = CURRENT_TIMESTAMP
            """,
            (
                entity_id,
                trend_date.isoformat(),
                final_score,
                run_id,
                article_relevance_score,
                first_party_signal_score,
                community_discussion_score,
                adoption_velocity_score,
                media_validation_score,
                cross_source_confirmation_score,
                novelty_score,
                final_score,
                verdict,
            ),
        )
        self.conn.commit()

    def upsert_entity(
        self,
        *,
        canonical_name: str,
        entity_type: str,
        aliases: list[str] | tuple[str, ...] | None = None,
        official_url: str | None = None,
        github_repo_url: str | None = None,
    ) -> int:
        aliases_json = json.dumps(list(aliases or []), sort_keys=True)
        self.conn.execute(
            """
            INSERT INTO entities(canonical_name, entity_type, aliases, official_url, github_repo_url)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(canonical_name)
            DO UPDATE SET
                entity_type = excluded.entity_type,
                aliases = excluded.aliases,
                official_url = COALESCE(excluded.official_url, entities.official_url),
                github_repo_url = COALESCE(excluded.github_repo_url, entities.github_repo_url),
                updated_at = CURRENT_TIMESTAMP
            """,
            (canonical_name, entity_type, aliases_json, official_url, github_repo_url),
        )
        self.conn.commit()
        row = self.conn.execute(
            "SELECT id FROM entities WHERE canonical_name = ?",
            (canonical_name,),
        ).fetchone()
        return int(row[0])

    def link_entity_mention(self, *, entity_id: int, raw_event_id: int, source: str, confidence: float) -> None:
        self.conn.execute(
            """
            INSERT INTO entity_mentions(entity_id, raw_event_id, source, confidence)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(entity_id, raw_event_id)
            DO UPDATE SET
                confidence = excluded.confidence
            """,
            (entity_id, raw_event_id, source, confidence),
        )
        self.conn.commit()

    def record_source_observation(
        self,
        *,
        entity_id: int,
        source: str,
        metric_name: str,
        metric_value: float,
        observed_at: datetime,
        run_id: str,
        raw_event_id: int | None = None,
    ) -> None:
        metadata = get_source_metadata(source)
        self.conn.execute(
            """
            INSERT INTO source_observations(
                entity_id,
                raw_event_id,
                source,
                source_type,
                signal_role,
                source_tier,
                metric_name,
                metric_value,
                observed_at,
                run_id
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(entity_id, source, metric_name, observed_at)
            DO UPDATE SET
                raw_event_id = excluded.raw_event_id,
                metric_value = excluded.metric_value,
                run_id = excluded.run_id
            """,
            (
                entity_id,
                raw_event_id,
                source,
                metadata.source_type,
                metadata.signal_role,
                metadata.tier,
                metric_name,
                metric_value,
                observed_at.isoformat(),
                run_id,
            ),
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
