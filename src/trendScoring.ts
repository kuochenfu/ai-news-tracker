export type TrendVerdict = "high-confidence" | "watchlist" | "emerging" | "likely-hype";

export interface TrendScoreInput {
  hnDiscussionScore: number;
  githubAdoptionScore: number;
}

export interface TrendScoreBreakdown {
  hnComponent: number;
  githubComponent: number;
  finalScore: number;
  verdict: TrendVerdict;
}

const WEIGHTS = {
  hn: 0.55,
  github: 0.45
} as const;

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function classifyVerdict(score: number): TrendVerdict {
  if (score >= 0.75) {
    return "high-confidence";
  }
  if (score >= 0.5) {
    return "watchlist";
  }
  if (score >= 0.3) {
    return "emerging";
  }
  return "likely-hype";
}

export function computeTrendScore(input: TrendScoreInput): TrendScoreBreakdown {
  const hn = clamp01(input.hnDiscussionScore);
  const github = clamp01(input.githubAdoptionScore);

  const hnComponent = WEIGHTS.hn * hn;
  const githubComponent = WEIGHTS.github * github;
  const finalScore = hnComponent + githubComponent;

  return {
    hnComponent,
    githubComponent,
    finalScore,
    verdict: classifyVerdict(finalScore)
  };
}
