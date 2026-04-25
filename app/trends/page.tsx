import { ScoreBadge } from "@/components/ScoreBadge";
import { SourceSidebar } from "@/components/SourceSidebar";
import { SourcePill } from "@/components/SourcePill";
import { TrendHistory } from "@/components/TrendHistory";
import { sourceTopTrends } from "@/src/mockData";
import { activeSourceOrder, sourceMetadata } from "@/src/sources";

export default function TrendsPage() {
  const sources = activeSourceOrder.filter((source) => (sourceTopTrends[source]?.length ?? 0) > 0);

  return (
    <div className="space-y-6">
      <section className="border-b border-border pb-5">
        <h1 className="text-3xl font-semibold tracking-normal">Trend details</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Switch sources from the left. Each source shows its own Top 20 list.
        </p>
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

              <div className="space-y-6">
                {(sourceTopTrends[source] ?? []).slice(0, 20).map((trend, index) => {
                  const components = trend.sources.map((sourceItem) => [
                    sourceMetadata[sourceItem.source].shortLabel,
                    sourceItem.score
                  ] as const);

                  return (
                    <article key={trend.id} id={trend.id} className="scroll-mt-6 space-y-4 rounded-md border border-border bg-card p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-muted-foreground">#{index + 1}</span>
                        <h3 className="text-2xl font-semibold">{trend.canonicalName}</h3>
                        <ScoreBadge score={trend.score.finalScore} verdict={trend.score.verdict} />
                      </div>
                      <p className="max-w-3xl text-sm text-muted-foreground">{trend.summary}</p>

                      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
                        <div className="rounded-md border border-border p-4">
                          <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Source Breakdown</h4>
                          <div className="mt-4 divide-y divide-border">
                            {trend.sources.map((sourceItem) => (
                              <div key={sourceItem.source} className="grid gap-3 py-4 md:grid-cols-[120px_1fr_80px] md:items-center">
                                <SourcePill source={sourceItem.source} />
                                <div>
                                  <p className="text-sm font-medium">{sourceItem.signal}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {sourceItem.mentions} mentions · last seen {sourceItem.lastSeen}
                                  </p>
                                </div>
                                <div className="text-right text-sm font-semibold">{(sourceItem.score * 100).toFixed(0)}</div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="rounded-md border border-border p-4">
                          <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Score Components</h4>
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
                        <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Mentions</h4>
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
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
