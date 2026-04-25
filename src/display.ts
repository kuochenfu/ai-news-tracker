import type { TrendEntity } from "./domain";

export function trendUrl(trend: TrendEntity): string {
  return trend.officialUrl ?? trend.githubRepoUrl ?? trend.mentions[0]?.url ?? "#";
}

export function previewText(value: string, maxLength = 50): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}...` : normalized;
}
