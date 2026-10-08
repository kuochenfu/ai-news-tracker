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
  | "tnw"
  | "nstc_tw"
  | "eu_digital"
  | "qbitai"
  | "the_decoder"
  | "itmedia_ai"
  | "aitimes_kr";

/** Where a publisher is based, or which region an event concerns. "global" means not tied to one region. */
export type Region = "us" | "china" | "taiwan" | "europe" | "japan" | "korea" | "global";

/** What kind of evidence a source provides; coverage is counted per role. */
export type DataRole = "official" | "research" | "media" | "community" | "platform";
export type EntityType = "tool" | "repo" | "release" | "paper" | "model" | "package" | "article" | "story";

/**
 * Scores are kept separate on purpose; none of them is a cross-source "trend score".
 * - relevance: is it about AI (0–1)? null for sources that are AI-only by construction.
 * - source: the source's own ranking score (0–1); comparable only within that source.
 * - percentile: rank within the source's candidate pool (0–1); the value lists and
 *   intensity colours use, because it means the same thing in every source.
 */
export interface TrendScores {
  relevance: number | null;
  source: number;
  percentile: number;
}

/** A real popularity measure from the source, with change since an earlier observation when known. */
export interface TrendMetric {
  name: string;
  label: string;
  value: number;
  /** null: no earlier observation yet, so growth is unknown. */
  change: { value: number; days: number } | null;
}

export interface RawEvent {
  id: string;
  source: SourceName;
  title: string;
  body?: string;
  url?: string;
  author?: string;
  publishedAt: string | null;
}

export interface TrendEntity {
  id: string;
  /** Primary identity key, stable across refreshes (see src/pipeline/entity.ts). */
  entityKey: string;
  source: SourceName;
  rank: number;
  canonicalName: string;
  entityType: EntityType;
  summary: string;
  officialUrl?: string;
  githubRepoUrl?: string;
  publishedAt: string | null;
  scores: TrendScores;
  metric?: TrendMetric;
  /** When this tracker first observed the entity (from stored history). */
  firstSeen: string;
  /** Whether an earlier issue already carried this entity; null when no history exists yet. */
  seenBefore: boolean | null;
  /** Organisation the item comes from (lab, project, agency); null for reports about others (media, community). */
  origin: string | null;
  /** Who published this item: the organisation for first-party items, the outlet or community otherwise. */
  publisher: string;
  publisherRegion: Region;
  /** Regions the item concerns, inferred from names in the text; may be several or none. */
  eventRegions: Region[];
  /**
   * Other sources in this issue carrying the same entity. Independent ones come from a
   * different origin or outlet; same-origin ones (a lab's release, its package) are echoes
   * and never count as confirmation.
   */
  corroboration: { independent: SourceName[]; sameOrigin: SourceName[] };
  /** Identity of the linked group across sources; lists show one item per cluster. */
  cluster: string;
  /** True when the item is carried over from the last good refresh because its source failed. */
  stale?: boolean;
  mentions: RawEvent[];
}

export interface SourceStatus {
  source: SourceName;
  label: string;
  /** healthy: fresh and complete; degraded: fresh but partial; stale: showing the last good data; failed: nothing usable. */
  status: "healthy" | "degraded" | "stale" | "failed";
  /** When this source last returned fresh data. */
  lastSync: string | null;
  nextSync: string | null;
  candidateCount: number;
  rankedCount: number;
  /** Candidates dropped by the AI relevance threshold. */
  filteredOut: number;
  /** Per-publisher health for stations that aggregate several publishers. */
  feeds?: Array<{ publisher: string; region: Region; ok: boolean }>;
  errors: string[];
}

export interface DailyReport {
  date: string;
  topTrendIds: string[];
  /** Entities this issue observed for the first time. */
  newEntityIds: string[];
}

export type { CoverageReport } from "./pipeline/coverage";
import type { CoverageReport } from "./pipeline/coverage";

export interface TrendSnapshot {
  schemaVersion: 3;
  generatedAt: string;
  previousGeneratedAt: string | null;
  /** Days of stored history this issue could compare against. */
  historyDays: number;
  sourceTopTrends: Partial<Record<SourceName, TrendEntity[]>>;
  sourceStatuses: SourceStatus[];
  dailyReport: DailyReport;
  /** Regional availability and actual coverage; see src/pipeline/coverage.ts. */
  coverage: CoverageReport;
}
