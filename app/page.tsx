import { ArrowUpRight, Gauge } from "lucide-react";

import { ScoreBadge } from "@/components/ScoreBadge";
import { SourcePill } from "@/components/SourcePill";
import { TrendHistory } from "@/components/TrendHistory";
import { trends } from "@/src/mockData";
import { sitePath } from "@/src/paths";

export default function DashboardPage() {
  const ranked = [...trends].sort((a, b) => b.score.finalScore - a.score.finalScore);

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 border-b border-border pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Today</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal">Top AI trend signals</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Cross-source ranking for AI tools, repos, papers, models, and startups.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm">
          <Gauge className="h-4 w-4 text-primary" aria-hidden="true" />
          {ranked.length} tracked entities
        </div>
      </section>

      <section className="grid gap-4">
        {ranked.map((trend, index) => (
          <article key={trend.id} className="rounded-md border border-border bg-card p-4">
            <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-muted-foreground">#{index + 1}</span>
                  <h2 className="text-xl font-semibold">{trend.canonicalName}</h2>
                  <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                    {trend.entityType}
                  </span>
                  <ScoreBadge score={trend.score.finalScore} verdict={trend.score.verdict} />
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{trend.summary}</p>
                <p className="mt-3 text-sm">{trend.reason}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {trend.sources.map((source) => (
                    <SourcePill key={source.source} source={source.source} />
                  ))}
                </div>
              </div>
              <div className="rounded-md bg-muted p-3">
                <TrendHistory points={trend.history} />
                <a
                  href={sitePath(`/trends/${trend.id}/`)}
                  className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary"
                >
                  Inspect entity
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </a>
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
