import { AlertTriangle, CheckCircle2, CircleOff } from "lucide-react";

import { sourceStatuses } from "@/src/mockData";
import { activeSourceOrder, sourceMetadata } from "@/src/sources";
import type { SourceStatus } from "@/src/domain";

const statusIcon = {
  healthy: CheckCircle2,
  degraded: AlertTriangle,
  disabled: CircleOff
};

export default function SourcesPage() {
  const statusesBySource = new Map(sourceStatuses.map((source) => [source.source, source]));
  const completeSourceStatuses: SourceStatus[] = activeSourceOrder.map((source) => {
    const metadata = sourceMetadata[source];
    return (
      statusesBySource.get(source) ?? {
        source,
        label: metadata.label,
        status: "disabled",
        lastSync: null,
        nextSync: null,
        errors: [],
        notes: "Connector planned. Source is defined in the intelligence model but not yet included in scheduled refresh output."
      }
    );
  });

  return (
    <div className="space-y-6">
      <section className="border-b border-border pb-5">
        <h1 className="text-3xl font-semibold tracking-normal">Ingestion sources</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Operational status for primary sources, community signals, developer adoption platforms, and media validation feeds.
        </p>
      </section>

      <section className="grid gap-4">
        {completeSourceStatuses.map((source) => {
          const metadata = sourceMetadata[source.source];
          const Icon = statusIcon[source.status];
          return (
            <article key={source.source} className="rounded-md border border-border bg-card p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                    <h2 className="text-lg font-semibold">{source.label}</h2>
                    <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                      {source.status}
                    </span>
                    <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                      Tier {metadata.tier}
                    </span>
                    <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                      {metadata.signalRole.replace("_", " ")}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{source.notes}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{metadata.description}</p>
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
                    <dt className="text-muted-foreground">Type</dt>
                    <dd>{metadata.sourceType.replace("_", " ")}</dd>
                  </div>
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
