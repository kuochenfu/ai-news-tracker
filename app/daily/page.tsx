import { ScoreBadge } from "@/components/ScoreBadge";
import { dailyReport, getTrendById } from "@/src/mockData";
import { sitePath } from "@/src/paths";

export default function DailyPage() {
  const topTrends = dailyReport.topTrendIds.map((id) => getTrendById(id)).filter(Boolean);

  return (
    <div className="space-y-6">
      <section className="border-b border-border pb-5">
        <p className="text-sm font-medium text-primary">{dailyReport.date}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-normal">Daily check-in report</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{dailyReport.summary}</p>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="rounded-md border border-border bg-card p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Top 20 Trends</h2>
          <div className="mt-4 divide-y divide-border">
            {topTrends.map((trend, index) =>
              trend ? (
                <a
                  key={trend.id}
                  href={sitePath(`/trends/#${trend.id}`)}
                  className="flex items-center justify-between gap-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium">
                      #{index + 1} {trend.canonicalName}
                    </p>
                    <p className="text-xs text-muted-foreground">{trend.reason}</p>
                  </div>
                  <ScoreBadge score={trend.score.finalScore} verdict={trend.score.verdict} />
                </a>
              ) : null
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-md border border-border bg-card p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">New Entities</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {dailyReport.newEntities.map((entity) => (
                <li key={entity}>{entity}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-md border border-border bg-card p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Likely Hype</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {dailyReport.likelyHype.map((entity) => (
                <li key={entity}>{entity}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
