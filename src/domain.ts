import type { TrendScoreBreakdown } from "./trendScoring";

export type SourceName =
  | "hn"
  | "github"
  | "official_blog"
  | "arxiv"
  | "github_releases"
  | "hugging_face"
  | "npm"
  | "pypi"
  | "the_verge"
  | "techcrunch"
  | "mit_tech_review"
  | "thirtysixkr"
  | "ithome_tw"
  | "technews_tw"
  | "tnw";
export type EntityType = "tool" | "repo" | "paper" | "model" | "startup";

export interface SourceBreakdown {
  source: SourceName;
  score: number;
  mentions: number;
  lastSeen: string;
  signal: string;
}

export interface TrendEntity {
  id: string;
  canonicalName: string;
  entityType: EntityType;
  summary: string;
  reason: string;
  officialUrl?: string;
  githubRepoUrl?: string;
  score: TrendScoreBreakdown;
  sources: SourceBreakdown[];
  mentions: RawEvent[];
  history: Array<{ date: string; score: number }>;
}

export interface RawEvent {
  id: string;
  source: SourceName;
  title: string;
  body?: string;
  url?: string;
  author?: string;
  publishedAt: string;
}

export interface SourceStatus {
  source: SourceName;
  label: string;
  status: "healthy" | "degraded" | "disabled";
  lastSync: string | null;
  nextSync: string | null;
  errors: string[];
  notes: string;
}

export interface DailyReport {
  date: string;
  summary: string;
  topTrendIds: string[];
  newEntities: string[];
  highConfidence: string[];
  likelyHype: string[];
}

export interface TrendSnapshot {
  generatedAt?: string;
  trends: TrendEntity[];
  sourceTopTrends: Partial<Record<SourceName, TrendEntity[]>>;
  sourceStatuses: SourceStatus[];
  dailyReport: DailyReport;
}
