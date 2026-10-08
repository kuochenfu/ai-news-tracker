import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import type { TrendEntity, TrendMetric, TrendSnapshot } from "../domain";

/**
 * Observation history, persisted on the repository's `data` branch (checked out
 * at DATA_DIR in CI). It is what makes "first seen" and growth figures real:
 * nothing here is inferred from a single refresh.
 */

export const HISTORY_RETENTION_DAYS = 90;
const MAX_POINTS_PER_ENTITY = 120;
/** Growth compares against the oldest observation inside this window. */
const CHANGE_WINDOW_DAYS = 7;
/** An observation must be at least this old to count as "earlier". */
const MIN_CHANGE_GAP_DAYS = 0.25;

export interface ObservationPoint {
  at: string;
  source: string;
  metric?: string;
  value?: number;
}

export interface EntityHistory {
  firstSeen: string;
  lastSeen: string;
  title: string;
  points: ObservationPoint[];
  /** Event regions inferred at the latest observation. */
  regions?: string[];
  /** Cross-source cluster at the latest observation; coverage counts clusters, not items. */
  cluster?: string;
}

export interface ObservationStore {
  version: 1;
  updatedAt: string | null;
  entities: Record<string, EntityHistory>;
  /** Recent source scores per source (each refresh's top pool), the reference for percentiles. */
  sourceScores?: Record<string, Array<{ at: string; score: number }>>;
}

export function emptyStore(): ObservationStore {
  return { version: 1, updatedAt: null, entities: {}, sourceScores: {} };
}

/** How long a source's score distribution looks back. */
export const SCORE_REFERENCE_DAYS = 14;
/** Below this many stored scores a source has no stable distribution yet. */
export const MIN_REFERENCE_SAMPLES = 60;

export function scoreReference(store: ObservationStore, source: string): number[] {
  return (store.sourceScores?.[source] ?? []).map((sample) => sample.score);
}

const DAY_MS = 86_400_000;

export function historyDays(store: ObservationStore, now: Date): number {
  let oldest = now.getTime();
  for (const entity of Object.values(store.entities)) {
    oldest = Math.min(oldest, Date.parse(entity.firstSeen));
  }
  return Math.floor((now.getTime() - oldest) / DAY_MS);
}

/** Change in a metric against the oldest observation of the same metric in the last week. */
export function metricChange(
  store: ObservationStore,
  key: string,
  metric: Pick<TrendMetric, "name" | "value">,
  now: Date
): TrendMetric["change"] {
  const points = store.entities[key]?.points ?? [];
  const earliest = points
    .filter((point) => point.metric === metric.name && typeof point.value === "number")
    .map((point) => ({ ...point, age: (now.getTime() - Date.parse(point.at)) / DAY_MS }))
    .filter((point) => point.age >= MIN_CHANGE_GAP_DAYS && point.age <= CHANGE_WINDOW_DAYS)
    .sort((a, b) => b.age - a.age)[0];
  if (!earliest) return null;
  return { value: metric.value - (earliest.value as number), days: Math.round(earliest.age * 10) / 10 };
}

/** Adds this issue's fresh observations and prunes anything past retention. Stale carry-overs are not observations. */
export function recordObservations(
  store: ObservationStore,
  trends: TrendEntity[],
  now: Date,
  poolScores: Record<string, number[]> = {}
): ObservationStore {
  const at = now.toISOString();
  const cutoff = now.getTime() - HISTORY_RETENTION_DAYS * DAY_MS;
  const entities: Record<string, EntityHistory> = {};

  for (const [key, entity] of Object.entries(store.entities)) {
    if (Date.parse(entity.lastSeen) >= cutoff) {
      entities[key] = { ...entity, points: entity.points.filter((point) => Date.parse(point.at) >= cutoff) };
    }
  }

  for (const trend of trends) {
    if (trend.stale) continue;
    const existing = entities[trend.entityKey];
    const point: ObservationPoint = { at, source: trend.source };
    if (trend.metric) {
      point.metric = trend.metric.name;
      point.value = trend.metric.value;
    }
    entities[trend.entityKey] = {
      firstSeen: existing?.firstSeen ?? at,
      lastSeen: at,
      title: trend.canonicalName,
      points: [...(existing?.points ?? []), point].slice(-MAX_POINTS_PER_ENTITY),
      regions: trend.eventRegions,
      cluster: trend.cluster
    };
  }

  const scoreCutoff = now.getTime() - SCORE_REFERENCE_DAYS * DAY_MS;
  const sourceScores: NonNullable<ObservationStore["sourceScores"]> = {};
  for (const [source, samples] of Object.entries(store.sourceScores ?? {})) {
    sourceScores[source] = samples.filter((sample) => Date.parse(sample.at) >= scoreCutoff);
  }
  for (const [source, scores] of Object.entries(poolScores)) {
    sourceScores[source] = [...(sourceScores[source] ?? []), ...scores.map((score) => ({ at, score: Math.round(score * 1e4) / 1e4 }))];
  }

  return { version: 1, updatedAt: at, entities, sourceScores };
}

const STORE_FILE = "observations.json";
const LATEST_FILE = "latest.json";

async function readJson<T>(path: string): Promise<T | null> {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(await readFile(path, "utf8")) as T;
  } catch {
    return null;
  }
}

export async function loadHistory(dataDir: string): Promise<{ store: ObservationStore; previous: TrendSnapshot | null }> {
  const store = await readJson<ObservationStore>(join(dataDir, STORE_FILE));
  const previous = await readJson<TrendSnapshot>(join(dataDir, LATEST_FILE));
  return {
    store: store?.version === 1 ? store : emptyStore(),
    previous: previous?.schemaVersion === 3 ? previous : null
  };
}

export async function saveHistory(dataDir: string, store: ObservationStore, snapshot: TrendSnapshot): Promise<void> {
  await mkdir(dataDir, { recursive: true });
  await writeFile(join(dataDir, STORE_FILE), `${JSON.stringify(store)}\n`, "utf8");
  await writeFile(join(dataDir, LATEST_FILE), `${JSON.stringify(snapshot)}\n`, "utf8");
}
