import { SourceSidebar } from "@/components/SourceSidebar";
import { previewText, trendUrl } from "@/src/display";
import { sourceTopTrends } from "@/src/mockData";
import { activeSourceOrder, sourceMetadata } from "@/src/sources";

export default function TrendsPage() {
  const sources = activeSourceOrder.filter((source) => (sourceTopTrends[source]?.length ?? 0) > 0);

  return (
    <div className="space-y-6">
      <section className="border-b border-border pb-5">
        <h1 className="text-3xl font-semibold tracking-normal">Trend details</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Switch sources from the left. Each source shows its own Top 10 list.
        </p>
      </section>

      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <SourceSidebar sources={sources} />
        <section className="space-y-8">
          {sources.map((source) => (
            <div key={source} id={source} className="scroll-mt-6 space-y-4">
              <div>
                <h2 className="text-2xl font-semibold">{sourceMetadata[source].label} Top 10</h2>
                <p className="mt-1 text-sm text-muted-foreground">{sourceMetadata[source].description}</p>
              </div>

              <ol className="divide-y divide-border rounded-md border border-border bg-card">
                {(sourceTopTrends[source] ?? []).map((trend, index) => (
                  <li key={trend.id} id={trend.id} className="scroll-mt-6 grid gap-1 p-4 sm:grid-cols-[3rem_1fr]">
                    <span className="text-sm font-semibold text-muted-foreground">#{index + 1}</span>
                    <div className="min-w-0">
                      <a href={trendUrl(trend)} className="text-base font-semibold text-primary hover:underline">
                        {trend.canonicalName}
                      </a>
                      <p className="mt-1 text-sm text-muted-foreground">{previewText(trend.summary)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
