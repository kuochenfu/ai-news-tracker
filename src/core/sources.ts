import type { AnyRecord } from './keys';

export function parseHnStory(item: AnyRecord): AnyRecord {
  return {
    external_id: String(item.id),
    source: 'hn',
    title: item.title ?? null,
    body: item.text ?? null,
    url: item.url ?? null,
    author: item.by ?? null,
    published_at: item.time ?? null,
    score: item.score ?? 0,
    comment_count: item.descendants ?? 0,
    raw_json: { ...item }
  };
}

export function parseXPost(post: AnyRecord, includes?: AnyRecord): AnyRecord {
  const metrics = (post.public_metrics as AnyRecord | undefined) ?? {};
  const authorId = post.author_id;

  let author = authorId;
  const users = includes?.users;
  if (authorId && Array.isArray(users)) {
    const match = users.find((user) => {
      const record = user as AnyRecord;
      return record.id === authorId;
    }) as AnyRecord | undefined;
    if (match) author = match.username ?? authorId;
  }

  return {
    external_id: String(post.id),
    source: 'x',
    title: null,
    body: post.text ?? null,
    url: `https://x.com/i/web/status/${String(post.id)}`,
    author,
    published_at: post.created_at ?? null,
    like_count: metrics.like_count ?? 0,
    repost_count: metrics.retweet_count ?? 0,
    reply_count: metrics.reply_count ?? 0,
    quote_count: metrics.quote_count ?? 0,
    raw_json: { ...post }
  };
}

export function parseGithubRepo(repo: AnyRecord): AnyRecord {
  const owner = (repo.owner as AnyRecord | undefined) ?? {};
  return {
    external_id: String(repo.id),
    source: 'github',
    title: repo.full_name ?? null,
    body: repo.description ?? null,
    url: repo.html_url ?? null,
    author: owner.login ?? null,
    published_at: repo.created_at ?? null,
    stars: repo.stargazers_count ?? 0,
    forks: repo.forks_count ?? 0,
    language: repo.language ?? null,
    topics: repo.topics ?? [],
    pushed_at: repo.pushed_at ?? null,
    raw_json: { ...repo }
  };
}
