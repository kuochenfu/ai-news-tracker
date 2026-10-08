import type { SourceName, TrendEntity } from "../domain";
import { sourceMetadata } from "../sources";
import type { Candidate } from "./types";

export const SOURCE_TOP_LIMIT = 10;
/** Without history, percentiles compare against this many of the source's best candidates. */
export const PERCENTILE_POOL = 30;
export const DAILY_LIMIT = 15;

export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function daysSince(iso: string | null | undefined, now: Date): number | null {
  if (!iso) return null;
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return null;
  return Math.max(0, (now.getTime() - time) / 86_400_000);
}

/** Exponential freshness. Items with no usable date get none: they never outrank dated ones on recency. */
export function freshness(iso: string | null | undefined, now: Date, halfLifeDays: number): number {
  const age = daysSince(iso, now);
  return age === null ? 0 : Math.exp((-Math.LN2 * age) / halfLifeDays);
}

function logScale(value: number | undefined, ceiling: number): number {
  return clamp01(Math.log10((value ?? 0) + 1) / Math.log10(ceiling + 1));
}

/**
 * Each source's own ranking score. Documented in docs/ranking-metrics.md; only
 * meaningful for ordering within one source.
 */
export function sourceScore(candidate: Candidate, relevance: number, now: Date): number {
  const signals = candidate.signals ?? {};
  const feedRank = candidate.feedIndex === undefined ? 0.5 : clamp01(1 - candidate.feedIndex / 30);

  switch (candidate.source) {
    case "hn":
      return clamp01(
        0.35 * logScale(candidate.metric?.value, 500) +
          0.3 * logScale(signals.comments, 200) +
          0.2 * freshness(candidate.publishedAt, now, 1) +
          0.15 * relevance
      );
    case "github":
      return clamp01(
        0.35 * logScale(candidate.metric?.value, 100_000) +
          0.2 * logScale(signals.forks, 10_000) +
          0.2 * freshness(candidate.publishedAt, now, 14) +
          0.15 * relevance +
          0.1 * (signals.createdAt ? freshness(new Date(signals.createdAt).toISOString(), now, 180) : 0)
      );
    case "official_blog":
    case "arxiv":
      return clamp01(0.7 * freshness(candidate.publishedAt, now, 7) + 0.3 * feedRank);
    case "github_releases":
      return clamp01(0.8 * freshness(candidate.publishedAt, now, 7) + 0.2 * (signals.prerelease ? 0 : 1));
    case "hugging_face":
      return clamp01(0.6 * logScale(signals.trending, 3_000) + 0.25 * logScale(candidate.metric?.value, 20_000) + 0.15 * freshness(candidate.publishedAt, now, 30));
    case "npm":
    case "pypi":
      return clamp01(0.6 * logScale(candidate.metric?.value, 100_000_000) + 0.4 * freshness(candidate.publishedAt, now, 30));
    default:
      return clamp01(0.5 * relevance + 0.35 * freshness(candidate.publishedAt, now, 2) + 0.15 * feedRank);
  }
}

/** Share of the reference at or below the score: the best item is 1. Ties share the higher value. */
export function percentileAgainst(score: number, reference: number[]): number {
  if (reference.length === 0) return 1;
  return reference.filter((other) => other <= score).length / reference.length;
}

export function percentiles(scores: number[]): number[] {
  return scores.map((score) => percentileAgainst(score, scores));
}

/**
 * Lists that mix sources sort by percentile, then rank, then tier (first-party first),
 * then recency. Raw source scores only break ties inside one source, because they
 * are not comparable across sources.
 */
export function compareAcrossSources(a: TrendEntity, b: TrendEntity): number {
  return (
    b.scores.percentile - a.scores.percentile ||
    a.rank - b.rank ||
    sourceMetadata[a.source].tier - sourceMetadata[b.source].tier ||
    (Date.parse(b.publishedAt ?? "") || 0) - (Date.parse(a.publishedAt ?? "") || 0) ||
    (a.source === b.source ? b.scores.source - a.scores.source : 0)
  );
}

export interface DailyOptions {
  limit?: number;
  maxPerSource?: number;
  minPerTier?: number;
  /** Slots filled one-per-source before any source may take a second. */
  breadthSlots?: number;
}

/** Daily ranking: percentile within source, nudged toward fresh items and independent confirmation (never same-origin echoes). */
export function dailyScore(trend: TrendEntity, now: Date): number {
  const recency = freshness(trend.publishedAt, now, 1.5);
  const confirmed = trend.corroboration.independent.length > 0 ? 0.1 : 0;
  return 0.6 * trend.scores.percentile + 0.3 * recency + confirmed;
}

/**
 * Picks the Daily list with quotas so no source or tier can crowd out the rest:
 * at least `minPerTier` per tier when available, then one per source until
 * `breadthSlots`, then the best of the rest with at most `maxPerSource` per source.
 * One item per linked cluster; no stale carry-overs.
 */
export function selectDaily(trends: TrendEntity[], now: Date, options: DailyOptions = {}): TrendEntity[] {
  const { limit = DAILY_LIMIT, maxPerSource = 2, minPerTier = 3, breadthSlots = 10 } = options;
  const pool = trends
    .filter((trend) => !trend.stale)
    .map((trend) => ({ trend, score: dailyScore(trend, now) }))
    .sort((a, b) => b.score - a.score || compareAcrossSources(a.trend, b.trend));

  const picked: typeof pool = [];
  const perSource = new Map<SourceName, number>();
  const entities = new Set<string>();

  const tryPick = (entry: (typeof pool)[number], perSourceCap = maxPerSource, slotCap = limit) => {
    if (picked.length >= slotCap || picked.includes(entry)) return false;
    if ((perSource.get(entry.trend.source) ?? 0) >= perSourceCap) return false;
    if (entities.has(entry.trend.cluster)) return false;
    picked.push(entry);
    perSource.set(entry.trend.source, (perSource.get(entry.trend.source) ?? 0) + 1);
    entities.add(entry.trend.cluster);
    return true;
  };

  for (const tier of [1, 2, 3] as const) {
    let count = 0;
    for (const entry of pool) {
      if (count >= minPerTier) break;
      if (sourceMetadata[entry.trend.source].tier === tier && tryPick(entry, 1)) count += 1;
    }
  }
  for (const entry of pool) tryPick(entry, 1, breadthSlots);
  for (const entry of pool) tryPick(entry);

  return picked.sort((a, b) => b.score - a.score).map((entry) => entry.trend);
}
