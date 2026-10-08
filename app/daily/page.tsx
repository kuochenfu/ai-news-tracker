import Link from "next/link";

import { SignalRow } from "@/components/SignalRow";
import { StationStrip } from "@/components/StationStrip";
import { TierTag } from "@/components/TierTag";
import { allObservations, formatTaipeiDate, roleLabel, trendSource } from "@/src/bulletin";
import { dailyReport, generatedAt, getTrendById, sourceStatuses, sourceTopTrends } from "@/src/mockData";
import { activeSourceOrder, sourceMetadata } from "@/src/sources";

const DAILY_TREND_LIMIT = 15;

export default function DailyPage() {
  const topTrends = dailyReport.topTrendIds
    .map((id) => getTrendById(id))
    .filter((trend) => trend !== undefined)
    .slice(0, DAILY_TREND_LIMIT);
  const statusBySource = new Map(sourceStatuses.map((status) => [status.source, status]));
  const tierCounts = ([1, 2, 3] as const).map(
    (tier) => topTrends.filter((trend) => sourceMetadata[trendSource(trend)].tier === tier).length
  );

  return (
    <div className="space-y-8">
      <section aria-labelledby="daily-heading">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h1 id="daily-heading" className="text-xl font-bold tracking-tight">
            日報 <span className="num">{formatTaipeiDate(generatedAt)}</span>
          </h1>
          <p className="num text-meta text-ink-3">
            {topTrends.length} 則精選 · T1 {tierCounts[0]} · T2 {tierCounts[1]} · T3 {tierCounts[2]} · 共 {allObservations().length} 筆觀測
          </p>
        </div>
        <ol className="divide-y divide-rule overflow-hidden rounded-[4px] border border-rule bg-surface">
          {topTrends.map((trend, index) => (
            <SignalRow key={trend.id} trend={trend} source={trendSource(trend)} rank={index + 1} showPreview />
          ))}
        </ol>
      </section>

      <section aria-labelledby="coverage-heading">
        <h2 id="coverage-heading" className="mb-3 text-head font-bold">
          各站覆蓋
        </h2>
        <div className="overflow-hidden rounded-[4px] border border-rule bg-surface">
          <div className="hidden grid-cols-[minmax(0,1.4fr)_5rem_minmax(0,1fr)_4rem_7rem] gap-3 border-b border-rule bg-surface-2 px-4 py-2 text-meta font-semibold text-ink-2 md:grid">
            <span>觀測站</span>
            <span>Tier</span>
            <span>角色</span>
            <span className="text-right">筆數</span>
            <span>強度 #1–#10</span>
          </div>
          <ul className="divide-y divide-rule">
            {activeSourceOrder.map((source) => {
              const metadata = sourceMetadata[source];
              const trends = sourceTopTrends[source] ?? [];
              const status = statusBySource.get(source)?.status;
              return (
                <li
                  key={source}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-4 py-2 md:grid-cols-[minmax(0,1.4fr)_5rem_minmax(0,1fr)_4rem_7rem]"
                >
                  <Link href={`/trends/#${source}`} className="truncate font-semibold">
                    {metadata.label}
                    {status && status !== "healthy" ? <span className="ml-2 text-meta font-bold underline decoration-dotted underline-offset-2">異常</span> : null}
                  </Link>
                  <span className="justify-self-end md:justify-self-start">
                    <TierTag tier={metadata.tier} />
                  </span>
                  <span className="text-meta text-ink-2">{roleLabel[metadata.signalRole]}</span>
                  <span className="num justify-self-end text-meta text-ink-2 md:text-body">
                    {trends.length > 0 ? trends.length : <span className="text-ink-3">無</span>}
                  </span>
                  <span className="col-span-2 md:col-span-1">
                    <StationStrip trends={trends} label={metadata.label} />
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </section>
    </div>
  );
}
