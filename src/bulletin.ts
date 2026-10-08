import type { SourceName, TrendEntity } from "./domain";
import { generatedAt, sourceStatuses, sourceTopTrends } from "./mockData";
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

export function publishedAt(trend: TrendEntity): string | undefined {
  return trend.mentions[0]?.publishedAt ?? trend.sources[0]?.lastSeen;
}

export function trendSource(trend: TrendEntity): SourceName {
  return trend.sources[0]?.source ?? trend.mentions[0]?.source;
}

export function isNew(trend: TrendEntity): boolean {
  const published = publishedAt(trend);
  if (!published) return false;
  const age = new Date(generatedAt).getTime() - new Date(published).getTime();
  return age >= -NEW_WINDOW_MS && age <= NEW_WINDOW_MS;
}

export interface Bulletin {
  issuedAt: string;
  nextIssueAt: string | null;
  stationCount: number;
  observationCount: number;
  degradedCount: number;
}

export function currentBulletin(): Bulletin {
  const nextIssueAt = sourceStatuses.map((status) => status.nextSync).filter(Boolean).sort()[0] ?? null;
  return {
    issuedAt: generatedAt,
    nextIssueAt,
    stationCount: activeSourceOrder.length,
    observationCount: activeSourceOrder.reduce((total, source) => total + (sourceTopTrends[source]?.length ?? 0), 0),
    degradedCount: sourceStatuses.filter((status) => status.status !== "healthy").length
  };
}

/** Every ranked observation across stations, one row per source item. */
export function allObservations(): Array<{ trend: TrendEntity; source: SourceName; rank: number }> {
  return activeSourceOrder.flatMap((source) =>
    (sourceTopTrends[source] ?? []).map((trend, index) => ({ trend, source, rank: index + 1 }))
  );
}

export function stationsByTier(): Array<{ tier: SourceMetadata["tier"]; sources: SourceName[] }> {
  return ([1, 2, 3] as const).map((tier) => ({
    tier,
    sources: activeSourceOrder.filter((source) => sourceMetadata[source].tier === tier)
  }));
}
