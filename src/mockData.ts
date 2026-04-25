import type { DailyReport, SourceStatus, TrendEntity } from "./domain";
import { computeTrendScore } from "./trendScoring";

export const trends: TrendEntity[] = [
  {
    id: "open-runtime-agents",
    canonicalName: "Open Runtime Agents",
    entityType: "tool",
    summary: "Agent runtime libraries are gaining developer attention through practical repo launches.",
    reason: "Strong GitHub adoption and healthy HN discussion with lower social-only skew.",
    officialUrl: "https://example.com/open-runtime-agents",
    githubRepoUrl: "https://github.com/example/open-runtime-agents",
    score: computeTrendScore({
      hnDiscussionScore: 0.72,
      xVelocityScore: 0.48,
      githubAdoptionScore: 0.88,
      noveltyScore: 0.69,
      credibilityScore: 0.82
    }),
    sources: [
      {
        source: "hn",
        score: 0.72,
        mentions: 8,
        lastSeen: "2026-04-25T06:20:00Z",
        signal: "Front-page thread with implementation discussion"
      },
      {
        source: "x",
        score: 0.48,
        mentions: 22,
        lastSeen: "2026-04-25T08:10:00Z",
        signal: "Moderate repost velocity from builders"
      },
      {
        source: "github",
        score: 0.88,
        mentions: 3,
        lastSeen: "2026-04-25T07:44:00Z",
        signal: "Fast star growth and recent pushes"
      }
    ],
    mentions: [
      {
        id: "hn-1",
        source: "hn",
        title: "Show HN: Open Runtime Agents",
        url: "https://news.ycombinator.com/item?id=1",
        author: "builder42",
        publishedAt: "2026-04-25T06:20:00Z"
      },
      {
        id: "gh-1",
        source: "github",
        title: "example/open-runtime-agents",
        url: "https://github.com/example/open-runtime-agents",
        publishedAt: "2026-04-25T07:44:00Z"
      }
    ],
    history: [
      { date: "2026-04-21", score: 0.31 },
      { date: "2026-04-22", score: 0.43 },
      { date: "2026-04-23", score: 0.51 },
      { date: "2026-04-24", score: 0.58 },
      { date: "2026-04-25", score: 0.69 }
    ]
  },
  {
    id: "tiny-vision-adapters",
    canonicalName: "Tiny Vision Adapters",
    entityType: "paper",
    summary: "A lightweight adaptation technique is spreading from paper discussion into repo experiments.",
    reason: "Balanced cross-platform lift, with novelty higher than current production credibility.",
    officialUrl: "https://example.com/tiny-vision-adapters",
    score: computeTrendScore({
      hnDiscussionScore: 0.61,
      xVelocityScore: 0.7,
      githubAdoptionScore: 0.44,
      noveltyScore: 0.86,
      credibilityScore: 0.58
    }),
    sources: [
      {
        source: "hn",
        score: 0.61,
        mentions: 5,
        lastSeen: "2026-04-25T05:25:00Z",
        signal: "Paper critique and replication questions"
      },
      {
        source: "x",
        score: 0.7,
        mentions: 37,
        lastSeen: "2026-04-25T08:31:00Z",
        signal: "Rapid sharing by ML accounts"
      },
      {
        source: "github",
        score: 0.44,
        mentions: 2,
        lastSeen: "2026-04-25T04:18:00Z",
        signal: "Two early implementations"
      }
    ],
    mentions: [
      {
        id: "x-2",
        source: "x",
        title: "Tiny adapters could change edge vision deployments",
        url: "https://x.com/i/web/status/20",
        author: "alice",
        publishedAt: "2026-04-25T08:31:00Z"
      }
    ],
    history: [
      { date: "2026-04-21", score: 0.16 },
      { date: "2026-04-22", score: 0.24 },
      { date: "2026-04-23", score: 0.39 },
      { date: "2026-04-24", score: 0.52 },
      { date: "2026-04-25", score: 0.62 }
    ]
  },
  {
    id: "demo-video-prompts",
    canonicalName: "Demo Video Prompts",
    entityType: "model",
    summary: "Social posts are accelerating faster than durable developer artifacts.",
    reason: "High X velocity without matching GitHub or HN signal makes this likely hype for now.",
    score: computeTrendScore({
      hnDiscussionScore: 0.22,
      xVelocityScore: 0.91,
      githubAdoptionScore: 0.08,
      noveltyScore: 0.62,
      credibilityScore: 0.32
    }),
    sources: [
      {
        source: "hn",
        score: 0.22,
        mentions: 1,
        lastSeen: "2026-04-25T03:02:00Z",
        signal: "Single skeptical thread"
      },
      {
        source: "x",
        score: 0.91,
        mentions: 81,
        lastSeen: "2026-04-25T08:55:00Z",
        signal: "High repost velocity"
      },
      {
        source: "github",
        score: 0.08,
        mentions: 0,
        lastSeen: "2026-04-24T22:15:00Z",
        signal: "No meaningful repo activity"
      }
    ],
    mentions: [],
    history: [
      { date: "2026-04-21", score: 0.1 },
      { date: "2026-04-22", score: 0.18 },
      { date: "2026-04-23", score: 0.26 },
      { date: "2026-04-24", score: 0.35 },
      { date: "2026-04-25", score: 0.44 }
    ]
  }
];

export const sourceStatuses: SourceStatus[] = [
  {
    source: "hn",
    label: "Hacker News Firebase API",
    status: "healthy",
    lastSync: "2026-04-25T08:45:00Z",
    nextSync: "2026-04-25T09:45:00Z",
    errors: [],
    notes: "Uses topstories, newstories, beststories, and item detail endpoints."
  },
  {
    source: "x",
    label: "X Recent Search API",
    status: "disabled",
    lastSync: null,
    nextSync: null,
    errors: ["X_BEARER_TOKEN is not configured"],
    notes: "Requires API access and a bearer token before scheduled ingestion can run."
  },
  {
    source: "github",
    label: "GitHub Search API",
    status: "healthy",
    lastSync: "2026-04-25T08:30:00Z",
    nextSync: "2026-04-25T10:30:00Z",
    errors: [],
    notes: "MVP uses repository search sorted by updated or stars; star growth comes from snapshots."
  }
];

export const dailyReport: DailyReport = {
  date: "2026-04-25",
  summary:
    "Developer adoption signals are strongest around agent runtimes. Social velocity is noisy around demo video prompts, so it should be watched but not treated as adoption yet.",
  topTrendIds: ["open-runtime-agents", "tiny-vision-adapters", "demo-video-prompts"],
  newEntities: ["Tiny Vision Adapters", "Demo Video Prompts"],
  highConfidence: [],
  likelyHype: ["Demo Video Prompts"]
};

export function getTrendById(id: string): TrendEntity | undefined {
  return trends.find((trend) => trend.id === id);
}

