import snapshot from "./generated/snapshot.json";
import type { DailyReport, SourceName, SourceStatus, TrendEntity, TrendSnapshot } from "./domain";

const typedSnapshot = snapshot as TrendSnapshot;

export const trends = typedSnapshot.trends as TrendEntity[];
export const sourceTopTrends = typedSnapshot.sourceTopTrends as Partial<Record<SourceName, TrendEntity[]>>;
export const sourceStatuses = typedSnapshot.sourceStatuses as SourceStatus[];
export const dailyReport = typedSnapshot.dailyReport as DailyReport;

export function getTrendById(id: string): TrendEntity | undefined {
  return trends.find((trend) => trend.id === id);
}
