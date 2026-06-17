import { SourceCoverageList } from "@/components/SourceCoverage";
import { previewText, trendUrl } from "@/src/display";
import { dailyReport, getTrendById, sourceStatuses, sourceTopTrends } from "@/src/mockData";
import { activeSourceOrder } from "@/src/sources";

const DAILY_TREND_LIMIT = 15;

export default function DailyPage() {
  const topTrends = dailyReport.topTrendIds.map((id) => getTrendById(id)).filter(Boolean).slice(0, DAILY_TREND_LIMIT);

  return (
    <div className="space-y-6">
      <section className="border-b border-border pb-5">
        <p className="text-sm font-medium text-primary">{dailyReport.date}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-normal">Daily check-in report</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{dailyReport.summary}</p>
      </section>

      <section className="rounded-md border border-border bg-card p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Top 15 Trends</h2>
        <ol className="mt-4 divide-y divide-border">
          {topTrends.map((trend, index) =>
            trend ? (
              <li
                key={trend.id}
                className="grid gap-1 py-3 sm:grid-cols-[3rem_1fr]"
              >
                <span className="text-sm font-semibold text-muted-foreground">#{index + 1}</span>
                <div className="min-w-0">
                  <a href={trendUrl(trend)} className="text-sm font-semibold text-primary hover:underline">
                    {trend.canonicalName}
                  </a>
                  <p className="mt-1 text-xs text-muted-foreground">{previewText(trend.summary)}</p>
                </div>
              </li>
            ) : null
          )}
        </ol>
      </section>

      <SourceCoverageList
        sourceStatuses={sourceStatuses}
        sourceTopTrends={sourceTopTrends}
        sources={activeSourceOrder}
      />
    </div>
  );
}
