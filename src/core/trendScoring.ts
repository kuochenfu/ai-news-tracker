export type TrendScoreInput = {
  hnDiscussionScore: number;
  xVelocityScore: number;
  githubAdoptionScore: number;
  noveltyScore: number;
  credibilityScore: number;
};

export type TrendScoreBreakdown = {
  hnComponent: number;
  xComponent: number;
  githubComponent: number;
  noveltyComponent: number;
  credibilityComponent: number;
  finalScore: number;
  verdict: string;
};

export const WEIGHTS = {
  hn: 0.3,
  x: 0.3,
  github: 0.25,
  novelty: 0.1,
  credibility: 0.05
};

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function classifyVerdict(score: number): string {
  if (score >= 0.75) return 'high-confidence';
  if (score >= 0.5) return 'watchlist';
  if (score >= 0.3) return 'emerging';
  return 'likely-hype';
}

export function computeTrendScore(inputs: TrendScoreInput): TrendScoreBreakdown {
  const hn = clamp01(inputs.hnDiscussionScore);
  const x = clamp01(inputs.xVelocityScore);
  const gh = clamp01(inputs.githubAdoptionScore);
  const novelty = clamp01(inputs.noveltyScore);
  const credibility = clamp01(inputs.credibilityScore);

  const hnComponent = WEIGHTS.hn * hn;
  const xComponent = WEIGHTS.x * x;
  const githubComponent = WEIGHTS.github * gh;
  const noveltyComponent = WEIGHTS.novelty * novelty;
  const credibilityComponent = WEIGHTS.credibility * credibility;

  const finalScore = hnComponent + xComponent + githubComponent + noveltyComponent + credibilityComponent;

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
