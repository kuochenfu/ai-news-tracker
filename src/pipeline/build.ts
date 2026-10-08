import type { SourceName, SourceStatus, TrendEntity, TrendSnapshot } from "../domain";
import { activeSourceOrder, sourceMetadata } from "../sources";
import { clusterByKeys, dedupeWithinSource, entityKeys } from "./entity";
import { historyDays, metricChange, MIN_REFERENCE_SAMPLES, recordObservations, scoreReference, type ObservationStore } from "./history";
import { PERCENTILE_POOL, SOURCE_TOP_LIMIT, percentileAgainst, selectDaily, sourceScore } from "./ranking";
import { aiRelevance, MIN_RELEVANCE } from "./relevance";
import type { Candidate, CollectorResult } from "./types";

/** Sources whose feeds mix AI with everything else; their items must pass the relevance threshold. */
export const RELEVANCE_FILTERED: ReadonlySet<SourceName> = new Set<SourceName>([
  "hn",
  "github",
  "the_verge",
  "techcrunch",
  "mit_tech_review",
  "thirtysixkr",
  "ithome_tw",
  "technews_tw",
  "tnw"
]);

/** A failed source may show its last good data for this long, marked stale. */
export const STALE_LIMIT_DAYS = 3;
/** Publishing needs at least this many sources with fresh data; otherwise the refresh fails and the site keeps its last issue. */
export const MIN_FRESH_SOURCES = 10;
/** Share of failed requests above which a source counts as degraded. */
const DEGRADED_FAILURE_RATE = 0.2;
const BODY_LIMIT = 600;

export interface BuildInput {
  results: CollectorResult[];
  previous: TrendSnapshot | null;
  store: ObservationStore;
  now: Date;
}

export interface BuildOutput {
  snapshot: TrendSnapshot;
  store: ObservationStore;
  freshSources: number;
}

export function nextScheduledRun(now: Date): Date {
  // .github/workflows/pages.yml runs at 00:00 and 08:00 UTC.
  const next = new Date(now);
  next.setUTCMinutes(0, 0, 0);
  if (now.getUTCHours() < 8) next.setUTCHours(8);
  else next.setUTCHours(24);
  return next;
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

interface Ranked {
  trend: TrendEntity;
  keys: string[];
}

/**
 * Percentile reference for a source: its stored score distribution from recent
 * refreshes once there is enough of it ("is this strong for this source?"),
 * otherwise this refresh's best PERCENTILE_POOL candidates. Capping the pool
 * keeps a feed with thousands of archived posts from pinning its Top 10 at 100.
 */
function rankSource(
  result: CollectorResult,
  now: Date,
  history: number[]
): { ranked: Ranked[]; candidateCount: number; filteredOut: number; pool: number[] } {
  const filtered = RELEVANCE_FILTERED.has(result.source);
  const unique = dedupeWithinSource(result.candidates.filter((candidate) => candidate.title.trim()));
  const scored = unique
    .map((candidate) => {
      const relevance = aiRelevance(candidate.title, candidate.body ?? "").score;
      return { candidate, relevance, score: sourceScore(candidate, filtered ? relevance : 1, now) };
    })
    .filter((entry) => !filtered || entry.relevance >= MIN_RELEVANCE);
  const sorted = scored.sort((a, b) => b.score - a.score);
  const pool = sorted.slice(0, PERCENTILE_POOL).map((entry) => entry.score);
  const reference = history.length >= MIN_REFERENCE_SAMPLES ? history : pool;
  const ordered = sorted.map((entry) => ({ ...entry, percentile: percentileAgainst(entry.score, reference) }));

  const ranked = ordered.slice(0, SOURCE_TOP_LIMIT).map(({ candidate, relevance, score, percentile }, index) => {
    const keys = entityKeys(candidate);
    return { trend: toTrend(candidate, keys[0], index + 1, { relevance: filtered ? relevance : null, source: score, percentile }), keys };
  });
  return { ranked, candidateCount: unique.length, filteredOut: unique.length - scored.length, pool };
}

function toTrend(candidate: Candidate, entityKey: string, rank: number, scores: TrendEntity["scores"]): TrendEntity {
  const body = candidate.body?.slice(0, BODY_LIMIT);
  return {
    id: `${candidate.source}-${slug(entityKey)}`,
    entityKey,
    source: candidate.source,
    rank,
    canonicalName: candidate.title,
    entityType: candidate.entityType,
    summary: body || candidate.title,
    officialUrl: candidate.url,
    githubRepoUrl: candidate.repoFullName ? `https://github.com/${candidate.repoFullName}` : undefined,
    publishedAt: candidate.publishedAt,
    scores,
    metric: candidate.metric ? { ...candidate.metric, change: null } : undefined,
    firstSeen: "",
    seenBefore: null,
    alsoSeenIn: [],
    mentions: [
      {
        id: `${candidate.source}-${candidate.externalId}`,
        source: candidate.source,
        title: candidate.title,
        body,
        url: candidate.url,
        author: candidate.author,
        publishedAt: candidate.publishedAt
      }
    ]
  };
}

function statusOf(result: CollectorResult, rankedCount: number): SourceStatus["status"] {
  if (result.candidates.length === 0) return "failed";
  if (rankedCount === 0) return "degraded";
  // Sources that fan out many requests tolerate a few failures; single-request sources do not.
  if (result.attempted) return (result.failed ?? 0) / result.attempted > DEGRADED_FAILURE_RATE ? "degraded" : "healthy";
  if (result.errors.length > 0) return "degraded";
  return "healthy";
}

export function buildSnapshot({ results, previous, store, now }: BuildInput): BuildOutput {
  const resultBySource = new Map(results.map((result) => [result.source, result]));
  const previousStatus = new Map(previous?.sourceStatuses.map((status) => [status.source, status]) ?? []);
  const nextSync = nextScheduledRun(now).toISOString();
  const all: Ranked[] = [];
  const statuses: SourceStatus[] = [];
  const poolScores: Record<string, number[]> = {};

  for (const source of activeSourceOrder) {
    const result = resultBySource.get(source) ?? { source, candidates: [], errors: ["Collector did not run"] };
    const { ranked, candidateCount, filteredOut, pool } = rankSource(result, now, scoreReference(store, source));
    if (pool.length > 0) poolScores[source] = pool;
    let status = statusOf(result, ranked.length);
    let lastSync: string | null = now.toISOString();
    let items = ranked;

    if (status === "failed") {
      const before = previousStatus.get(source);
      const carried = previous?.sourceTopTrends[source] ?? [];
      const age = before?.lastSync ? (now.getTime() - Date.parse(before.lastSync)) / 86_400_000 : Infinity;
      lastSync = before?.lastSync ?? null;
      if (carried.length > 0 && age <= STALE_LIMIT_DAYS) {
        status = "stale";
        items = carried.map((trend) => ({ trend: { ...trend, stale: true }, keys: [trend.entityKey] }));
      }
    }

    all.push(...items);
    statuses.push({
      source,
      label: sourceMetadata[source].label,
      status,
      lastSync,
      nextSync,
      candidateCount,
      rankedCount: items.length,
      filteredOut,
      errors: result.errors
    });
  }

  // One entity, several sources: link them so each row can say where else it appeared.
  for (const group of clusterByKeys(all.map((entry) => entry.keys))) {
    const sources = [...new Set(group.map((index) => all[index].trend.source))];
    for (const index of group) {
      all[index].trend.alsoSeenIn = sources.filter((source) => source !== all[index].trend.source);
    }
  }

  const hasHistory = Object.keys(store.entities).length > 0;
  for (const { trend } of all) {
    if (trend.stale) continue;
    const known = store.entities[trend.entityKey];
    trend.firstSeen = known?.firstSeen ?? now.toISOString();
    trend.seenBefore = hasHistory ? Boolean(known) : null;
    if (trend.metric) trend.metric.change = metricChange(store, trend.entityKey, trend.metric, now);
  }

  const trends = all.map((entry) => entry.trend);
  const sourceTopTrends: TrendSnapshot["sourceTopTrends"] = {};
  for (const trend of trends) (sourceTopTrends[trend.source] ??= []).push(trend);

  const daily = selectDaily(trends, now);
  const snapshot: TrendSnapshot = {
    schemaVersion: 2,
    generatedAt: now.toISOString(),
    previousGeneratedAt: previous?.generatedAt ?? null,
    historyDays: historyDays(store, now),
    sourceTopTrends,
    sourceStatuses: statuses,
    dailyReport: {
      date: now.toISOString().slice(0, 10),
      topTrendIds: daily.map((trend) => trend.id),
      newEntityIds: trends.filter((trend) => trend.seenBefore === false).map((trend) => trend.id)
    }
  };

  return {
    snapshot,
    store: recordObservations(store, trends, now, poolScores),
    freshSources: statuses.filter((status) => status.status === "healthy" || status.status === "degraded").length
  };
}
