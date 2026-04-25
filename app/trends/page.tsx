import { ScoreBadge } from "@/components/ScoreBadge";
import { SourcePill } from "@/components/SourcePill";
import { TrendHistory } from "@/components/TrendHistory";
import { trends } from "@/src/mockData";

export default function TrendsPage() {
  const ranked = [...trends].sort((a, b) => b.score.finalScore - a.score.finalScore);

  return (
    <div className="space-y-6">
      <section className="border-b border-border pb-5">
        <h1 className="text-3xl font-semibold tracking-normal">Trend details</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Static detail sections for the current scheduled snapshot.
        </p>
      </section>

      <section className="space-y-6">
        {ranked.map((trend) => {
          const components = [
            ["HN", trend.score.hnComponent],
            ["X", trend.score.xComponent],
            ["GitHub", trend.score.githubComponent],
            ["Novelty", trend.score.noveltyComponent],
            ["Credibility", trend.score.credibilityComponent]
          ] as const;

          return (
            <article key={trend.id} id={trend.id} className="scroll-mt-6 space-y-4 rounded-md border border-border bg-card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-semibold">{trend.canonicalName}</h2>
                <ScoreBadge score={trend.score.finalScore} verdict={trend.score.verdict} />
              </div>
              <p className="max-w-3xl text-sm text-muted-foreground">{trend.summary}</p>

              <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
                <div className="rounded-md border border-border p-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Source Breakdown</h3>
                  <div className="mt-4 divide-y divide-border">
                    {trend.sources.map((source) => (
                      <div key={source.source} className="grid gap-3 py-4 md:grid-cols-[120px_1fr_80px] md:items-center">
                        <SourcePill source={source.source} />
                        <div>
                          <p className="text-sm font-medium">{source.signal}</p>
                          <p className="text-xs text-muted-foreground">
                            {source.mentions} mentions · last seen {source.lastSeen}
                          </p>
                        </div>
                        <div className="text-right text-sm font-semibold">{(source.score * 100).toFixed(0)}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-md border border-border p-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Score Components</h3>
                  <div className="mt-4 space-y-3">
                    {components.map(([label, value]) => (
                      <div key={label}>
                        <div className="mb-1 flex items-center justify-between text-sm">
                          <span>{label}</span>
                          <span>{(value * 100).toFixed(1)}</span>
                        </div>
                        <div className="h-2 rounded bg-muted">
                          <div className="h-2 rounded bg-primary" style={{ width: `${Math.min(value * 100, 100)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-5">
                    <TrendHistory points={trend.history} />
                  </div>
                </div>
              </div>

              <div className="rounded-md border border-border p-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Mentions</h3>
                <div className="mt-4 divide-y divide-border">
                  {trend.mentions.length === 0 ? (
                    <p className="py-4 text-sm text-muted-foreground">No saved raw mentions yet.</p>
                  ) : (
                    trend.mentions.map((mention) => (
                      <div key={mention.id} className="py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <SourcePill source={mention.source} />
                          <p className="text-sm font-medium">{mention.title}</p>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {mention.author ? `${mention.author} · ` : ""}
                          {mention.publishedAt}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}

