import type { DataRole, Region, SourceName } from "./domain";

export interface SourceMetadata {
  label: string;
  shortLabel: string;
  description: string;
  /** Where the publisher is based. Mixed stations (lab announcements, platforms) are "global"; their items carry their own publisher region. */
  region: Region;
  dataRole: DataRole;
  sourceType: "first_party" | "community" | "media" | "platform";
  signalRole: "origin" | "early_discussion" | "validation" | "adoption";
  tier: 1 | 2 | 3;
  homepageUrl: string;
  feedUrl?: string;
}

export const sourceMetadata: Record<SourceName, SourceMetadata> = {
  official_blog: {
    label: "AI 實驗室公告",
    shortLabel: "實驗室",
    description: "OpenAI、Anthropic、Google、Mistral、Qwen 與 Hugging Face 的官方公告。",
    region: "global",
    dataRole: "official",
    sourceType: "first_party",
    signalRole: "origin",
    tier: 1,
    homepageUrl: "https://openai.com/news/"
  },
  arxiv: {
    label: "arXiv",
    shortLabel: "arXiv",
    description: "AI、機器學習、NLP 與電腦視覺類別的研究預印本。",
    region: "global",
    dataRole: "research",
    sourceType: "first_party",
    signalRole: "origin",
    tier: 1,
    homepageUrl: "https://arxiv.org/"
  },
  github_releases: {
    label: "GitHub Releases",
    shortLabel: "Releases",
    description: "主要 AI SDK 與框架專案自行發布的版本說明。",
    region: "global",
    dataRole: "official",
    sourceType: "first_party",
    signalRole: "origin",
    tier: 1,
    homepageUrl: "https://github.com/"
  },
  nstc_tw: {
    label: "國科會新聞稿",
    shortLabel: "國科會",
    description: "國家科學及技術委員會新聞稿；只列 AI 相關。",
    region: "taiwan",
    dataRole: "official",
    sourceType: "first_party",
    signalRole: "origin",
    tier: 1,
    homepageUrl: "https://www.nstc.gov.tw/",
    feedUrl: "https://www.nstc.gov.tw/nstc/rss/newsdata"
  },
  eu_digital: {
    label: "歐盟數位策略",
    shortLabel: "歐盟",
    description: "歐盟執委會數位策略與 AI 政策公告；只列 AI 相關。",
    region: "europe",
    dataRole: "official",
    sourceType: "first_party",
    signalRole: "origin",
    tier: 1,
    homepageUrl: "https://digital-strategy.ec.europa.eu/en",
    feedUrl: "https://digital-strategy.ec.europa.eu/en/rss.xml"
  },
  hn: {
    label: "Hacker News",
    shortLabel: "HN",
    description: "官方 Firebase API 的熱門、最新與最佳文章。",
    region: "global",
    dataRole: "community",
    sourceType: "community",
    signalRole: "early_discussion",
    tier: 2,
    homepageUrl: "https://news.ycombinator.com/"
  },
  github: {
    label: "GitHub",
    shortLabel: "GitHub",
    description: "以 GitHub Search API 搜尋 AI 與開發工具專案。",
    region: "global",
    dataRole: "platform",
    sourceType: "platform",
    signalRole: "adoption",
    tier: 2,
    homepageUrl: "https://github.com/"
  },
  hugging_face: {
    label: "Hugging Face",
    shortLabel: "HF",
    description: "Hugging Face 上的熱門模型。",
    region: "global",
    dataRole: "platform",
    sourceType: "platform",
    signalRole: "adoption",
    tier: 2,
    homepageUrl: "https://huggingface.co/"
  },
  npm: {
    label: "npm",
    shortLabel: "npm",
    description: "AI SDK 與工具的 JavaScript 套件發布與週下載量。",
    region: "global",
    dataRole: "platform",
    sourceType: "platform",
    signalRole: "adoption",
    tier: 2,
    homepageUrl: "https://www.npmjs.com/"
  },
  pypi: {
    label: "PyPI",
    shortLabel: "PyPI",
    description: "Agent、推論、評測與向量工具的 Python 套件發布與週下載量。",
    region: "global",
    dataRole: "platform",
    sourceType: "platform",
    signalRole: "adoption",
    tier: 2,
    homepageUrl: "https://pypi.org/"
  },
  the_verge: {
    label: "The Verge",
    shortLabel: "Verge",
    description: "美國科技媒體，AI 與產品報導快速。",
    region: "us",
    dataRole: "media",
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
    region: "us",
    dataRole: "media",
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
    region: "us",
    dataRole: "media",
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
    region: "china",
    dataRole: "media",
    sourceType: "media",
    signalRole: "validation",
    tier: 3,
    homepageUrl: "https://36kr.com/",
    feedUrl: "https://www.36kr.com/feed"
  },
  qbitai: {
    label: "量子位",
    shortLabel: "量子位",
    description: "中國 AI 專門媒體，模型、研究與產業動態。",
    region: "china",
    dataRole: "media",
    sourceType: "media",
    signalRole: "validation",
    tier: 3,
    homepageUrl: "https://www.qbitai.com/",
    feedUrl: "https://www.qbitai.com/feed"
  },
  ithome_tw: {
    label: "iThome",
    shortLabel: "iThome",
    description: "台灣企業 IT、資安與開發者報導。",
    region: "taiwan",
    dataRole: "media",
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
    region: "taiwan",
    dataRole: "media",
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
    region: "europe",
    dataRole: "media",
    sourceType: "media",
    signalRole: "validation",
    tier: 3,
    homepageUrl: "https://thenextweb.com/",
    feedUrl: "https://thenextweb.com/feed"
  },
  the_decoder: {
    label: "The Decoder",
    shortLabel: "Decoder",
    description: "德國 AI 專門媒體（英文版），模型、研究與政策。",
    region: "europe",
    dataRole: "media",
    sourceType: "media",
    signalRole: "validation",
    tier: 3,
    homepageUrl: "https://the-decoder.com/",
    feedUrl: "https://the-decoder.com/feed/"
  },
  itmedia_ai: {
    label: "ITmedia AI+",
    shortLabel: "ITmedia",
    description: "日本 ITmedia 的 AI 專門頻道。",
    region: "japan",
    dataRole: "media",
    sourceType: "media",
    signalRole: "validation",
    tier: 3,
    homepageUrl: "https://www.itmedia.co.jp/aiplus/",
    feedUrl: "https://rss.itmedia.co.jp/rss/2.0/aiplus.xml"
  },
  aitimes_kr: {
    label: "AI Times",
    shortLabel: "AI Times",
    description: "韓國 AI 專門媒體（에이아이타임스）。",
    region: "korea",
    dataRole: "media",
    sourceType: "media",
    signalRole: "validation",
    tier: 3,
    homepageUrl: "https://www.aitimes.com/",
    feedUrl: "https://www.aitimes.com/rss/allArticle.xml"
  }
};

export const activeSourceOrder: SourceName[] = [
  "official_blog",
  "arxiv",
  "github_releases",
  "nstc_tw",
  "eu_digital",
  "hn",
  "github",
  "hugging_face",
  "npm",
  "pypi",
  "the_verge",
  "techcrunch",
  "mit_tech_review",
  "thirtysixkr",
  "qbitai",
  "ithome_tw",
  "technews_tw",
  "tnw",
  "the_decoder",
  "itmedia_ai",
  "aitimes_kr"
];

/** Sources collected by the generic RSS collector (everything with a feed URL). */
export const rssSourceOrder = activeSourceOrder.filter((source) => Boolean(sourceMetadata[source].feedUrl));

export const regionLabel: Record<Region, string> = {
  us: "美國",
  china: "中國",
  taiwan: "台灣",
  europe: "歐洲",
  japan: "日本",
  korea: "韓國",
  global: "全球／平台"
};

export const dataRoleLabel: Record<DataRole, string> = {
  official: "官方",
  research: "研究",
  media: "獨立媒體",
  community: "社群",
  platform: "平台"
};
