import type { SourceName } from "../src/domain";
import type { Candidate, CollectorResult } from "../src/pipeline/types";

export const NOW = new Date("2026-10-09T00:20:00.000Z");

export function hoursAgo(hours: number): string {
  return new Date(NOW.getTime() - hours * 3_600_000).toISOString();
}

let counter = 0;

export function candidate(source: SourceName, overrides: Partial<Candidate> = {}): Candidate {
  counter += 1;
  return {
    source,
    externalId: `${source}-${counter}`,
    title: `AI model update ${counter}`,
    url: `https://example.com/${source}/${counter}`,
    publishedAt: hoursAgo(2),
    entityType: "article",
    ...overrides
  };
}

export function result(source: SourceName, candidates: Candidate[], extra: Partial<CollectorResult> = {}): CollectorResult {
  return { source, candidates, errors: [], ...extra };
}

/** Ten fresh items per source for every active source. */
export function fullResults(sources: SourceName[]): CollectorResult[] {
  return sources.map((source) =>
    result(
      source,
      Array.from({ length: 10 }, (_, index) => candidate(source, { feedIndex: index, metric: { name: "m", label: "m", value: 100 - index } }))
    )
  );
}
