-- Source tier metadata and historical observations.
-- Media sources are validation signals; first-party/platform/community signals
-- are stored separately so trend confidence can be calculated transparently.

ALTER TABLE raw_events ADD COLUMN source_type TEXT;
ALTER TABLE raw_events ADD COLUMN signal_role TEXT;
ALTER TABLE raw_events ADD COLUMN source_tier INTEGER;
ALTER TABLE raw_events ADD COLUMN source_label TEXT;

CREATE TABLE IF NOT EXISTS source_observations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_id INTEGER NOT NULL,
    raw_event_id INTEGER,
    source TEXT NOT NULL,
    source_type TEXT NOT NULL,
    signal_role TEXT NOT NULL,
    source_tier INTEGER NOT NULL,
    metric_name TEXT NOT NULL,
    metric_value REAL NOT NULL,
    observed_at TEXT NOT NULL,
    run_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(entity_id) REFERENCES entities(id),
    FOREIGN KEY(raw_event_id) REFERENCES raw_events(id),
    FOREIGN KEY(run_id) REFERENCES ingestion_runs(run_id),
    UNIQUE(entity_id, source, metric_name, observed_at)
);

CREATE INDEX IF NOT EXISTS idx_source_observations_entity_time
ON source_observations(entity_id, observed_at);

CREATE INDEX IF NOT EXISTS idx_source_observations_tier
ON source_observations(source_tier, signal_role);

ALTER TABLE trend_scores ADD COLUMN article_relevance_score REAL;
ALTER TABLE trend_scores ADD COLUMN first_party_signal_score REAL;
ALTER TABLE trend_scores ADD COLUMN community_discussion_score REAL;
ALTER TABLE trend_scores ADD COLUMN adoption_velocity_score REAL;
ALTER TABLE trend_scores ADD COLUMN media_validation_score REAL;
ALTER TABLE trend_scores ADD COLUMN cross_source_confirmation_score REAL;
