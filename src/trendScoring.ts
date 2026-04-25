export type TrendVerdict = "high-confidence" | "watchlist" | "emerging" | "likely-hype";

export interface TrendScoreInput {
  hnDiscussionScore: number;
  xVelocityScore: number;
  githubAdoptionScore: number;
  noveltyScore: number;
  credibilityScore: number;
}

export interface TrendScoreBreakdown {
  hnComponent: number;
  xComponent: number;
  githubComponent: number;
  noveltyComponent: number;
  credibilityComponent: number;
  finalScore: number;
  verdict: TrendVerdict;
}

const WEIGHTS = {
  hn: 0.3,
  x: 0.3,
  github: 0.25,
  novelty: 0.1,
  credibility: 0.05
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
  const x = clamp01(input.xVelocityScore);
  const github = clamp01(input.githubAdoptionScore);
  const novelty = clamp01(input.noveltyScore);
  const credibility = clamp01(input.credibilityScore);

  const hnComponent = WEIGHTS.hn * hn;
  const xComponent = WEIGHTS.x * x;
  const githubComponent = WEIGHTS.github * github;
  const noveltyComponent = WEIGHTS.novelty * novelty;
  const credibilityComponent = WEIGHTS.credibility * credibility;
  const finalScore =
    hnComponent + xComponent + githubComponent + noveltyComponent + credibilityComponent;

  return {
    hnComponent,
    xComponent,
    githubComponent,
    noveltyComponent,
    credibilityComponent,
    finalScore,
    verdict: classifyVerdict(finalScore)
  };
}

