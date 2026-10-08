import { IntensityChip } from "@/components/Intensity";
import { TierTag } from "@/components/TierTag";
import { formatTaipei, publishedAt } from "@/src/bulletin";
import { decodeNumericEntities, previewText, trendUrl } from "@/src/display";
import type { SourceName, TrendEntity } from "@/src/domain";
import { sourceMetadata } from "@/src/sources";

interface SignalRowProps {
  trend: TrendEntity;
  source: SourceName;
  rank?: number;
  showSource?: boolean;
  showPreview?: boolean;
}

/** One observation: rank, intensity, title, then station, tier and publish time. */
export function SignalRow({ trend, source, rank, showSource = true, showPreview = false }: SignalRowProps) {
  const metadata = sourceMetadata[source];
  const title = decodeNumericEntities(trend.canonicalName);
  const preview = showPreview ? previewText(trend.summary, 96) : "";

  return (
    <li id={trend.id} className="grid scroll-mt-4 grid-cols-[auto_1fr] gap-x-3 px-3 py-2.5 hover:bg-surface-2 sm:px-4">
      <div className="flex items-center gap-2 pt-0.5">
        {rank !== undefined ? <span className="num w-5 text-right text-meta text-ink-3">{rank}</span> : null}
        <IntensityChip score={trend.score.finalScore} />
      </div>
      <div className="min-w-0">
        <a
          href={trendUrl(trend)}
          target="_blank"
          rel="noreferrer"
          className="line-clamp-2 break-words text-body font-semibold text-ink"
        >
          {title}
        </a>
        {preview && preview !== title ? (
          <p className="mt-0.5 line-clamp-1 text-meta text-ink-2">{preview}</p>
        ) : null}
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-meta text-ink-3">
          {showSource ? (
            <>
              <span className="font-medium text-ink-2">{metadata.label}</span>
              <TierTag tier={metadata.tier} />
            </>
          ) : null}
          <time className="num" dateTime={publishedAt(trend)}>
            {formatTaipei(publishedAt(trend))}
          </time>
        </p>
      </div>
    </li>
  );
}
