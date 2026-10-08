import { AlertTriangle, CheckCircle2, CircleOff } from "lucide-react";

import { StationStrip } from "@/components/StationStrip";
import { TierTag } from "@/components/TierTag";
import { formatTaipei, roleLabel, stationsByTier, tierLabel, typeLabel } from "@/src/bulletin";
import type { SourceStatus } from "@/src/domain";
import { sourceStatuses, sourceTopTrends } from "@/src/mockData";
import { sourceMetadata } from "@/src/sources";

const statusDisplay: Record<SourceStatus["status"], { label: string; icon: typeof CheckCircle2; tone: string }> = {
  healthy: { label: "正常", icon: CheckCircle2, tone: "font-medium text-ink-2" },
  degraded: { label: "異常", icon: AlertTriangle, tone: "font-bold text-ink" },
  disabled: { label: "未排程", icon: CircleOff, tone: "font-medium text-ink-3" }
};

const columns = "md:grid-cols-[minmax(0,1.3fr)_5.5rem_minmax(0,1fr)_6rem_6rem_7rem]";

export default function SourcesPage() {
  const statusBySource = new Map(sourceStatuses.map((status) => [status.source, status]));
  const counts = { healthy: 0, degraded: 0, disabled: 0 };
  for (const { sources } of stationsByTier()) {
    for (const source of sources) counts[statusBySource.get(source)?.status ?? "disabled"] += 1;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-bold tracking-tight">觀測站狀態</h1>
        <p className="num text-meta text-ink-3">
          正常 {counts.healthy} · 異常 {counts.degraded} · 未排程 {counts.disabled}
        </p>
      </div>

      {stationsByTier().map(({ tier, sources }) => (
        <section key={tier} aria-labelledby={`tier-${tier}`}>
          <h2 id={`tier-${tier}`} className="mb-2 text-head font-bold">
            Tier {tier} · {tierLabel[tier]}
          </h2>
          <div className="overflow-hidden rounded-[4px] border border-rule bg-surface">
            <div className={`hidden gap-3 border-b border-rule bg-surface-2 px-4 py-2 text-meta font-semibold text-ink-2 md:grid ${columns}`}>
              <span>觀測站</span>
              <span>狀態</span>
              <span>類型 · 角色</span>
              <span>上次同步</span>
              <span>下次同步</span>
              <span>強度 #1–#10</span>
            </div>
            <ul className="divide-y divide-rule">
              {sources.map((source) => {
                const metadata = sourceMetadata[source];
                const status = statusBySource.get(source);
                const display = statusDisplay[status?.status ?? "disabled"];
                const Icon = display.icon;
                return (
                  <li key={source} className="px-4 py-3">
                    <div className={`grid grid-cols-2 items-center gap-x-3 gap-y-1.5 ${columns}`}>
                      <div className="col-span-2 min-w-0 md:col-span-1">
                        <a href={metadata.homepageUrl} target="_blank" rel="noreferrer" className="font-semibold">
                          {metadata.label}
                        </a>
                        <p className="mt-0.5 text-meta text-ink-2">{metadata.description}</p>
                      </div>
                      <span className={`inline-flex items-center gap-1.5 text-meta ${display.tone}`}>
                        <Icon className="h-4 w-4" aria-hidden="true" />
                        {display.label}
                      </span>
                      <span className="flex items-center gap-2 text-meta text-ink-2">
                        <TierTag tier={metadata.tier} />
                        {typeLabel[metadata.sourceType]} · {roleLabel[metadata.signalRole]}
                      </span>
                      <span className="num text-meta text-ink-2">
                        <span className="text-ink-3 md:hidden">上次 </span>
                        {status?.lastSync ? formatTaipei(status.lastSync) : "尚未同步"}
                      </span>
                      <span className="num text-meta text-ink-2">
                        <span className="text-ink-3 md:hidden">下次 </span>
                        {status?.nextSync ? formatTaipei(status.nextSync) : "已暫停"}
                      </span>
                      <span className="col-span-2 md:col-span-1">
                        <StationStrip trends={sourceTopTrends[source] ?? []} label={metadata.label} />
                      </span>
                    </div>
                    {status && status.errors.length > 0 ? (
                      <ul className="mt-2 space-y-0.5 rounded-[3px] border border-rule-strong bg-surface-2 px-3 py-2 text-meta text-ink">
                        {status.errors.map((error) => (
                          <li key={error} className="break-words">
                            {error}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      ))}
    </div>
  );
}
