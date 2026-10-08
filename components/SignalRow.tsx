import { IntensityChip } from "@/components/Intensity";
import { TierTag } from "@/components/TierTag";
import { formatMetric, formatTaipei } from "@/src/bulletin";
import { decodeNumericEntities, previewText, trendUrl } from "@/src/display";
import type { TrendEntity } from "@/src/domain";
import { regionLabel, sourceMetadata } from "@/src/sources";

interface SignalRowProps {
  trend: TrendEntity;
  rank?: number;
  showSource?: boolean;
  showPreview?: boolean;
}

function Flag({ children, strong = false }: { children: React.ReactNode; strong?: boolean }) {
  return (
    <span className={`rounded-[3px] px-1 text-[11px] leading-4 ${strong ? "bg-shell font-semibold text-shell-ink" : "border border-dashed border-rule-strong text-ink-2"}`}>
      {children}
    </span>
  );
}

/** One observation: rank and percentile, title, then station, tier, real metric, time, and history flags. */
export function SignalRow({ trend, rank, showSource = true, showPreview = false }: SignalRowProps) {
  const metadata = sourceMetadata[trend.source];
  const title = decodeNumericEntities(trend.canonicalName);
  const preview = showPreview ? previewText(trend.summary, 96) : "";
  const metric = trend.metric ? formatMetric(trend.metric) : null;

  return (
    <li id={trend.id} className="grid scroll-mt-4 grid-cols-[auto_1fr] gap-x-3 px-3 py-2.5 hover:bg-surface-2 sm:px-4">
      <div className="flex items-center gap-2 pt-0.5">
        {rank !== undefined ? <span className="num w-5 text-right text-meta text-ink-3">{rank}</span> : null}
        <IntensityChip percentile={trend.scores.percentile} />
      </div>
      <div className="min-w-0">
        <a href={trendUrl(trend)} target="_blank" rel="noreferrer" className="line-clamp-2 break-words text-body font-semibold text-ink">
          {title}
        </a>
        {preview && preview !== title ? <p className="mt-0.5 line-clamp-1 text-meta text-ink-2">{preview}</p> : null}
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-meta text-ink-3">
          {showSource ? (
            <>
              <span className="font-medium text-ink-2">
                {trend.publisher !== metadata.label ? `${trend.publisher} · ${metadata.shortLabel}` : metadata.label}
              </span>
              <TierTag tier={metadata.tier} />
            </>
          ) : trend.publisher !== metadata.label ? (
            <span className="font-medium text-ink-2">{trend.publisher}</span>
          ) : null}
          {trend.eventRegions.length > 0 ? (
            <span title="依內文提到的組織與地名推斷">{trend.eventRegions.map((region) => regionLabel[region]).join("、")}</span>
          ) : null}
          {metric ? (
            <span className="num">
              {metric.value}
              {metric.change ? <span className="ml-1 font-semibold text-ink-2">{metric.change}</span> : null}
            </span>
          ) : null}
          {trend.publishedAt ? (
            <time className="num" dateTime={trend.publishedAt}>
              {formatTaipei(trend.publishedAt)}
            </time>
          ) : (
            <span>日期不明</span>
          )}
          {trend.seenBefore === false ? <Flag strong>首次觀測</Flag> : null}
          {trend.corroboration.independent.length > 0 ? (
            <Flag>另見 {trend.corroboration.independent.map((source) => sourceMetadata[source].shortLabel).join("、")}</Flag>
          ) : null}
          {trend.corroboration.sameOrigin.length > 0 ? (
            <span title="同一組織的其他發布管道，不算獨立佐證">同源 {trend.corroboration.sameOrigin.map((source) => sourceMetadata[source].shortLabel).join("、")}</span>
          ) : null}
          {trend.stale ? <Flag>舊資料</Flag> : null}
        </p>
      </div>
    </li>
  );
}
