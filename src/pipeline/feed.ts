import type { SourceName } from "../domain";
import type { Candidate } from "./types";

/** Decodes the entities RSS and Atom feeds use, then strips tags and collapses whitespace. */
export function decodeEntities(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&amp;/g, "&")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tagValue(xml: string, tag: string): string | undefined {
  const match = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i"));
  const value = match ? decodeEntities(match[1]) : undefined;
  return value || undefined;
}

function linkValue(xml: string): string | undefined {
  const alternate = xml.match(/<link[^>]+rel=["']alternate["'][^>]*href=["']([^"']+)["'][^>]*>/i) ?? xml.match(/<link[^>]+href=["']([^"']+)["'][^>]*>/i);
  if (alternate) return decodeEntities(alternate[1]);
  return tagValue(xml, "link") ?? tagValue(xml, "guid");
}

/** Parses a feed date to ISO; unparseable or missing dates become null rather than "now". */
export function parseDate(value: string | undefined): string | null {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : new Date(time).toISOString();
}

export function parseFeed(xml: string, source: SourceName, entityType: Candidate["entityType"] = "article"): Candidate[] {
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) ?? xml.match(/<entry[\s\S]*?<\/entry>/gi) ?? [];

  return blocks.flatMap((block, index): Candidate[] => {
    // Taiwanese government feeds append an ROC-calendar date to every title (e.g. "… 115年10月03日").
    const title = tagValue(block, "title")?.replace(/\s*\d{2,3}年\d{1,2}月\d{1,2}日$/, "");
    if (!title) return [];
    const url = linkValue(block);
    return [
      {
        source,
        externalId: tagValue(block, "guid") ?? tagValue(block, "id") ?? url ?? `${source}-${index}`,
        title,
        body: tagValue(block, "description") ?? tagValue(block, "summary") ?? tagValue(block, "content:encoded") ?? tagValue(block, "content"),
        url,
        author: tagValue(block, "dc:creator") ?? tagValue(block, "name") ?? tagValue(block, "author"),
        publishedAt: parseDate(tagValue(block, "pubDate") ?? tagValue(block, "published") ?? tagValue(block, "dc:date") ?? tagValue(block, "updated")),
        feedIndex: index,
        entityType
      }
    ];
  });
}
