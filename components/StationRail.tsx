import Link from "next/link";

import { StationStrip } from "@/components/StationStrip";
import { stationsByTier, tierLabel } from "@/src/bulletin";
import { sourceStatuses, sourceTopTrends } from "@/src/mockData";
import { sourceMetadata } from "@/src/sources";

/** Observation stations grouped by tier. `inPage` links to anchors on the current page. */
export function StationRail({ inPage = false }: { inPage?: boolean }) {
  const statusBySource = new Map(sourceStatuses.map((status) => [status.source, status.status]));

  return (
    <nav aria-label="觀測站" className="space-y-4">
      {stationsByTier().map(({ tier, sources }) => (
        <section key={tier}>
          <h2 className="flex items-baseline justify-between border-b border-rule pb-1 text-meta font-semibold text-ink-2">
            <span>
              Tier {tier} · {tierLabel[tier]}
            </span>
            <span className="num font-normal text-ink-3">{sources.length} 站</span>
          </h2>
          <ul className="mt-1">
            {sources.map((source) => {
              const trends = sourceTopTrends[source] ?? [];
              const status = statusBySource.get(source);
              const href = inPage ? `#${source}` : `/trends/#${source}`;
              return (
                <li key={source} className="flex items-center justify-between gap-3 py-1">
                  <Link href={href} className="flex min-w-0 items-center gap-1.5 text-body text-ink">
                    <span className="truncate">{sourceMetadata[source].label}</span>
                    {status && status !== "healthy" ? (
                      <span className="text-meta font-bold underline decoration-dotted underline-offset-2">{status === "degraded" ? "異常" : "停用"}</span>
                    ) : null}
                  </Link>
                  <StationStrip trends={trends} label={sourceMetadata[source].label} />
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </nav>
  );
}
