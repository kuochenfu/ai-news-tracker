import type { SourceName } from "./domain";

export interface SourceMetadata {
  label: string;
  shortLabel: string;
  description: string;
  region: "USA" | "China" | "Taiwan" | "Europe" | "Platform";
  homepageUrl: string;
  feedUrl?: string;
}

export const sourceMetadata: Record<SourceName, SourceMetadata> = {
  hn: {
    label: "Hacker News",
    shortLabel: "HN",
    description: "Official Firebase API for top, new, and best stories.",
    region: "Platform",
    homepageUrl: "https://news.ycombinator.com/"
  },
  github: {
    label: "GitHub",
    shortLabel: "GitHub",
    description: "GitHub Search API for AI and developer tooling repositories.",
    region: "Platform",
    homepageUrl: "https://github.com/"
  },
  the_verge: {
    label: "The Verge",
    shortLabel: "Verge",
    description: "US technology coverage with fast AI and product reporting.",
    region: "USA",
    homepageUrl: "https://www.theverge.com/",
    feedUrl: "https://www.theverge.com/rss/index.xml"
  },
  techcrunch: {
    label: "TechCrunch",
    shortLabel: "TC",
    description: "Startup, funding, and AI company coverage.",
    region: "USA",
    homepageUrl: "https://techcrunch.com/",
    feedUrl: "https://techcrunch.com/feed/"
  },
  mit_tech_review: {
    label: "MIT Technology Review",
    shortLabel: "MIT TR",
    description: "Research-oriented technology analysis and long-horizon AI coverage.",
    region: "USA",
    homepageUrl: "https://www.technologyreview.com/",
    feedUrl: "https://www.technologyreview.com/feed/"
  },
  thirtysixkr: {
    label: "36Kr",
    shortLabel: "36Kr",
    description: "China technology, startup, and commercialization coverage.",
    region: "China",
    homepageUrl: "https://36kr.com/",
    feedUrl: "https://36kr.com/feed"
  },
  ithome_tw: {
    label: "iThome",
    shortLabel: "iThome",
    description: "Taiwan enterprise IT, security, and developer coverage.",
    region: "Taiwan",
    homepageUrl: "https://www.ithome.com.tw/",
    feedUrl: "https://www.ithome.com.tw/rss"
  },
  technews_tw: {
    label: "TechNews",
    shortLabel: "TechNews",
    description: "Taiwan semiconductor, hardware supply chain, and technology news.",
    region: "Taiwan",
    homepageUrl: "https://technews.tw/",
    feedUrl: "https://technews.tw/feed/"
  },
  tnw: {
    label: "The Next Web",
    shortLabel: "TNW",
    description: "European technology and startup coverage.",
    region: "Europe",
    homepageUrl: "https://thenextweb.com/",
    feedUrl: "https://thenextweb.com/feed"
  }
};

export const activeSourceOrder: SourceName[] = [
  "hn",
  "github",
  "the_verge",
  "techcrunch",
  "mit_tech_review",
  "thirtysixkr",
  "ithome_tw",
  "technews_tw",
  "tnw"
];

export const rssSourceOrder = activeSourceOrder.filter((source) => Boolean(sourceMetadata[source].feedUrl));
