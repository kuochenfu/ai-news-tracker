export {
  classifyVerdict,
  computeTrendScore,
  type TrendScoreBreakdown,
  type TrendScoreInput,
  type TrendVerdict
} from "./trendScoring";

export {
  parseGitHubRepo,
  parseHackerNewsStory,
  parseXPost,
  type NormalizedSourceEvent
} from "./sourceNormalizers";
