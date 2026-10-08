import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { StationStrip } from "@/components/StationStrip";
import { stationsByTier, statusLabel, tierLabel } from "@/src/bulletin";
import { sourceStatuses, sourceTopTrends } from "@/src/snapshot";
import { sourceMetadata } from "@/src/sources";

/** Observation stations grouped by tier. `inPage` links to anchors on the current page. */
export function StationRail({ inPage = false }: { inPage?: boolean }) {
  const statusBySource = new Map(sourceStatuses.map((status) => [status.source, status.status]));

  return (
    <nav aria-label="觀測站" className="space-y-4">
      {stationsByTier().map(({ tier, sources }) => (
        <details key={tier} open className="group">
          <summary className="flex cursor-pointer list-none items-baseline justify-between border-b border-rule pb-1 text-meta font-semibold text-ink-2 [&::-webkit-details-marker]:hidden">
            <span>
              <ChevronRight aria-hidden="true" className="-mt-0.5 mr-0.5 inline h-3.5 w-3.5 transition-transform duration-150 group-open:rotate-90" />
              Tier {tier} · {tierLabel[tier]}
            </span>
            <span className="num font-normal text-ink-3">{sources.length} 站</span>
          </summary>
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
                      <span className="text-meta font-bold underline decoration-dotted underline-offset-2">{statusLabel[status]}</span>
                    ) : null}
                  </Link>
                  <StationStrip trends={trends} label={sourceMetadata[source].label} />
                </li>
              );
            })}
          </ul>
        </details>
      ))}
    </nav>
  );
}
