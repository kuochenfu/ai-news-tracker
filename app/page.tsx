import Link from "next/link";

import { SignalFeed } from "@/components/SignalFeed";
import { SignalRow } from "@/components/SignalRow";
import { StationRail } from "@/components/StationRail";
import { allObservations, isNew } from "@/src/bulletin";
import { sourceMetadata } from "@/src/sources";

export default function TodayPage() {
  const fresh = allObservations()
    .filter(({ trend }) => isNew(trend))
    .sort((a, b) => b.trend.score.finalScore - a.trend.score.finalScore);

  const rows = fresh.map(({ trend, source }) => ({
    id: `${source}-${trend.id}`,
    tier: sourceMetadata[source].tier,
    node: <SignalRow trend={trend} source={source} />
  }));

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-8">
      <section aria-labelledby="fresh-heading" className="min-w-0">
        <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-2">
          <h1 id="fresh-heading" className="text-xl font-bold tracking-tight">
            過去 24 小時新出現
          </h1>
          <p className="text-meta text-ink-3">依訊號強度排序 · 點標題開啟原文</p>
        </div>
        <div className="overflow-hidden rounded-[4px] border border-rule bg-surface">
          <SignalFeed
            rows={rows}
            emptyMessage={
              <>
                這次發布沒有 24 小時內的新觀測。
                <Link href="/daily/" className="link ml-1 font-semibold">
                  查看日報
                </Link>
              </>
            }
          />
        </div>
      </section>

      <aside className="lg:sticky lg:top-6 lg:self-start">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-head font-bold">觀測站</h2>
          <Link href="/sources/" className="link text-meta font-semibold">
            狀態
          </Link>
        </div>
        <div className="rounded-[4px] border border-rule bg-surface p-3">
          <StationRail />
        </div>
        <p className="mt-2 text-meta text-ink-3">每格是該站排行 #1–#10 的強度。</p>
      </aside>
    </div>
  );
}
