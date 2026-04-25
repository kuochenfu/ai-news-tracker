import { ArrowUpRight, Gauge } from "lucide-react";

import { ScoreBadge } from "@/components/ScoreBadge";
import { SourceSidebar } from "@/components/SourceSidebar";
import { SourcePill } from "@/components/SourcePill";
import { TrendHistory } from "@/components/TrendHistory";
import type { SourceName } from "@/src/domain";
import { sourceTopTrends, trends } from "@/src/mockData";
import { sitePath } from "@/src/paths";
import { activeSourceOrder, sourceMetadata } from "@/src/sources";

export default function DashboardPage() {
  const ranked = [...trends].sort((a, b) => b.score.finalScore - a.score.finalScore);
  const sources = activeSourceOrder.filter((source) => (sourceTopTrends[source]?.length ?? 0) > 0);

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 border-b border-border pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Today</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal">AI trend signals by source</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Each source has its own Top 20 list. Sources are included only when their public API or RSS feed is reachable.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm">
          <Gauge className="h-4 w-4 text-primary" aria-hidden="true" />
          {ranked.length} tracked entities
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <SourceSidebar sources={sources} />
        <section className="space-y-8">
          {sources.map((source) => (
            <div key={source} id={source} className="scroll-mt-6 space-y-4">
              <div>
                <h2 className="text-2xl font-semibold">{sourceMetadata[source].label} Top 20</h2>
                <p className="mt-1 text-sm text-muted-foreground">{sourceMetadata[source].description}</p>
              </div>
              <div className="grid gap-4">
                {(sourceTopTrends[source] ?? []).slice(0, 20).map((trend, index) => (
                  <article key={trend.id} className="rounded-md border border-border bg-card p-4">
                    <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-muted-foreground">#{index + 1}</span>
                          <h3 className="text-xl font-semibold">{trend.canonicalName}</h3>
                          <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                            {trend.entityType}
                          </span>
                          <ScoreBadge score={trend.score.finalScore} verdict={trend.score.verdict} />
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">{trend.summary}</p>
                        <p className="mt-3 text-sm">{trend.reason}</p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {trend.sources.map((sourceItem) => (
                            <SourcePill key={sourceItem.source} source={sourceItem.source} />
                          ))}
                        </div>
                      </div>
                      <div className="rounded-md bg-muted p-3">
                        <TrendHistory points={trend.history} />
                        <a
                          href={sitePath(`/trends/#${trend.id}`)}
                          className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary"
                        >
                          Inspect entity
                          <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                        </a>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
