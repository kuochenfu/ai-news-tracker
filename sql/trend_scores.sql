-- Explainable trend score persistence schema.

CREATE TABLE IF NOT EXISTS trend_scores (
  id BIGSERIAL PRIMARY KEY,
  score_date DATE NOT NULL,
  item_id TEXT NOT NULL,
  source TEXT NOT NULL,

  base_score DOUBLE PRECISION NOT NULL,
  freshness_multiplier DOUBLE PRECISION NOT NULL,
  anti_incumbent_penalty DOUBLE PRECISION NOT NULL,
  trend_score DOUBLE PRECISION NOT NULL,

  subscore_hn DOUBLE PRECISION,
  subscore_x DOUBLE PRECISION,
  subscore_github DOUBLE PRECISION,

  norm_hn_score DOUBLE PRECISION,
  norm_hn_comments DOUBLE PRECISION,
  norm_x_engagement_velocity DOUBLE PRECISION,
  norm_github_star_delta DOUBLE PRECISION,
  norm_github_fork_delta DOUBLE PRECISION,

  raw_hn_score DOUBLE PRECISION,
  raw_hn_comments DOUBLE PRECISION,
  raw_x_engagement_velocity DOUBLE PRECISION,
  raw_github_star_delta DOUBLE PRECISION,
  raw_github_fork_delta DOUBLE PRECISION,
  raw_github_total_stars DOUBLE PRECISION,

  explainability JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (score_date, item_id, source)
);

CREATE INDEX IF NOT EXISTS idx_trend_scores_score_date_rank
  ON trend_scores (score_date DESC, trend_score DESC);

CREATE INDEX IF NOT EXISTS idx_trend_scores_source_date
  ON trend_scores (source, score_date DESC);
