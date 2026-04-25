import snapshot from "./generated/snapshot.json";
import type { DailyReport, SourceStatus, TrendEntity } from "./domain";

export const trends = snapshot.trends as TrendEntity[];
export const sourceStatuses = snapshot.sourceStatuses as SourceStatus[];
export const dailyReport = snapshot.dailyReport as DailyReport;

export function getTrendById(id: string): TrendEntity | undefined {
  return trends.find((trend) => trend.id === id);
}

