import Link from "next/link";

import { SignalFeed } from "@/components/SignalFeed";
import { SignalRow } from "@/components/SignalRow";
import { StationRail } from "@/components/StationRail";
import { isNew } from "@/src/bulletin";
import { compareAcrossSources } from "@/src/pipeline/ranking";
import { allTrends, hasHistory } from "@/src/snapshot";
import { sourceMetadata } from "@/src/sources";

export default function TodayPage() {
  const fresh = allTrends.filter(isNew).sort(compareAcrossSources);
  const firstSeen = fresh.filter((trend) => trend.seenBefore === false).length;

  const rows = fresh.map((trend) => ({
    id: trend.id,
    tier: sourceMetadata[trend.source].tier,
    node: <SignalRow trend={trend} />
  }));

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-8">
      <section aria-labelledby="fresh-heading" className="min-w-0">
        <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-2">
          <h1 id="fresh-heading" className="text-xl font-bold tracking-tight">
            過去 24 小時新出現
          </h1>
          <p className="num text-meta text-ink-3">
            {hasHistory ? `${firstSeen} 則首次觀測 · ` : "歷史資料累積中 · "}依來源內百分位排序 · 點標題開啟原文
          </p>
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
        <p className="mt-2 text-meta text-ink-3">每格是該站排行 #1–#10 在來源內的百分位；只列通過 AI 相關性門檻的項目。</p>
      </aside>
    </div>
  );
}
