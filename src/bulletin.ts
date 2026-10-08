import type { SourceName, SourceStatus, TrendEntity, TrendMetric } from "./domain";
import { allTrends, generatedAt, sourceStatuses } from "./snapshot";
import { activeSourceOrder, sourceMetadata, type SourceMetadata } from "./sources";

const NEW_WINDOW_MS = 24 * 60 * 60 * 1000;

export const tierLabel: Record<SourceMetadata["tier"], string> = {
  1: "一手來源",
  2: "社群與採用",
  3: "媒體驗證"
};

export const tierShort: Record<SourceMetadata["tier"], string> = {
  1: "一手",
  2: "社群",
  3: "媒體"
};

export const roleLabel: Record<SourceMetadata["signalRole"], string> = {
  origin: "源頭",
  early_discussion: "早期討論",
  adoption: "開發者採用",
  validation: "媒體驗證"
};

export const typeLabel: Record<SourceMetadata["sourceType"], string> = {
  first_party: "一手",
  community: "社群",
  platform: "平台",
  media: "媒體"
};

const taipeiFormat = new Intl.DateTimeFormat("zh-TW", {
  timeZone: "Asia/Taipei",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23"
});

const taipeiDate = new Intl.DateTimeFormat("zh-TW", {
  timeZone: "Asia/Taipei",
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
});

const taipeiTime = new Intl.DateTimeFormat("zh-TW", {
  timeZone: "Asia/Taipei",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23"
});

function parts(format: Intl.DateTimeFormat, date: Date) {
  return Object.fromEntries(format.formatToParts(date).map((part) => [part.type, part.value]));
}

/** "06/17 10:12" in Asia/Taipei. */
export function formatTaipei(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const p = parts(taipeiFormat, date);
  return `${p.month}/${p.day} ${p.hour}:${p.minute}`;
}

export function formatTaipeiDate(iso: string): string {
  const p = parts(taipeiDate, new Date(iso));
  return `${p.year}-${p.month}-${p.day}`;
}

export function formatTaipeiTime(iso: string): string {
  const p = parts(taipeiTime, new Date(iso));
  return `${p.hour}:${p.minute}`;
}

export function isNew(trend: TrendEntity): boolean {
  if (!trend.publishedAt || trend.stale) return false;
  const age = new Date(generatedAt).getTime() - new Date(trend.publishedAt).getTime();
  return age >= -NEW_WINDOW_MS && age <= NEW_WINDOW_MS;
}

export const statusLabel: Record<SourceStatus["status"], string> = {
  healthy: "正常",
  degraded: "部分失敗",
  stale: "沿用舊資料",
  failed: "失敗"
};

export interface Bulletin {
  issuedAt: string;
  nextIssueAt: string | null;
  stationCount: number;
  observationCount: number;
  troubledCount: number;
}

export function currentBulletin(): Bulletin {
  const nextIssueAt = sourceStatuses.map((status) => status.nextSync).filter(Boolean).sort()[0] ?? null;
  return {
    issuedAt: generatedAt,
    nextIssueAt,
    stationCount: activeSourceOrder.length,
    observationCount: allTrends.length,
    troubledCount: sourceStatuses.filter((status) => status.status !== "healthy").length
  };
}

export function stationsByTier(): Array<{ tier: SourceMetadata["tier"]; sources: SourceName[] }> {
  return ([1, 2, 3] as const).map((tier) => ({
    tier,
    sources: activeSourceOrder.filter((source) => sourceMetadata[source].tier === tier)
  }));
}

const compact = new Intl.NumberFormat("zh-TW", { notation: "compact", maximumFractionDigits: 1 });

const metricUnit: Record<string, string> = {
  points: "分",
  stars: "星",
  likes: "讚",
  weekly_downloads: "週下載"
};

/** "1.2萬 星 · +340（2 天）"; growth only when an earlier observation exists. */
export function formatMetric(metric: TrendMetric): { value: string; change: string | null } {
  const unit = metricUnit[metric.name] ?? metric.name;
  const value = `${compact.format(metric.value)} ${unit}`;
  if (!metric.change) return { value, change: null };
  const sign = metric.change.value > 0 ? "+" : metric.change.value < 0 ? "−" : "±";
  return { value, change: `${sign}${compact.format(Math.abs(metric.change.value))}（${metric.change.days} 天）` };
}
