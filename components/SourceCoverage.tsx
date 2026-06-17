import { CircleOff } from "lucide-react";

import type { SourceName, SourceStatus, TrendEntity } from "@/src/domain";
import { sourceMetadata } from "@/src/sources";

interface SourceCoverageListProps {
  sourceStatuses: SourceStatus[];
  sourceTopTrends: Partial<Record<SourceName, TrendEntity[]>>;
  sources: SourceName[];
}

export function SourceCoverageList({ sourceStatuses, sourceTopTrends, sources }: SourceCoverageListProps) {
  const statusesBySource = new Map(sourceStatuses.map((status) => [status.source, status]));

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Source coverage</h2>
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {sources.map((source) => {
          const metadata = sourceMetadata[source];
          const status = statusesBySource.get(source);
          const rankedCount = sourceTopTrends[source]?.length ?? 0;
          return (
            <article key={source} className="rounded-md border border-border bg-card p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold">{metadata.label}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Tier {metadata.tier} - {metadata.signalRole.replace("_", " ")}
                  </p>
                </div>
                <span className="shrink-0 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                  {rankedCount > 0 ? `${rankedCount} ranked` : status?.status ?? "planned"}
                </span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{metadata.description}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function EmptySourceState({ source }: { source: SourceName }) {
  const metadata = sourceMetadata[source];
  return (
    <div className="flex items-center gap-3 rounded-md border border-dashed border-border bg-card p-4 text-sm text-muted-foreground">
      <CircleOff className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
      <div>
        <p className="font-medium text-foreground">{metadata.label} has no ranked observations in the current snapshot.</p>
        <p className="mt-1 text-xs">Tier {metadata.tier} - {metadata.sourceType.replace("_", " ")} - {metadata.signalRole.replace("_", " ")}</p>
      </div>
    </div>
  );
}
