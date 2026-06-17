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
    description: "Official Firebase API for top, new, and best stories.",
    region: "Platform",
    sourceType: "community",
    signalRole: "early_discussion",
    tier: 2,
    homepageUrl: "https://news.ycombinator.com/"
  },
  github: {
    label: "GitHub",
    shortLabel: "GitHub",
    description: "GitHub Search API for AI and developer tooling repositories.",
    region: "Platform",
    sourceType: "platform",
    signalRole: "adoption",
    tier: 2,
    homepageUrl: "https://github.com/"
  },
  official_blog: {
    label: "Official AI Blogs",
    shortLabel: "Official",
    description: "First-party company and product announcements from AI labs and developer tooling vendors.",
    region: "Global",
    sourceType: "first_party",
    signalRole: "origin",
    tier: 1,
    homepageUrl: "https://openai.com/news/"
  },
  arxiv: {
    label: "arXiv",
    shortLabel: "arXiv",
    description: "Research preprints from AI, machine learning, NLP, and computer vision categories.",
    region: "Global",
    sourceType: "first_party",
    signalRole: "origin",
    tier: 1,
    homepageUrl: "https://arxiv.org/"
  },
  github_releases: {
    label: "GitHub Releases",
    shortLabel: "Releases",
    description: "Project-owned release notes and version announcements for developer tooling.",
    region: "Platform",
    sourceType: "first_party",
    signalRole: "origin",
    tier: 1,
    homepageUrl: "https://github.com/"
  },
  hugging_face: {
    label: "Hugging Face",
    shortLabel: "HF",
    description: "Model, dataset, and space adoption signals from the Hugging Face hub.",
    region: "Platform",
    sourceType: "platform",
    signalRole: "adoption",
    tier: 2,
    homepageUrl: "https://huggingface.co/"
  },
  npm: {
    label: "npm",
    shortLabel: "npm",
    description: "JavaScript package release and adoption signals for AI SDKs and tooling.",
    region: "Platform",
    sourceType: "platform",
    signalRole: "adoption",
    tier: 2,
    homepageUrl: "https://www.npmjs.com/"
  },
  pypi: {
    label: "PyPI",
    shortLabel: "PyPI",
    description: "Python package release and adoption signals for agents, inference, evals, and vector tooling.",
    region: "Platform",
    sourceType: "platform",
    signalRole: "adoption",
    tier: 2,
    homepageUrl: "https://pypi.org/"
  },
  the_verge: {
    label: "The Verge",
    shortLabel: "Verge",
    description: "US technology coverage with fast AI and product reporting.",
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
    description: "Startup, funding, and AI company coverage.",
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
    description: "Research-oriented technology analysis and long-horizon AI coverage.",
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
    description: "China technology, startup, and commercialization coverage.",
    region: "China",
    sourceType: "media",
    signalRole: "validation",
    tier: 3,
    homepageUrl: "https://36kr.com/",
    feedUrl: "https://36kr.com/feed"
  },
  ithome_tw: {
    label: "iThome",
    shortLabel: "iThome",
    description: "Taiwan enterprise IT, security, and developer coverage.",
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
    description: "Taiwan semiconductor, hardware supply chain, and technology news.",
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
    description: "European technology and startup coverage.",
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
