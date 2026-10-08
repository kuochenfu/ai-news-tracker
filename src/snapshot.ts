import data from "./generated/snapshot.json";
import type { SourceName, TrendEntity, TrendSnapshot } from "./domain";
import { activeSourceOrder } from "./sources";

/** The issue this build renders, produced by scripts/refresh-data.ts. */
const snapshot = data as unknown as TrendSnapshot;

export const generatedAt = snapshot.generatedAt;
export const historyDays = snapshot.historyDays;
export const sourceTopTrends: Partial<Record<SourceName, TrendEntity[]>> = snapshot.sourceTopTrends;
export const sourceStatuses = snapshot.sourceStatuses;
export const dailyReport = snapshot.dailyReport;

export const allTrends: TrendEntity[] = activeSourceOrder.flatMap((source) => sourceTopTrends[source] ?? []);

/** Whether this issue could compare against stored history (first-seen flags are meaningful). */
export const hasHistory = allTrends.some((trend) => trend.seenBefore !== null);

const byId = new Map(allTrends.map((trend) => [trend.id, trend]));

export function getTrendById(id: string): TrendEntity | undefined {
  return byId.get(id);
}
