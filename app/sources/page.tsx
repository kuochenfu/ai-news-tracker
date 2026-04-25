import { AlertTriangle, CheckCircle2, CircleOff } from "lucide-react";

import { sourceStatuses } from "@/src/mockData";

const statusIcon = {
  healthy: CheckCircle2,
  degraded: AlertTriangle,
  disabled: CircleOff
};

export default function SourcesPage() {
  return (
    <div className="space-y-6">
      <section className="border-b border-border pb-5">
        <h1 className="text-3xl font-semibold tracking-normal">Ingestion sources</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Operational status for Hacker News and GitHub ingestion jobs.
        </p>
      </section>

      <section className="grid gap-4">
        {sourceStatuses.map((source) => {
          const Icon = statusIcon[source.status];
          return (
            <article key={source.source} className="rounded-md border border-border bg-card p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                    <h2 className="text-lg font-semibold">{source.label}</h2>
                    <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                      {source.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{source.notes}</p>
                  {source.errors.length > 0 ? (
                    <ul className="mt-3 space-y-1 text-sm text-rose-700">
                      {source.errors.map((error) => (
                        <li key={error}>{error}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
                <dl className="grid gap-2 text-sm md:min-w-64">
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Last sync</dt>
                    <dd>{source.lastSync ?? "Not configured"}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Next sync</dt>
                    <dd>{source.nextSync ?? "Paused"}</dd>
                  </div>
                </dl>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
