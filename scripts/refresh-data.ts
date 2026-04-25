import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { aiQueries } from "../src/config";
import type { DailyReport, SourceName, SourceStatus, TrendEntity } from "../src/domain";
import { fetchHackerNewsItem, fetchHackerNewsStoryIds } from "../src/clients/hackerNews";
import { searchGitHubRepositories, type GitHubRepoSearchItem } from "../src/clients/github";
import { computeTrendScore, scoreFromSignal } from "../src/trendScoring";
import { rssSourceOrder, sourceMetadata } from "../src/sources";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const outputPath = join(rootDir, "src/generated/snapshot.json");
const TOP_LIMIT = 10;

const now = new Date();
const today = now.toISOString().slice(0, 10);

interface RssArticle {
  source: SourceName;
  title: string;
  body?: string;
  url?: string;
  author?: string;
  publishedAt: string;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function historyFor(score: number) {
  return Array.from({ length: 5 }, (_, index) => {
    const date = new Date(now);
    date.setUTCDate(now.getUTCDate() - (4 - index));
    return {
      date: date.toISOString().slice(0, 10),
      score: Number(clamp01(score * (0.58 + index * 0.105)).toFixed(2))
    };
  });
}

async function collectHackerNews() {
  const errors: string[] = [];
  const stories = [];

  try {
    const idGroups = await Promise.all([
      fetchHackerNewsStoryIds("topstories"),
      fetchHackerNewsStoryIds("newstories"),
      fetchHackerNewsStoryIds("beststories")
    ]);
    const ids = [...new Set(idGroups.flat())].slice(0, 180);
    const items = await Promise.all(ids.map((id) => fetchHackerNewsItem(id).catch(() => null)));
    const keywords = aiQueries.map((query) => query.toLowerCase());

    for (const item of items) {
      if (!item || item.type !== "story" || !item.title) {
        continue;
      }
      const haystack = `${item.title} ${item.text ?? ""} ${item.url ?? ""}`.toLowerCase();
      if (keywords.some((keyword) => haystack.includes(keyword.toLowerCase())) || /\b(ai|llm|openai|agent|model)\b/i.test(haystack)) {
        stories.push(item);
      }
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "Unknown HN refresh error");
  }

  return { stories, errors };
}

async function collectGitHub() {
  const errors: string[] = [];
  const reposById = new Map<number, GitHubRepoSearchItem>();

  for (const query of aiQueries.slice(0, 5)) {
    try {
      const repos = await searchGitHubRepositories(`${query} stars:>50`, process.env.GITHUB_TOKEN);
      for (const repo of repos.slice(0, 10)) {
        reposById.set(repo.id, repo);
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : `GitHub search failed for ${query}`);
    }
  }

  const repos = [...reposById.values()]
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
    .slice(0, 20);

  return { repos, errors };
}

function decodeEntities(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tagValue(xml: string, tag: string): string | undefined {
  const match = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? decodeEntities(match[1]) : undefined;
}

function linkValue(xml: string): string | undefined {
  const atomLink = xml.match(/<link[^>]+href=["']([^"']+)["'][^>]*>/i);
  if (atomLink) {
    return decodeEntities(atomLink[1]);
  }
  return tagValue(xml, "link");
}

function parseFeed(xml: string, source: SourceName): RssArticle[] {
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) ?? xml.match(/<entry[\s\S]*?<\/entry>/gi) ?? [];

  return blocks
    .map((block): RssArticle | null => {
      const title = tagValue(block, "title");
      if (!title) {
        return null;
      }

      return {
        source,
        title,
        body: tagValue(block, "description") ?? tagValue(block, "summary") ?? tagValue(block, "content:encoded"),
        url: linkValue(block),
        author: tagValue(block, "dc:creator") ?? tagValue(block, "author"),
        publishedAt: tagValue(block, "pubDate") ?? tagValue(block, "published") ?? tagValue(block, "updated") ?? now.toISOString()
      };
    })
    .filter((article): article is RssArticle => Boolean(article));
}

async function collectRssSource(source: SourceName) {
  const feedUrl = sourceMetadata[source].feedUrl;
  const errors: string[] = [];

  if (!feedUrl) {
    return { source, articles: [] as RssArticle[], errors: ["No feed configured"] };
  }

  try {
    const response = await fetch(feedUrl, {
      headers: {
        Accept: "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
        "User-Agent": "ai-news-tracker/0.1 (+https://kuochenfu.github.io/ai-news-tracker/)"
      }
    });

    if (!response.ok) {
      throw new Error(`${sourceMetadata[source].label} feed returned ${response.status}`);
    }

    const xml = await response.text();
    const articles = parseFeed(xml, source).slice(0, TOP_LIMIT);
    if (articles.length === 0) {
      throw new Error(`${sourceMetadata[source].label} feed returned no articles`);
    }
    return { source, articles, errors };
  } catch (error) {
    errors.push(error instanceof Error ? error.message : `${sourceMetadata[source].label} feed failed`);
    return { source, articles: [] as RssArticle[], errors };
  }
}

function rssArticleToTrend(article: RssArticle, index: number): TrendEntity {
  const signalScore = clamp01(1 - index / 24);
  const score = scoreFromSignal(signalScore);
  const source = article.source;
  const label = sourceMetadata[source].label;
  const publishedAt = Number.isNaN(Date.parse(article.publishedAt))
    ? now.toISOString()
    : new Date(article.publishedAt).toISOString();

  return {
    id: `${source}-${slugify(article.url ?? article.title)}`,
    canonicalName: article.title,
    entityType: "tool",
    summary: article.body ?? article.title,
    reason: `Ranked from ${label} RSS publication order.`,
    officialUrl: article.url,
    score,
    sources: [
      {
        source,
        score: signalScore,
        mentions: 1,
        lastSeen: publishedAt,
        signal: `#${index + 1} latest article from ${label}`
      }
    ],
    mentions: [
      {
        id: `${source}-${index}-${slugify(article.title)}`,
        source,
        title: article.title,
        body: article.body,
        url: article.url,
        author: article.author,
        publishedAt
      }
    ],
    history: historyFor(score.finalScore)
  };
}

function repoToTrend(repo: GitHubRepoSearchItem, index: number): TrendEntity {
  const githubScore = clamp01(Math.log10(repo.stargazers_count + 1) / 5);
  const score = computeTrendScore({
    hnDiscussionScore: 0,
    githubAdoptionScore: githubScore
  });

  return {
    id: slugify(repo.full_name),
    canonicalName: repo.full_name,
    entityType: "repo",
    summary: repo.description ?? "Repository surfaced by GitHub Search API during the scheduled trend refresh.",
    reason: "Ranked from GitHub repository activity.",
    githubRepoUrl: repo.html_url,
    score,
    sources: [
      {
        source: "github",
        score: githubScore,
        mentions: 1,
        lastSeen: repo.pushed_at,
        signal: `${repo.stargazers_count} stars, ${repo.forks_count} forks, recently pushed`
      }
    ],
    mentions: [
      {
        id: `github-${repo.id}`,
        source: "github",
        title: repo.full_name,
        body: repo.description ?? undefined,
        url: repo.html_url,
        author: repo.owner.login,
        publishedAt: repo.created_at
      }
    ],
    history: historyFor(score.finalScore)
  };
}

function hnStoryToTrend(story: Awaited<ReturnType<typeof collectHackerNews>>["stories"][number]): TrendEntity {
  const hnScore = clamp01(((story.score ?? 0) / 350 + (story.descendants ?? 0) / 180) / 2);
  const score = computeTrendScore({
    hnDiscussionScore: hnScore,
    githubAdoptionScore: 0
  });

  return {
    id: `hn-${story.id}`,
    canonicalName: story.title ?? `HN story ${story.id}`,
    entityType: "tool",
    summary: story.title ?? "AI-related Hacker News story from the scheduled refresh.",
    reason: "Ranked from Hacker News discussion activity.",
    officialUrl: story.url,
    score,
    sources: [
      {
        source: "hn",
        score: hnScore,
        mentions: 1,
        lastSeen: story.time ? new Date(story.time * 1000).toISOString() : now.toISOString(),
        signal: `${story.score ?? 0} points and ${story.descendants ?? 0} comments`
      }
    ],
    mentions: [
      {
        id: `hn-${story.id}`,
        source: "hn",
        title: story.title ?? `HN story ${story.id}`,
        body: story.text,
        url: story.url ?? `https://news.ycombinator.com/item?id=${story.id}`,
        author: story.by,
        publishedAt: story.time ? new Date(story.time * 1000).toISOString() : now.toISOString()
      }
    ],
    history: historyFor(score.finalScore)
  };
}

function buildSourceStatuses(hnErrors: string[], githubErrors: string[], rssErrors: Partial<Record<SourceName, string[]>>): SourceStatus[] {
  const nextMorning = new Date(now);
  nextMorning.setUTCHours(now.getUTCHours() < 8 ? 8 : 24, 0, 0, 0);

  const statuses: SourceStatus[] = [
    {
      source: "hn",
      label: "Hacker News Firebase API",
      status: hnErrors.length ? "degraded" : "healthy",
      lastSync: hnErrors.length ? null : now.toISOString(),
      nextSync: nextMorning.toISOString(),
      errors: hnErrors,
      notes: "Uses topstories, newstories, beststories, and item detail endpoints."
    },
    {
      source: "github",
      label: "GitHub Search API",
      status: githubErrors.length ? "degraded" : "healthy",
      lastSync: githubErrors.length ? null : now.toISOString(),
      nextSync: nextMorning.toISOString(),
      errors: githubErrors,
      notes: "MVP uses repository search sorted by recently updated repositories; star growth comes from snapshots."
    }
  ];

  for (const source of rssSourceOrder) {
    const errors = rssErrors[source] ?? [];
    statuses.push({
      source,
      label: `${sourceMetadata[source].label} RSS`,
      status: errors.length ? "degraded" : "healthy",
      lastSync: errors.length ? null : now.toISOString(),
      nextSync: nextMorning.toISOString(),
      errors,
      notes: `${sourceMetadata[source].region} source. ${sourceMetadata[source].description}`
    });
  }

  return statuses;
}

async function main() {
  const [hn, github, rssCollections] = await Promise.all([
    collectHackerNews(),
    collectGitHub(),
    Promise.all(rssSourceOrder.map((source) => collectRssSource(source)))
  ]);
  const githubTrends = github.repos.slice(0, TOP_LIMIT).map(repoToTrend);
  const hnTrends = hn.stories.slice(0, TOP_LIMIT).map(hnStoryToTrend);
  const rssTrends = Object.fromEntries(
    rssCollections.map((collection) => [
      collection.source,
      collection.articles.slice(0, TOP_LIMIT).map((article, index) => rssArticleToTrend(article, index))
    ])
  ) as Partial<Record<SourceName, TrendEntity[]>>;
  const rssErrors = Object.fromEntries(
    rssCollections.map((collection) => [collection.source, collection.errors])
  ) as Partial<Record<SourceName, string[]>>;
  const trends = [...githubTrends, ...hnTrends, ...Object.values(rssTrends).flat()]
    .sort((a, b) => b.score.finalScore - a.score.finalScore)
    .slice(0, TOP_LIMIT);
  const sourceTopTrends: Partial<Record<SourceName, TrendEntity[]>> = {
    hn: hnTrends,
    github: githubTrends,
    ...rssTrends
  };
  const sourceCounts = Object.entries(sourceTopTrends)
    .map(([source, items]) => `${sourceMetadata[source as SourceName].shortLabel}: ${items?.length ?? 0}`)
    .join(", ");

  const dailyReport: DailyReport = {
    date: today,
    summary:
      trends.length > 0
        ? `Scheduled refresh found Top 10 candidates by source (${sourceCounts}).`
        : "Scheduled refresh completed, but no AI trend candidates were collected.",
    topTrendIds: trends.map((trend) => trend.id),
    newEntities: trends.slice(0, 3).map((trend) => trend.canonicalName),
    highConfidence: trends.filter((trend) => trend.score.verdict === "high-confidence").map((trend) => trend.canonicalName),
    likelyHype: trends.filter((trend) => trend.score.verdict === "likely-hype").map((trend) => trend.canonicalName)
  };

  const snapshot = {
    generatedAt: now.toISOString(),
    trends,
    sourceTopTrends,
    sourceStatuses: buildSourceStatuses(hn.errors, github.errors, rssErrors),
    dailyReport
  };

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  console.log(`Wrote ${outputPath} with ${trends.length} trends`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
