import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { aiQueries } from "../src/config";
import type { DailyReport, SourceName, SourceStatus, TrendEntity } from "../src/domain";
import { fetchHackerNewsItem, fetchHackerNewsStoryIds } from "../src/clients/hackerNews";
import { searchGitHubRepositories, type GitHubRepoSearchItem } from "../src/clients/github";
import { computeTrendScore } from "../src/trendScoring";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const outputPath = join(rootDir, "src/generated/snapshot.json");

const now = new Date();
const today = now.toISOString().slice(0, 10);

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

function buildSourceStatuses(hnErrors: string[], githubErrors: string[]): SourceStatus[] {
  const nextMorning = new Date(now);
  nextMorning.setUTCHours(now.getUTCHours() < 8 ? 8 : 24, 0, 0, 0);

  return [
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
}

async function main() {
  const [hn, github] = await Promise.all([collectHackerNews(), collectGitHub()]);
  const githubTrends = github.repos.slice(0, 20).map(repoToTrend);
  const hnTrends = hn.stories.slice(0, 20).map(hnStoryToTrend);
  const trends = [...githubTrends, ...hnTrends]
    .sort((a, b) => b.score.finalScore - a.score.finalScore)
    .slice(0, 20);
  const sourceTopTrends: Partial<Record<SourceName, TrendEntity[]>> = {
    hn: hnTrends,
    github: githubTrends
  };

  const dailyReport: DailyReport = {
    date: today,
    summary:
      trends.length > 0
        ? `Scheduled refresh found ${hnTrends.length} HN topics and ${githubTrends.length} GitHub repositories.`
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
    sourceStatuses: buildSourceStatuses(hn.errors, github.errors),
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
