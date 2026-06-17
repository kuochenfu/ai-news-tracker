import { BookOpen, Database, Github, MessageSquare, Newspaper, Package } from "lucide-react";
import type { ComponentType } from "react";

import type { SourceName } from "@/src/domain";
import { sourceMetadata } from "@/src/sources";

const sourceMeta: Record<SourceName, { label: string; icon: ComponentType<{ className?: string }> }> = {
  hn: { label: "HN", icon: MessageSquare },
  github: { label: "GitHub", icon: Github },
  official_blog: { label: sourceMetadata.official_blog.shortLabel, icon: BookOpen },
  arxiv: { label: sourceMetadata.arxiv.shortLabel, icon: BookOpen },
  github_releases: { label: sourceMetadata.github_releases.shortLabel, icon: Github },
  hugging_face: { label: sourceMetadata.hugging_face.shortLabel, icon: Database },
  npm: { label: sourceMetadata.npm.shortLabel, icon: Package },
  pypi: { label: sourceMetadata.pypi.shortLabel, icon: Package },
  the_verge: { label: sourceMetadata.the_verge.shortLabel, icon: Newspaper },
  techcrunch: { label: sourceMetadata.techcrunch.shortLabel, icon: Newspaper },
  mit_tech_review: { label: sourceMetadata.mit_tech_review.shortLabel, icon: Newspaper },
  thirtysixkr: { label: sourceMetadata.thirtysixkr.shortLabel, icon: Newspaper },
  ithome_tw: { label: sourceMetadata.ithome_tw.shortLabel, icon: Newspaper },
  technews_tw: { label: sourceMetadata.technews_tw.shortLabel, icon: Newspaper },
  tnw: { label: sourceMetadata.tnw.shortLabel, icon: Newspaper }
};

export function SourcePill({ source }: { source: SourceName }) {
  const Icon = sourceMeta[source].icon;
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground">
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {sourceMeta[source].label}
    </span>
  );
}
