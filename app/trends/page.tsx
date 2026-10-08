import { SignalRow } from "@/components/SignalRow";
import { StationRail } from "@/components/StationRail";
import { StationStrip } from "@/components/StationStrip";
import { TierTag } from "@/components/TierTag";
import { roleLabel } from "@/src/bulletin";
import { sourceTopTrends } from "@/src/mockData";
import { activeSourceOrder, sourceMetadata } from "@/src/sources";

export default function TrendsPage() {
  return (
    <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-8">
      <aside className="hidden lg:sticky lg:top-6 lg:block lg:max-h-[calc(100vh-3rem)] lg:self-start lg:overflow-y-auto">
        <div className="rounded-[4px] border border-rule bg-surface p-3">
          <StationRail inPage />
        </div>
      </aside>

      <div className="min-w-0 space-y-8">
        <div>
          <h1 className="text-xl font-bold tracking-tight">各站排行</h1>
          <p className="mt-1 text-meta text-ink-3">每站獨立排名 Top 10，不做跨站總排名。</p>
          <nav aria-label="跳到觀測站" className="mt-3 flex gap-1.5 overflow-x-auto pb-1 lg:hidden">
            {activeSourceOrder.map((source) => (
              <a
                key={source}
                href={`#${source}`}
                className="shrink-0 rounded-[3px] border border-rule bg-surface px-2 py-1 text-meta font-semibold text-ink-2"
              >
                {sourceMetadata[source].shortLabel}
              </a>
            ))}
          </nav>
        </div>

        {activeSourceOrder.map((source) => {
          const metadata = sourceMetadata[source];
          const trends = sourceTopTrends[source] ?? [];
          return (
            <section key={source} id={source} aria-labelledby={`${source}-heading`} className="scroll-mt-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <h2 id={`${source}-heading`} className="text-head font-bold">
                    {metadata.label}
                  </h2>
                  <TierTag tier={metadata.tier} />
                  <span className="text-meta text-ink-3">{roleLabel[metadata.signalRole]}</span>
                </div>
                <StationStrip trends={trends} label={metadata.label} />
              </div>
              <p className="mb-2 text-meta text-ink-2">{metadata.description}</p>
              {trends.length > 0 ? (
                <ol className="divide-y divide-rule overflow-hidden rounded-[4px] border border-rule bg-surface">
                  {trends.map((trend, index) => (
                    <SignalRow
                      key={trend.id}
                      trend={trend}
                      source={source}
                      rank={index + 1}
                      showSource={false}
                      showPreview
                    />
                  ))}
                </ol>
              ) : (
                <div className="rounded-[4px] border border-dashed border-rule-strong bg-surface px-4 py-5 text-body text-ink-2">
                  <p className="font-semibold text-ink">這次發布沒有 {metadata.label} 的排名資料。</p>
                  <p className="mt-1 text-meta">
                    觀測站仍在名單中；請到「觀測站」頁查看同步狀態與錯誤訊息。
                  </p>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
