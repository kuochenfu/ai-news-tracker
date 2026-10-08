import type { SourceName } from "../domain";
import { aiQueries } from "../config";
import { sourceMetadata } from "../sources";
import { parseDate, parseFeed } from "./feed";
import { fetchJson, fetchText, mapLimit } from "./http";
import type { Candidate, CollectorResult } from "./types";

const FEED_ACCEPT = "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8";

const officialBlogFeeds = ["https://openai.com/news/rss.xml", "https://huggingface.co/blog/feed.xml"];

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
  "@google/genai",
  "@ai-sdk/openai",
  "langchain",
  "@langchain/core",
  "llamaindex",
  "ollama",
  "chromadb",
  "@mistralai/mistralai"
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
  "llama-cpp-python",
  "vllm",
  "mcp"
];

function message(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function githubHeaders(): Record<string, string> {
  return {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {})
  };
}

/** Summarises partial failures as one error line instead of hiding them. */
function partialError(failures: string[], attempted: number): string[] {
  if (failures.length === 0) return [];
  return [`${failures.length}/${attempted} requests failed: ${failures.slice(0, 3).join("; ")}${failures.length > 3 ? " …" : ""}`];
}

interface HnItem {
  id: number;
  type?: string;
  by?: string;
  time?: number;
  text?: string;
  url?: string;
  score?: number;
  title?: string;
  descendants?: number;
  dead?: boolean;
  deleted?: boolean;
}

export async function collectHackerNews(): Promise<CollectorResult> {
  const base = "https://hacker-news.firebaseio.com/v0";
  try {
    const lists = await Promise.all(["topstories", "newstories", "beststories"].map((kind) => fetchJson<number[]>(`${base}/${kind}.json`)));
    const ids = [...new Set(lists.flat())].slice(0, 240);
    const failures: string[] = [];
    const items = await mapLimit(ids, 24, async (id) => {
      try {
        return await fetchJson<HnItem | null>(`${base}/item/${id}.json`, {}, { timeoutMs: 8_000, retries: 1 });
      } catch (error) {
        failures.push(message(error, `item ${id}`));
        return null;
      }
    });
    const candidates = items.flatMap((item): Candidate[] => {
      if (!item || item.type !== "story" || !item.title || item.dead || item.deleted) return [];
      return [
        {
          source: "hn",
          externalId: String(item.id),
          title: item.title,
          body: item.text,
          url: item.url ?? `https://news.ycombinator.com/item?id=${item.id}`,
          author: item.by,
          publishedAt: item.time ? new Date(item.time * 1000).toISOString() : null,
          entityType: "story",
          metric: { name: "points", label: `${item.score ?? 0} points`, value: item.score ?? 0 },
          signals: { comments: item.descendants ?? 0 }
        }
      ];
    });
    return { source: "hn", candidates, errors: partialError(failures, ids.length), attempted: ids.length, failed: failures.length };
  } catch (error) {
    return { source: "hn", candidates: [], errors: [message(error, "Hacker News refresh failed")] };
  }
}

interface GitHubRepoSearchItem {
  id: number;
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  topics?: string[];
  pushed_at: string;
  created_at: string;
  owner: { login: string };
}

export async function collectGitHub(): Promise<CollectorResult> {
  const failures: string[] = [];
  const reposById = new Map<number, GitHubRepoSearchItem>();
  const queries = aiQueries.slice(0, 5);

  for (const query of queries) {
    try {
      const url = new URL("https://api.github.com/search/repositories");
      url.searchParams.set("q", `${query} stars:>50`);
      url.searchParams.set("sort", "updated");
      url.searchParams.set("per_page", "30");
      const { items } = await fetchJson<{ items: GitHubRepoSearchItem[] }>(url, githubHeaders());
      for (const repo of items) reposById.set(repo.id, repo);
    } catch (error) {
      failures.push(`${query}: ${message(error, "search failed")}`);
    }
  }

  const candidates = [...reposById.values()].map(
    (repo): Candidate => ({
      source: "github",
      externalId: String(repo.id),
      title: repo.full_name,
      body: [repo.description, ...(repo.topics ?? [])].filter(Boolean).join(" · "),
      url: repo.html_url,
      author: repo.owner.login,
      publishedAt: parseDate(repo.pushed_at),
      entityType: "repo",
      repoFullName: repo.full_name,
      metric: { name: "stars", label: `${repo.stargazers_count} stars`, value: repo.stargazers_count },
      signals: { forks: repo.forks_count, createdAt: Date.parse(repo.created_at) || 0 }
    })
  );
  return { source: "github", candidates, errors: partialError(failures, queries.length), attempted: queries.length, failed: failures.length };
}

export async function collectRss(source: SourceName): Promise<CollectorResult> {
  const feedUrl = sourceMetadata[source].feedUrl;
  if (!feedUrl) return { source, candidates: [], errors: ["No feed configured"] };
  try {
    const candidates = parseFeed(await fetchText(feedUrl, FEED_ACCEPT), source);
    return { source, candidates, errors: candidates.length === 0 ? [`${sourceMetadata[source].label} feed returned no items`] : [] };
  } catch (error) {
    return { source, candidates: [], errors: [message(error, `${sourceMetadata[source].label} feed failed`)] };
  }
}

export async function collectOfficialBlogs(): Promise<CollectorResult> {
  const failures: string[] = [];
  const lists = await Promise.all(
    officialBlogFeeds.map(async (feedUrl) => {
      try {
        return parseFeed(await fetchText(feedUrl, FEED_ACCEPT), "official_blog");
      } catch (error) {
        failures.push(message(error, feedUrl));
        return [];
      }
    })
  );
  return {
    source: "official_blog",
    candidates: lists.flat(),
    errors: partialError(failures, officialBlogFeeds.length),
    attempted: officialBlogFeeds.length,
    failed: failures.length
  };
}

export async function collectArxiv(): Promise<CollectorResult> {
  const query = encodeURIComponent("(cat:cs.AI OR cat:cs.LG OR cat:cs.CL OR cat:cs.CV) AND (ai OR agent OR llm OR model OR inference)");
  const url = `https://export.arxiv.org/api/query?search_query=${query}&sortBy=submittedDate&sortOrder=descending&max_results=40`;
  try {
    const candidates = parseFeed(await fetchText(url, FEED_ACCEPT, { timeoutMs: 30_000 }), "arxiv", "paper");
    return { source: "arxiv", candidates, errors: candidates.length === 0 ? ["arXiv returned no entries"] : [] };
  } catch (error) {
    return { source: "arxiv", candidates: [], errors: [message(error, "arXiv refresh failed")] };
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
  prerelease?: boolean;
  draft?: boolean;
  author?: { login?: string };
}

export async function collectGitHubReleases(): Promise<CollectorResult> {
  const failures: string[] = [];
  const lists = await mapLimit(releaseRepos, 5, async (repo) => {
    try {
      const releases = await fetchJson<GitHubRelease[]>(`https://api.github.com/repos/${repo}/releases?per_page=5`, githubHeaders());
      return releases
        .filter((release) => !release.draft)
        .map(
          (release): Candidate => ({
            source: "github_releases",
            externalId: `${repo}:${release.id}`,
            title: `${repo} ${release.name || release.tag_name}`,
            body: release.body ?? undefined,
            url: release.html_url,
            author: release.author?.login,
            publishedAt: parseDate(release.published_at ?? release.created_at),
            entityType: "release",
            repoFullName: repo,
            releaseTag: release.tag_name,
            signals: { prerelease: release.prerelease ? 1 : 0 }
          })
        );
    } catch (error) {
      failures.push(`${repo}: ${message(error, "release refresh failed")}`);
      return [];
    }
  });
  return {
    source: "github_releases",
    candidates: lists.flat(),
    errors: partialError(failures, releaseRepos.length),
    attempted: releaseRepos.length,
    failed: failures.length
  };
}

interface HuggingFaceModel {
  id: string;
  likes?: number;
  downloads?: number;
  trendingScore?: number;
  pipeline_tag?: string;
  tags?: string[];
  createdAt?: string;
}

export async function collectHuggingFace(): Promise<CollectorResult> {
  try {
    const models = await fetchJson<HuggingFaceModel[]>("https://huggingface.co/api/models?sort=trendingScore&limit=40");
    const candidates = models.map(
      (model): Candidate => ({
        source: "hugging_face",
        externalId: model.id,
        title: model.id,
        body: [model.pipeline_tag, ...(model.tags ?? []).filter((tag) => !tag.includes(":")).slice(0, 8)].filter(Boolean).join(", "),
        url: `https://huggingface.co/${model.id}`,
        author: model.id.split("/")[0],
        publishedAt: parseDate(model.createdAt),
        entityType: "model",
        metric: { name: "likes", label: `${model.likes ?? 0} likes`, value: model.likes ?? 0 },
        signals: { trending: model.trendingScore ?? 0, downloads: model.downloads ?? 0 }
      })
    );
    return { source: "hugging_face", candidates, errors: [] };
  } catch (error) {
    return { source: "hugging_face", candidates: [], errors: [message(error, "Hugging Face refresh failed")] };
  }
}

interface NpmMetadata {
  name: string;
  description?: string;
  "dist-tags"?: { latest?: string };
  time?: Record<string, string>;
  maintainers?: Array<{ name?: string }>;
}

export async function collectNpm(): Promise<CollectorResult> {
  const failures: string[] = [];
  const items = await mapLimit(npmPackages, 4, async (name): Promise<Candidate | null> => {
    try {
      const encoded = name.startsWith("@") ? `@${encodeURIComponent(name.slice(1))}` : encodeURIComponent(name);
      const [metadata, downloads] = await Promise.all([
        fetchJson<NpmMetadata>(`https://registry.npmjs.org/${encoded}`),
        fetchJson<{ downloads: number }>(`https://api.npmjs.org/downloads/point/last-week/${encoded}`)
      ]);
      const latest = metadata["dist-tags"]?.latest;
      return {
        source: "npm",
        externalId: `${metadata.name}@${latest ?? "latest"}`,
        title: latest ? `${metadata.name} ${latest}` : metadata.name,
        body: metadata.description,
        url: `https://www.npmjs.com/package/${metadata.name}`,
        author: metadata.maintainers?.[0]?.name,
        publishedAt: parseDate(latest ? metadata.time?.[latest] : undefined),
        entityType: "package",
        packageName: metadata.name,
        metric: { name: "weekly_downloads", label: `${downloads.downloads} weekly downloads`, value: downloads.downloads }
      };
    } catch (error) {
      failures.push(`${name}: ${message(error, "npm refresh failed")}`);
      return null;
    }
  });
  return {
    source: "npm",
    candidates: items.filter((item): item is Candidate => item !== null),
    errors: partialError(failures, npmPackages.length),
    attempted: npmPackages.length,
    failed: failures.length
  };
}

interface PypiMetadata {
  info: { name: string; summary?: string; package_url?: string; author?: string; version?: string };
  urls?: Array<{ upload_time_iso_8601?: string }>;
}

export async function collectPypi(): Promise<CollectorResult> {
  const failures: string[] = [];
  const items = await mapLimit(pypiPackages, 3, async (name): Promise<Candidate | null> => {
    try {
      const [metadata, stats] = await Promise.all([
        fetchJson<PypiMetadata>(`https://pypi.org/pypi/${encodeURIComponent(name)}/json`),
        fetchJson<{ data: { last_week: number } }>(`https://pypistats.org/api/packages/${encodeURIComponent(name.toLowerCase())}/recent`)
      ]);
      const { info } = metadata;
      return {
        source: "pypi",
        externalId: `${info.name}@${info.version ?? "latest"}`,
        title: info.version ? `${info.name} ${info.version}` : info.name,
        body: info.summary,
        url: info.package_url ?? `https://pypi.org/project/${info.name}/`,
        author: info.author,
        publishedAt: parseDate(metadata.urls?.[0]?.upload_time_iso_8601),
        entityType: "package",
        packageName: info.name,
        metric: { name: "weekly_downloads", label: `${stats.data.last_week} weekly downloads`, value: stats.data.last_week }
      };
    } catch (error) {
      failures.push(`${name}: ${message(error, "PyPI refresh failed")}`);
      return null;
    }
  });
  return {
    source: "pypi",
    candidates: items.filter((item): item is Candidate => item !== null),
    errors: partialError(failures, pypiPackages.length),
    attempted: pypiPackages.length,
    failed: failures.length
  };
}

export async function collectAll(): Promise<CollectorResult[]> {
  const rssSources = (Object.keys(sourceMetadata) as SourceName[]).filter((source) => sourceMetadata[source].feedUrl);
  return Promise.all([
    collectHackerNews(),
    collectGitHub(),
    collectOfficialBlogs(),
    collectArxiv(),
    collectGitHubReleases(),
    collectHuggingFace(),
    collectNpm(),
    collectPypi(),
    ...rssSources.map((source) => collectRss(source))
  ]);
}
