import type { SourceName } from "./domain";

export interface SourceMetadata {
  label: string;
  shortLabel: string;
  description: string;
  region: "USA" | "China" | "Taiwan" | "Europe" | "Global" | "Platform";
  sourceType: "first_party" | "community" | "media" | "platform";
  signalRole: "origin" | "early_discussion" | "validation" | "adoption";
  tier: 1 | 2 | 3;
  homepageUrl: string;
  feedUrl?: string;
}

export const sourceMetadata: Record<SourceName, SourceMetadata> = {
  hn: {
    label: "Hacker News",
    shortLabel: "HN",
    description: "官方 Firebase API 的熱門、最新與最佳文章。",
    region: "Platform",
    sourceType: "community",
    signalRole: "early_discussion",
    tier: 2,
    homepageUrl: "https://news.ycombinator.com/"
  },
  github: {
    label: "GitHub",
    shortLabel: "GitHub",
    description: "以 GitHub Search API 搜尋 AI 與開發工具專案。",
    region: "Platform",
    sourceType: "platform",
    signalRole: "adoption",
    tier: 2,
    homepageUrl: "https://github.com/"
  },
  official_blog: {
    label: "AI 官方部落格",
    shortLabel: "官方",
    description: "AI 實驗室與開發工具廠商的一手產品公告。",
    region: "Global",
    sourceType: "first_party",
    signalRole: "origin",
    tier: 1,
    homepageUrl: "https://openai.com/news/"
  },
  arxiv: {
    label: "arXiv",
    shortLabel: "arXiv",
    description: "AI、機器學習、NLP 與電腦視覺類別的研究預印本。",
    region: "Global",
    sourceType: "first_party",
    signalRole: "origin",
    tier: 1,
    homepageUrl: "https://arxiv.org/"
  },
  github_releases: {
    label: "GitHub Releases",
    shortLabel: "Releases",
    description: "開發工具專案自行發布的版本說明。",
    region: "Platform",
    sourceType: "first_party",
    signalRole: "origin",
    tier: 1,
    homepageUrl: "https://github.com/"
  },
  hugging_face: {
    label: "Hugging Face",
    shortLabel: "HF",
    description: "Hugging Face 上模型、資料集與 Space 的採用訊號。",
    region: "Platform",
    sourceType: "platform",
    signalRole: "adoption",
    tier: 2,
    homepageUrl: "https://huggingface.co/"
  },
  npm: {
    label: "npm",
    shortLabel: "npm",
    description: "AI SDK 與工具的 JavaScript 套件發布與採用訊號。",
    region: "Platform",
    sourceType: "platform",
    signalRole: "adoption",
    tier: 2,
    homepageUrl: "https://www.npmjs.com/"
  },
  pypi: {
    label: "PyPI",
    shortLabel: "PyPI",
    description: "Agent、推論、評測與向量工具的 Python 套件發布與採用訊號。",
    region: "Platform",
    sourceType: "platform",
    signalRole: "adoption",
    tier: 2,
    homepageUrl: "https://pypi.org/"
  },
  the_verge: {
    label: "The Verge",
    shortLabel: "Verge",
    description: "美國科技媒體，AI 與產品報導快速。",
    region: "USA",
    sourceType: "media",
    signalRole: "validation",
    tier: 3,
    homepageUrl: "https://www.theverge.com/",
    feedUrl: "https://www.theverge.com/rss/index.xml"
  },
  techcrunch: {
    label: "TechCrunch",
    shortLabel: "TC",
    description: "新創、募資與 AI 公司報導。",
    region: "USA",
    sourceType: "media",
    signalRole: "validation",
    tier: 3,
    homepageUrl: "https://techcrunch.com/",
    feedUrl: "https://techcrunch.com/feed/"
  },
  mit_tech_review: {
    label: "MIT Technology Review",
    shortLabel: "MIT TR",
    description: "偏研究取向的科技分析與長期 AI 觀察。",
    region: "USA",
    sourceType: "media",
    signalRole: "validation",
    tier: 3,
    homepageUrl: "https://www.technologyreview.com/",
    feedUrl: "https://www.technologyreview.com/feed/"
  },
  thirtysixkr: {
    label: "36Kr",
    shortLabel: "36Kr",
    description: "中國科技、新創與商業化報導。",
    region: "China",
    sourceType: "media",
    signalRole: "validation",
    tier: 3,
    homepageUrl: "https://36kr.com/",
    feedUrl: "https://www.36kr.com/feed"
  },
  ithome_tw: {
    label: "iThome",
    shortLabel: "iThome",
    description: "台灣企業 IT、資安與開發者報導。",
    region: "Taiwan",
    sourceType: "media",
    signalRole: "validation",
    tier: 3,
    homepageUrl: "https://www.ithome.com.tw/",
    feedUrl: "https://www.ithome.com.tw/rss"
  },
  technews_tw: {
    label: "TechNews",
    shortLabel: "TechNews",
    description: "台灣半導體、硬體供應鏈與科技新聞。",
    region: "Taiwan",
    sourceType: "media",
    signalRole: "validation",
    tier: 3,
    homepageUrl: "https://technews.tw/",
    feedUrl: "https://technews.tw/feed/"
  },
  tnw: {
    label: "The Next Web",
    shortLabel: "TNW",
    description: "歐洲科技與新創報導。",
    region: "Europe",
    sourceType: "media",
    signalRole: "validation",
    tier: 3,
    homepageUrl: "https://thenextweb.com/",
    feedUrl: "https://thenextweb.com/feed"
  }
};

export const activeSourceOrder: SourceName[] = [
  "official_blog",
  "arxiv",
  "github_releases",
  "hn",
  "github",
  "hugging_face",
  "npm",
  "pypi",
  "the_verge",
  "techcrunch",
  "mit_tech_review",
  "thirtysixkr",
  "ithome_tw",
  "technews_tw",
  "tnw"
];

export const rssSourceOrder = activeSourceOrder.filter((source) => Boolean(sourceMetadata[source].feedUrl));
