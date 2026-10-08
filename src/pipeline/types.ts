import type { EntityType, SourceName } from "../domain";

/** One item as a collector found it, before relevance, ranking, or history. */
export interface Candidate {
  source: SourceName;
  externalId: string;
  title: string;
  body?: string;
  url?: string;
  author?: string;
  /** ISO timestamp, or null when the source gave no usable date. */
  publishedAt: string | null;
  /** Position in the publisher's own feed, when the source has an order. */
  feedIndex?: number;
  entityType: EntityType;
  /** The source's native popularity measure, when it has one. */
  metric?: { name: string; label: string; value: number };
  /** Extra numbers a source scorer uses (comments, forks, created date as epoch ms). */
  signals?: Record<string, number>;
  repoFullName?: string;
  releaseTag?: string;
  packageName?: string;
  /** Organisation the item comes from, when the collector knows it (lab feeds, government sites). */
  origin?: string;
}

export interface CollectorResult {
  source: SourceName;
  candidates: Candidate[];
  errors: string[];
  /** Requests attempted and failed, for partial-failure reporting. */
  attempted?: number;
  failed?: number;
  /** Per-feed health for sources that aggregate several publishers. */
  feeds?: Array<{ origin: string; url: string; ok: boolean }>;
}
