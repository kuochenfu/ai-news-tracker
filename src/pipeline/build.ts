import type { Region, SourceName, SourceStatus, TrendEntity, TrendSnapshot } from "../domain";
import { activeSourceOrder, sourceMetadata } from "../sources";
import { computeCoverage } from "./coverage";
import { clusterByKeys, dedupeWithinSource, entityKeys } from "./entity";
import { historyDays, metricChange, MIN_REFERENCE_SAMPLES, recordObservations, scoreReference, type ObservationStore } from "./history";
import { PERCENTILE_POOL, SOURCE_TOP_LIMIT, percentileAgainst, selectDaily, sourceScore } from "./ranking";
import { originOf, orgLabel, orgRegion } from "./origin";
import { eventRegions } from "./regions";
import { aiRelevance, MIN_RELEVANCE } from "./relevance";
import type { Candidate, CollectorResult } from "./types";

/** Sources whose feeds mix AI with everything else; their items must pass the relevance threshold. */
export const RELEVANCE_FILTERED: ReadonlySet<SourceName> = new Set<SourceName>([
  "hn",
  "github",
  "nstc_tw",
  "eu_digital",
  "qbitai",
  "the_decoder",
  "itmedia_ai",
  "aitimes_kr",
  "the_verge",
  "techcrunch",
  "mit_tech_review",
  "thirtysixkr",
  "ithome_tw",
  "technews_tw",
  "tnw"
]);

/**
 * Government press releases mention AI in passing (a science fair, a chip forum), so
 * their relevance is judged on the title alone.
 */
export const TITLE_ONLY_RELEVANCE: ReadonlySet<SourceName> = new Set<SourceName>(["nstc_tw", "eu_digital"]);

/** A failed source may show its last good data for this long, marked stale. */
export const STALE_LIMIT_DAYS = 3;
/** Publishing needs fresh data from at least this share of sources; otherwise the refresh fails and the site keeps its last issue. */
export const MIN_FRESH_SHARE = 2 / 3;
export const MIN_FRESH_SOURCES = Math.ceil(activeSourceOrder.length * MIN_FRESH_SHARE);

/** Government sources publish under one fixed origin. */
const SOURCE_ORIGIN: Partial<Record<SourceName, string>> = { nstc_tw: "nstc", eu_digital: "european-commission" };
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
  // .github/workflows/pages.yml runs at 10:00 and 22:00 UTC (18:00 and 06:00 Asia/Taipei).
  const next = new Date(now);
  next.setUTCMinutes(0, 0, 0);
  const hour = now.getUTCHours();
  if (hour < 10) next.setUTCHours(10);
  else if (hour < 22) next.setUTCHours(22);
  else next.setUTCHours(24 + 10);
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
      const relevance = aiRelevance(candidate.title, TITLE_ONLY_RELEVANCE.has(result.source) ? "" : candidate.body ?? "").score;
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
  const metadata = sourceMetadata[candidate.source];
  const origin = SOURCE_ORIGIN[candidate.source] ?? originOf(candidate);
  // First-party items are published by their organisation; everything else by the outlet or community.
  const firstParty = metadata.dataRole === "official";
  const publisher = (firstParty && orgLabel(origin)) || metadata.label;
  const publisherRegion: Region = (firstParty && orgRegion(origin)) || metadata.region;
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
    origin,
    publisher,
    publisherRegion,
    eventRegions: eventRegions(candidate.title, candidate.body ?? "", metadata.region),
    corroboration: { independent: [], sameOrigin: [] },
    cluster: entityKey,
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

/** One entry per publisher; a publisher with several feeds (Google) is working if any of them is. */
function publisherHealth(feeds: NonNullable<CollectorResult["feeds"]>): NonNullable<SourceStatus["feeds"]> {
  const byOrigin = new Map<string, boolean>();
  for (const feed of feeds) byOrigin.set(feed.origin, (byOrigin.get(feed.origin) ?? false) || feed.ok);
  return [...byOrigin].map(([origin, ok]) => ({ publisher: orgLabel(origin) ?? origin, region: orgRegion(origin) ?? "global", ok }));
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
      errors: result.errors,
      ...(result.feeds ? { feeds: publisherHealth(result.feeds) } : {})
    });
  }

  // One entity, several sources. Items from the same origin (or the same outlet) echo one
  // another; only a different origin or outlet counts as independent confirmation.
  const voice = (trend: TrendEntity) => trend.origin ?? `outlet:${trend.source}`;
  for (const group of clusterByKeys(all.map((entry) => entry.keys))) {
    const cluster = group.map((index) => all[index].trend.entityKey).sort()[0];
    for (const index of group) {
      all[index].trend.cluster = cluster;
      const self = all[index].trend;
      const independent = new Map<string, SourceName>();
      const sameOrigin = new Set<SourceName>();
      for (const other of group) {
        const peer = all[other].trend;
        if (other === index || peer.source === self.source) continue;
        if (voice(peer) === voice(self)) sameOrigin.add(peer.source);
        else if (!independent.has(voice(peer))) independent.set(voice(peer), peer.source);
      }
      self.corroboration = { independent: [...new Set(independent.values())], sameOrigin: [...sameOrigin] };
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
  const nextStore = recordObservations(store, trends, now, poolScores);
  const snapshot: TrendSnapshot = {
    schemaVersion: 3,
    generatedAt: now.toISOString(),
    previousGeneratedAt: previous?.generatedAt ?? null,
    historyDays: historyDays(store, now),
    sourceTopTrends,
    sourceStatuses: statuses,
    dailyReport: {
      date: now.toISOString().slice(0, 10),
      topTrendIds: daily.map((trend) => trend.id),
      newEntityIds: trends.filter((trend) => trend.seenBefore === false).map((trend) => trend.id)
    },
    coverage: computeCoverage(nextStore, statuses, now)
  };

  return {
    snapshot,
    store: nextStore,
    freshSources: statuses.filter((status) => status.status === "healthy" || status.status === "degraded").length
  };
}
