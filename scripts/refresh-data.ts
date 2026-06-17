import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { aiQueries } from "../src/config";
import type { DailyReport, SourceName, SourceStatus, TrendEntity } from "../src/domain";
import { fetchHackerNewsItem, fetchHackerNewsStoryIds } from "../src/clients/hackerNews";
import { searchGitHubRepositories, type GitHubRepoSearchItem } from "../src/clients/github";
import { computeTrendScore, scoreFromSignal } from "../src/trendScoring";
import { activeSourceOrder, rssSourceOrder, sourceMetadata } from "../src/sources";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const outputPath = join(rootDir, "src/generated/snapshot.json");
const SOURCE_TOP_LIMIT = 10;
const DAILY_LIMIT = 15;
const activeScheduledSourceOrder = activeSourceOrder.filter((source) => source !== "hn" && source !== "github");

const now = new Date();
const today = now.toISOString().slice(0, 10);

const rankingKeywords = [
  "ai",
  "人工智慧",
  "生成式",
  "agent",
  "agentic",
  "llm",
  "大模型",
  "模型",
  "openai",
  "anthropic",
  "claude",
  "gemini",
  "deepseek",
  "inference",
  "推論",
  "multimodal",
  "多模態",
  "vector",
  "向量",
  "mcp",
  "coding",
  "code",
  "developer",
  "開發",
  "robot",
  "機器人",
  "chip",
  "semiconductor",
  "gpu",
  "nvidia",
  "晶片",
  "半導體"
];

interface RssArticle {
  source: SourceName;
  title: string;
  body?: string;
  url?: string;
  author?: string;
  publishedAt: string;
  feedIndex: number;
}

interface SourceCollection<T> {
  source: SourceName;
  items: T[];
  errors: string[];
}

interface PlatformItem {
  source: SourceName;
  externalId: string;
  title: string;
  body?: string;
  url?: string;
  author?: string;
  publishedAt: string;
  metricValue: number;
  metricLabel: string;
  entityType: TrendEntity["entityType"];
}

const officialBlogFeeds = [
  "https://openai.com/news/rss.xml",
  "https://huggingface.co/blog/feed.xml"
];

const releaseRepos = [
  "openai/openai-python",
  "openai/openai-node",
  "anthropics/anthropic-sdk-typescript",
  "anthropics/anthropic-sdk-python",
  "modelcontextprotocol/typescript-sdk",
  "modelcontextprotocol/python-sdk",
  "langchain-ai/langchainjs",
  "langchain-ai/langchain",
  "run-llama/llama_index",
  "vercel/ai"
];

const npmPackages = [
  "ai",
  "openai",
  "@anthropic-ai/sdk",
  "@modelcontextprotocol/sdk",
  "langchain",
  "llamaindex",
  "ollama",
  "chromadb",
  "zod",
  "tsx"
];

const pypiPackages = [
  "openai",
  "anthropic",
  "langchain",
  "llama-index",
  "transformers",
  "litellm",
  "crewai",
  "autogen-agentchat",
  "chromadb",
  "llama-cpp-python"
];

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

function daysSince(value?: string | number | null): number {
  if (value === undefined || value === null) {
    return 30;
  }
  const date = typeof value === "number" ? new Date(value * 1000) : new Date(value);
  const time = date.getTime();
  if (Number.isNaN(time)) {
    return 30;
  }
  return Math.max(0, (now.getTime() - time) / 86_400_000);
}

function recencyScore(value?: string | number | null, halfLifeDays = 3): number {
  return Math.exp(-daysSince(value) / halfLifeDays);
}

function keywordScore(text: string): number {
  const normalized = text.toLowerCase();
  const matches = rankingKeywords.filter((keyword) => normalized.includes(keyword.toLowerCase())).length;
  return clamp01(matches / 4);
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
    .sort((a, b) => scoreGitHubRepo(b) - scoreGitHubRepo(a))
    .slice(0, SOURCE_TOP_LIMIT);

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
        publishedAt: tagValue(block, "pubDate") ?? tagValue(block, "published") ?? tagValue(block, "updated") ?? now.toISOString(),
        feedIndex: 0
      };
    })
    .map((article, index) => ({ ...article, feedIndex: index }))
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
    const articles = parseFeed(xml, source)
      .sort((a, b) => scoreRssArticle(b) - scoreRssArticle(a))
      .slice(0, SOURCE_TOP_LIMIT)
    if (articles.length === 0) {
      throw new Error(`${sourceMetadata[source].label} feed returned no articles`);
    }
    return { source, articles, errors };
  } catch (error) {
    errors.push(error instanceof Error ? error.message : `${sourceMetadata[source].label} feed failed`);
    return { source, articles: [] as RssArticle[], errors };
  }
}

async function fetchJson<T>(url: string, headers: Record<string, string> = {}): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "ai-news-tracker/0.1 (+https://kuochenfu.github.io/ai-news-tracker/)",
      ...headers
    }
  });

  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`);
  }

  return response.json() as Promise<T>;
}

async function collectOfficialBlogs(): Promise<SourceCollection<RssArticle>> {
  const errors: string[] = [];
  const articles: RssArticle[] = [];

  const collections = await Promise.all(
    officialBlogFeeds.map(async (feedUrl) => {
      try {
        const response = await fetch(feedUrl, {
          headers: {
            Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
            "User-Agent": "ai-news-tracker/0.1 (+https://kuochenfu.github.io/ai-news-tracker/)"
          }
        });
        if (!response.ok) {
          throw new Error(`${feedUrl} returned ${response.status}`);
        }
        return parseFeed(await response.text(), "official_blog");
      } catch (error) {
        errors.push(error instanceof Error ? error.message : `${feedUrl} failed`);
        return [] as RssArticle[];
      }
    })
  );

  for (const article of collections.flat()) {
    articles.push(article);
  }

  return {
    source: "official_blog",
    items: articles
      .sort((a, b) => scorePrimaryArticle(b) - scorePrimaryArticle(a))
      .slice(0, SOURCE_TOP_LIMIT),
    errors
  };
}

async function collectArxiv(): Promise<SourceCollection<RssArticle>> {
  const query = encodeURIComponent(
    "(cat:cs.AI OR cat:cs.LG OR cat:cs.CL OR cat:cs.CV) AND (ai OR agent OR llm OR model OR inference)"
  );
  const url = `https://export.arxiv.org/api/query?search_query=${query}&sortBy=submittedDate&sortOrder=descending&max_results=30`;

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
        "User-Agent": "ai-news-tracker/0.1 (+https://kuochenfu.github.io/ai-news-tracker/)"
      }
    });
    if (!response.ok) {
      throw new Error(`arXiv returned ${response.status}`);
    }
    const articles = parseFeed(await response.text(), "arxiv")
      .sort((a, b) => scorePrimaryArticle(b) - scorePrimaryArticle(a))
      .slice(0, SOURCE_TOP_LIMIT);
    return { source: "arxiv", items: articles, errors: [] };
  } catch (error) {
    return {
      source: "arxiv",
      items: [],
      errors: [error instanceof Error ? error.message : "arXiv refresh failed"]
    };
  }
}

interface GitHubRelease {
  id: number;
  name?: string | null;
  tag_name: string;
  body?: string | null;
  html_url: string;
  published_at?: string | null;
  created_at: string;
  author?: {
    login?: string;
  };
}

async function collectGitHubReleases(): Promise<SourceCollection<PlatformItem>> {
  const errors: string[] = [];
  const headers: Record<string, string> = {};
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  const releases = await Promise.all(
    releaseRepos.map(async (repo) => {
      try {
        const data = await fetchJson<GitHubRelease[]>(
          `https://api.github.com/repos/${repo}/releases?per_page=5`,
          headers
        );
        return data.map((release): PlatformItem => ({
          source: "github_releases",
          externalId: `${repo}:${release.id}`,
          title: `${repo} ${release.name || release.tag_name}`,
          body: release.body ?? undefined,
          url: release.html_url,
          author: release.author?.login,
          publishedAt: release.published_at ?? release.created_at,
          metricValue: 1,
          metricLabel: release.tag_name,
          entityType: "repo"
        }));
      } catch (error) {
        errors.push(error instanceof Error ? `${repo}: ${error.message}` : `${repo}: release refresh failed`);
        return [] as PlatformItem[];
      }
    })
  );

  return {
    source: "github_releases",
    items: releases.flat()
      .sort((a, b) => scorePlatformItem(b) - scorePlatformItem(a))
      .slice(0, SOURCE_TOP_LIMIT),
    errors
  };
}

interface HuggingFaceModel {
  id?: string;
  modelId?: string;
  author?: string;
  downloads?: number;
  likes?: number;
  pipeline_tag?: string;
  tags?: string[];
  createdAt?: string;
  lastModified?: string;
}

async function collectHuggingFace(): Promise<SourceCollection<PlatformItem>> {
  try {
    const models = await fetchJson<HuggingFaceModel[]>(
      "https://huggingface.co/api/models?sort=downloads&direction=-1&limit=30"
    );
    return {
      source: "hugging_face",
      items: models
        .map((model): PlatformItem => {
          const modelId = model.modelId ?? model.id ?? "unknown-model";
          return {
            source: "hugging_face",
            externalId: modelId,
            title: modelId,
            body: [model.pipeline_tag, ...(model.tags ?? []).slice(0, 8)].filter(Boolean).join(", "),
            url: `https://huggingface.co/${modelId}`,
            author: model.author,
            publishedAt: model.lastModified ?? model.createdAt ?? now.toISOString(),
            metricValue: (model.downloads ?? 0) + (model.likes ?? 0) * 100,
            metricLabel: `${model.downloads ?? 0} downloads, ${model.likes ?? 0} likes`,
            entityType: "model"
          };
        })
        .sort((a, b) => scorePlatformItem(b) - scorePlatformItem(a))
        .slice(0, SOURCE_TOP_LIMIT),
      errors: []
    };
  } catch (error) {
    return {
      source: "hugging_face",
      items: [],
      errors: [error instanceof Error ? error.message : "Hugging Face refresh failed"]
    };
  }
}

interface NpmPackageMetadata {
  name: string;
  description?: string;
  "dist-tags"?: {
    latest?: string;
  };
  time?: Record<string, string>;
  maintainers?: Array<{ name?: string }>;
}

async function collectNpm(): Promise<SourceCollection<PlatformItem>> {
  const errors: string[] = [];
  const packages: Array<PlatformItem | null> = await Promise.all(
    npmPackages.map(async (packageName) => {
      try {
        const encodedName = packageName.startsWith("@") ? `@${encodeURIComponent(packageName.slice(1))}` : encodeURIComponent(packageName);
        const metadata = await fetchJson<NpmPackageMetadata>(`https://registry.npmjs.org/${encodedName}`);
        const latest = metadata["dist-tags"]?.latest;
        return {
          source: "npm",
          externalId: `${metadata.name}:${latest ?? "latest"}`,
          title: metadata.name,
          body: metadata.description,
          url: `https://www.npmjs.com/package/${metadata.name}`,
          author: metadata.maintainers?.[0]?.name,
          publishedAt: (latest && metadata.time?.[latest]) || metadata.time?.modified || now.toISOString(),
          metricValue: Object.keys(metadata.time ?? {}).length,
          metricLabel: latest ? `latest ${latest}` : "registry metadata",
          entityType: "tool"
        } as PlatformItem;
      } catch (error) {
        errors.push(error instanceof Error ? `${packageName}: ${error.message}` : `${packageName}: npm refresh failed`);
        return null;
      }
    })
  );

  return {
    source: "npm",
    items: packages
      .filter((item): item is PlatformItem => item !== null)
      .sort((a, b) => scorePlatformItem(b) - scorePlatformItem(a))
      .slice(0, SOURCE_TOP_LIMIT),
    errors
  };
}

interface PypiMetadata {
  info: {
    name: string;
    summary?: string;
    package_url?: string;
    author?: string;
    version?: string;
  };
  releases?: Record<string, Array<{ upload_time_iso_8601?: string; upload_time?: string }>>;
}

async function collectPypi(): Promise<SourceCollection<PlatformItem>> {
  const errors: string[] = [];
  const packages: Array<PlatformItem | null> = await Promise.all(
    pypiPackages.map(async (packageName) => {
      try {
        const metadata = await fetchJson<PypiMetadata>(`https://pypi.org/pypi/${encodeURIComponent(packageName)}/json`);
        const latest = metadata.info.version;
        const latestRelease = latest ? metadata.releases?.[latest]?.[0] : undefined;
        return {
          source: "pypi",
          externalId: `${metadata.info.name}:${latest ?? "latest"}`,
          title: metadata.info.name,
          body: metadata.info.summary,
          url: metadata.info.package_url ?? `https://pypi.org/project/${metadata.info.name}/`,
          author: metadata.info.author,
          publishedAt: latestRelease?.upload_time_iso_8601 ?? latestRelease?.upload_time ?? now.toISOString(),
          metricValue: Object.keys(metadata.releases ?? {}).length,
          metricLabel: latest ? `latest ${latest}` : "package metadata",
          entityType: "tool"
        } as PlatformItem;
      } catch (error) {
        errors.push(error instanceof Error ? `${packageName}: ${error.message}` : `${packageName}: PyPI refresh failed`);
        return null;
      }
    })
  );

  return {
    source: "pypi",
    items: packages
      .filter((item): item is PlatformItem => item !== null)
      .sort((a, b) => scorePlatformItem(b) - scorePlatformItem(a))
      .slice(0, SOURCE_TOP_LIMIT),
    errors
  };
}

function scoreRssArticle(article: RssArticle): number {
  const text = `${article.title} ${article.body ?? ""}`;
  const aiSignal = keywordScore(text);
  const freshness = recencyScore(article.publishedAt, 5);
  const feedRank = clamp01(1 - article.feedIndex / 30);
  return clamp01(0.5 * aiSignal + 0.3 * freshness + 0.2 * feedRank);
}

function scorePrimaryArticle(article: RssArticle): number {
  const text = `${article.title} ${article.body ?? ""}`;
  const aiSignal = keywordScore(text);
  const freshness = recencyScore(article.publishedAt, 14);
  const feedRank = clamp01(1 - article.feedIndex / 40);
  return clamp01(0.4 * aiSignal + 0.4 * freshness + 0.2 * feedRank);
}

function scorePlatformItem(item: PlatformItem): number {
  const text = `${item.title} ${item.body ?? ""} ${item.metricLabel}`;
  const metricSignal = clamp01(Math.log10(item.metricValue + 1) / 5);
  const freshness = recencyScore(item.publishedAt, 30);
  const aiSignal = keywordScore(text);
  return clamp01(0.4 * metricSignal + 0.35 * freshness + 0.25 * aiSignal);
}

function articleToTrend(article: RssArticle, index: number, signalScore: number): TrendEntity {
  const score = scoreFromSignal(signalScore);
  const source = article.source;
  const label = sourceMetadata[source].label;
  const publishedAt = Number.isNaN(Date.parse(article.publishedAt))
    ? now.toISOString()
    : new Date(article.publishedAt).toISOString();

  return {
    id: `${source}-${slugify(article.url ?? article.title)}`,
    canonicalName: article.title,
    entityType: source === "arxiv" ? "paper" : "tool",
    summary: article.body ?? article.title,
    reason: `Ranked from ${label} using AI keyword match, recency, and source position.`,
    officialUrl: article.url,
    score,
    sources: [
      {
        source,
        score: signalScore,
        mentions: 1,
        lastSeen: publishedAt,
        signal: `${Math.round(signalScore * 100)} relevance score from AI keywords, recency, and source position`
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

function rssArticleToTrend(article: RssArticle, index: number): TrendEntity {
  return articleToTrend(article, index, scoreRssArticle(article));
}

function primaryArticleToTrend(article: RssArticle, index: number): TrendEntity {
  return articleToTrend(article, index, scorePrimaryArticle(article));
}

function platformItemToTrend(item: PlatformItem, index: number): TrendEntity {
  const signalScore = scorePlatformItem(item);
  const score = scoreFromSignal(signalScore);
  const source = item.source;
  const publishedAt = Number.isNaN(Date.parse(item.publishedAt))
    ? now.toISOString()
    : new Date(item.publishedAt).toISOString();

  return {
    id: `${source}-${slugify(item.externalId || item.title)}`,
    canonicalName: item.title,
    entityType: item.entityType,
    summary: item.body || item.title,
    reason: `Ranked from ${sourceMetadata[source].label} using recency, AI keyword match, and platform metadata.`,
    officialUrl: item.url,
    score,
    sources: [
      {
        source,
        score: signalScore,
        mentions: 1,
        lastSeen: publishedAt,
        signal: `${Math.round(signalScore * 100)} relevance score from ${item.metricLabel}`
      }
    ],
    mentions: [
      {
        id: `${source}-${index}-${slugify(item.externalId)}`,
        source,
        title: item.title,
        body: item.body,
        url: item.url,
        author: item.author,
        publishedAt
      }
    ],
    history: historyFor(score.finalScore)
  };
}

function scoreGitHubRepo(repo: GitHubRepoSearchItem): number {
  const adoption = clamp01(Math.log10(repo.stargazers_count + 1) / 5);
  const forkSignal = clamp01(Math.log10(repo.forks_count + 1) / 4);
  const updateSignal = recencyScore(repo.pushed_at, 21);
  const createdSignal = recencyScore(repo.created_at, 180);
  const aiSignal = keywordScore(`${repo.full_name} ${repo.description ?? ""} ${repo.topics?.join(" ") ?? ""}`);

  return clamp01(0.35 * adoption + 0.2 * forkSignal + 0.2 * updateSignal + 0.15 * aiSignal + 0.1 * createdSignal);
}

function repoToTrend(repo: GitHubRepoSearchItem, index: number): TrendEntity {
  const githubScore = scoreGitHubRepo(repo);
  const score = computeTrendScore({
    hnDiscussionScore: 0,
    githubAdoptionScore: githubScore
  });

  return {
    id: slugify(repo.full_name),
    canonicalName: repo.full_name,
    entityType: "repo",
    summary: repo.description ?? "Repository surfaced by GitHub Search API during the scheduled trend refresh.",
    reason: "Ranked from GitHub stars, forks, update recency, repository novelty, and AI keyword match.",
    githubRepoUrl: repo.html_url,
    score,
    sources: [
      {
        source: "github",
        score: githubScore,
        mentions: 1,
        lastSeen: repo.pushed_at,
        signal: `${repo.stargazers_count} stars, ${repo.forks_count} forks, pushed ${repo.pushed_at}`
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

function scoreHackerNewsStory(story: Awaited<ReturnType<typeof collectHackerNews>>["stories"][number]): number {
  const discussion = clamp01(Math.log10((story.score ?? 0) + 1) / Math.log10(501));
  const comments = clamp01(Math.log10((story.descendants ?? 0) + 1) / Math.log10(201));
  const freshness = recencyScore(story.time, 3);
  const aiSignal = keywordScore(`${story.title ?? ""} ${story.text ?? ""} ${story.url ?? ""}`);

  return clamp01(0.35 * discussion + 0.3 * comments + 0.2 * freshness + 0.15 * aiSignal);
}

function hnStoryToTrend(story: Awaited<ReturnType<typeof collectHackerNews>>["stories"][number]): TrendEntity {
  const hnScore = scoreHackerNewsStory(story);
  const score = computeTrendScore({
    hnDiscussionScore: hnScore,
    githubAdoptionScore: 0
  });

  return {
    id: `hn-${story.id}`,
    canonicalName: story.title ?? `HN story ${story.id}`,
    entityType: "tool",
    summary: story.title ?? "AI-related Hacker News story from the scheduled refresh.",
    reason: "Ranked from Hacker News points, comments, recency, and AI keyword match.",
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

function statusForSource(source: SourceName, errors: string[], itemCount: number, notes: string): SourceStatus {
  const nextMorning = new Date(now);
  nextMorning.setUTCHours(now.getUTCHours() < 8 ? 8 : 24, 0, 0, 0);

  return {
    source,
    label: source === "hn" ? "Hacker News Firebase API" : source === "github" ? "GitHub Search API" : sourceMetadata[source].label,
    status: errors.length ? "degraded" : "healthy",
    lastSync: itemCount > 0 ? now.toISOString() : null,
    nextSync: nextMorning.toISOString(),
    errors,
    notes
  };
}

function buildSourceStatuses(
  hnErrors: string[],
  githubErrors: string[],
  scheduledErrors: Partial<Record<SourceName, string[]>>,
  scheduledCounts: Partial<Record<SourceName, number>>
): SourceStatus[] {
  const statuses: SourceStatus[] = [
    statusForSource("hn", hnErrors, scheduledCounts.hn ?? 0, "Uses topstories, newstories, beststories, and item detail endpoints."),
    statusForSource("github", githubErrors, scheduledCounts.github ?? 0, "Uses repository search sorted by recently updated repositories; star growth comes from snapshots.")
  ];

  for (const source of activeScheduledSourceOrder) {
    statuses.push(statusForSource(
      source,
      scheduledErrors[source] ?? [],
      scheduledCounts[source] ?? 0,
      `${sourceMetadata[source].region} source. ${sourceMetadata[source].description}`
    ));
  }

  return statuses;
}

async function main() {
  const [hn, github, officialBlogs, arxiv, githubReleases, huggingFace, npm, pypi, rssCollections] = await Promise.all([
    collectHackerNews(),
    collectGitHub(),
    collectOfficialBlogs(),
    collectArxiv(),
    collectGitHubReleases(),
    collectHuggingFace(),
    collectNpm(),
    collectPypi(),
    Promise.all(rssSourceOrder.map((source) => collectRssSource(source)))
  ]);
  const githubTrends = github.repos.slice(0, SOURCE_TOP_LIMIT).map(repoToTrend);
  const hnTrends = hn.stories
    .sort((a, b) => scoreHackerNewsStory(b) - scoreHackerNewsStory(a))
    .slice(0, SOURCE_TOP_LIMIT)
    .map(hnStoryToTrend);
  const officialBlogTrends = officialBlogs.items.map(primaryArticleToTrend);
  const arxivTrends = arxiv.items.map(primaryArticleToTrend);
  const githubReleaseTrends = githubReleases.items.map(platformItemToTrend);
  const huggingFaceTrends = huggingFace.items.map(platformItemToTrend);
  const npmTrends = npm.items.map(platformItemToTrend);
  const pypiTrends = pypi.items.map(platformItemToTrend);
  const rssTrends = Object.fromEntries(
    rssCollections.map((collection) => [
      collection.source,
      collection.articles.slice(0, SOURCE_TOP_LIMIT).map((article, index) => rssArticleToTrend(article, index))
    ])
  ) as Partial<Record<SourceName, TrendEntity[]>>;
  const scheduledCollections = [
    officialBlogs,
    arxiv,
    githubReleases,
    huggingFace,
    npm,
    pypi,
    ...rssCollections.map((collection) => ({
      source: collection.source,
      items: collection.articles,
      errors: collection.errors
    }))
  ];
  const scheduledErrors = Object.fromEntries(
    scheduledCollections.map((collection) => [collection.source, collection.errors])
  ) as Partial<Record<SourceName, string[]>>;
  const scheduledCounts = Object.fromEntries(
    [
      ["hn", hnTrends.length],
      ["github", githubTrends.length],
      ...scheduledCollections.map((collection) => [collection.source, collection.items.length])
    ]
  ) as Partial<Record<SourceName, number>>;
  const trends = [
    ...officialBlogTrends,
    ...arxivTrends,
    ...githubReleaseTrends,
    ...githubTrends,
    ...hnTrends,
    ...huggingFaceTrends,
    ...npmTrends,
    ...pypiTrends,
    ...Object.values(rssTrends).flat()
  ]
    .sort((a, b) => b.score.finalScore - a.score.finalScore)
    .slice(0, DAILY_LIMIT);
  const sourceTopTrends: Partial<Record<SourceName, TrendEntity[]>> = {
    official_blog: officialBlogTrends,
    arxiv: arxivTrends,
    github_releases: githubReleaseTrends,
    hn: hnTrends,
    github: githubTrends,
    hugging_face: huggingFaceTrends,
    npm: npmTrends,
    pypi: pypiTrends,
    ...rssTrends
  };
  const sourceCounts = Object.entries(sourceTopTrends)
    .map(([source, items]) => `${sourceMetadata[source as SourceName].shortLabel}: ${items?.length ?? 0}`)
    .join(", ");

  const dailyReport: DailyReport = {
    date: today,
    summary:
      trends.length > 0
        ? `Scheduled refresh found Top 15 candidates by source (${sourceCounts}).`
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
    sourceStatuses: buildSourceStatuses(hn.errors, github.errors, scheduledErrors, scheduledCounts),
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
