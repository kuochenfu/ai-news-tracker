export type SourceName = "hn" | "x" | "github";

export interface NormalizedSourceEvent {
  source: SourceName;
  externalId: string;
  title: string | null;
  body: string | null;
  url: string | null;
  author: string | null;
  publishedAt: string | null;
  metrics: Record<string, number>;
  raw: unknown;
}

interface HackerNewsStory {
  id: number | string;
  title?: string;
  text?: string;
  url?: string;
  by?: string;
  time?: number | string;
  score?: number;
  descendants?: number;
}

interface XPost {
  id: string;
  author_id?: string;
  text?: string;
  created_at?: string;
  public_metrics?: {
    like_count?: number;
    retweet_count?: number;
    reply_count?: number;
    quote_count?: number;
  };
}

interface XIncludes {
  users?: Array<{
    id: string;
    username?: string;
  }>;
}

interface GitHubRepo {
  id: number | string;
  full_name?: string;
  description?: string | null;
  html_url?: string;
  owner?: {
    login?: string;
  };
  created_at?: string;
  stargazers_count?: number;
  forks_count?: number;
}

function toNullableString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function parseHackerNewsStory(item: HackerNewsStory): NormalizedSourceEvent {
  return {
    source: "hn",
    externalId: String(item.id),
    title: toNullableString(item.title),
    body: toNullableString(item.text),
    url: toNullableString(item.url),
    author: toNullableString(item.by),
    publishedAt: item.time === undefined ? null : String(item.time),
    metrics: {
      score: item.score ?? 0,
      commentCount: item.descendants ?? 0
    },
    raw: item
  };
}

export function parseXPost(post: XPost, includes?: XIncludes): NormalizedSourceEvent {
  const metrics = post.public_metrics ?? {};
  const author = includes?.users?.find((user) => user.id === post.author_id)?.username ?? post.author_id;

  return {
    source: "x",
    externalId: post.id,
    title: null,
    body: toNullableString(post.text),
    url: `https://x.com/i/web/status/${post.id}`,
    author: author ?? null,
    publishedAt: toNullableString(post.created_at),
    metrics: {
      likeCount: metrics.like_count ?? 0,
      repostCount: metrics.retweet_count ?? 0,
      replyCount: metrics.reply_count ?? 0,
      quoteCount: metrics.quote_count ?? 0
    },
    raw: post
  };
}

export function parseGitHubRepo(repo: GitHubRepo): NormalizedSourceEvent {
  return {
    source: "github",
    externalId: String(repo.id),
    title: toNullableString(repo.full_name),
    body: toNullableString(repo.description),
    url: toNullableString(repo.html_url),
    author: repo.owner?.login ?? null,
    publishedAt: toNullableString(repo.created_at),
    metrics: {
      stars: repo.stargazers_count ?? 0,
      forks: repo.forks_count ?? 0
    },
    raw: repo
  };
}

