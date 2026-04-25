-- Trend engine schema expansion for HN + X + GitHub intelligence.

ALTER TABLE raw_events ADD COLUMN body TEXT;
ALTER TABLE raw_events ADD COLUMN author TEXT;
ALTER TABLE raw_events ADD COLUMN published_at TEXT;
ALTER TABLE raw_events ADD COLUMN raw_json TEXT;

CREATE TABLE IF NOT EXISTS entities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    canonical_name TEXT NOT NULL UNIQUE,
    entity_type TEXT NOT NULL,
    aliases TEXT,
    official_url TEXT,
    github_repo_url TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS entity_mentions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_id INTEGER NOT NULL,
    raw_event_id INTEGER NOT NULL,
    source TEXT NOT NULL,
    confidence REAL NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(entity_id) REFERENCES entities(id),
    FOREIGN KEY(raw_event_id) REFERENCES raw_events(id),
    UNIQUE(entity_id, raw_event_id)
);

ALTER TABLE source_metrics ADD COLUMN mention_count INTEGER;
ALTER TABLE source_metrics ADD COLUMN score REAL;
ALTER TABLE source_metrics ADD COLUMN comment_count INTEGER;
ALTER TABLE source_metrics ADD COLUMN repost_count INTEGER;
ALTER TABLE source_metrics ADD COLUMN like_count INTEGER;
ALTER TABLE source_metrics ADD COLUMN star_count INTEGER;
ALTER TABLE source_metrics ADD COLUMN fork_count INTEGER;

ALTER TABLE trend_scores ADD COLUMN hn_score REAL;
ALTER TABLE trend_scores ADD COLUMN x_score REAL;
ALTER TABLE trend_scores ADD COLUMN github_score REAL;
ALTER TABLE trend_scores ADD COLUMN novelty_score REAL;
ALTER TABLE trend_scores ADD COLUMN credibility_score REAL;
ALTER TABLE trend_scores ADD COLUMN final_score REAL;
ALTER TABLE trend_scores ADD COLUMN verdict TEXT;

CREATE TABLE IF NOT EXISTS daily_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL UNIQUE,
    markdown_summary TEXT NOT NULL,
    json_summary TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
