import { Github, MessageSquare } from "lucide-react";
import type { ComponentType } from "react";

import type { SourceName } from "@/src/domain";

const sourceMeta: Record<SourceName, { label: string; icon: ComponentType<{ className?: string }> }> = {
  hn: { label: "HN", icon: MessageSquare },
  github: { label: "GitHub", icon: Github }
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
