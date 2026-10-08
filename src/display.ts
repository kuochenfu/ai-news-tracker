import type { TrendEntity } from "./domain";

export function trendUrl(trend: TrendEntity): string {
  return trend.officialUrl ?? trend.githubRepoUrl ?? trend.mentions[0]?.url ?? "#";
}

/** Decodes numeric character references that older snapshots left in titles and summaries. */
export function decodeNumericEntities(value: string): string {
  return value
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)));
}

export function previewText(value: string, maxLength = 50): string {
  const normalized = stripMarkdown(decodeNumericEntities(value)).replace(/\s+/g, " ").trim();
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}...` : normalized;
}

/** Flattens release-note markdown (headings, links, emphasis, code, commit refs) to plain text. */
function stripMarkdown(value: string): string {
  return value
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\[[0-9a-f]{7,40}\]/gi, " ")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/[*_`~]+/g, "");
}
