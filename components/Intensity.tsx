import { intensityBands, intensityColor, intensityValue } from "@/src/intensity";

/** Percentile within the item's own source, as a colour and a number. */
export function IntensityChip({ percentile }: { percentile: number }) {
  const score = percentile;
  const value = intensityValue(score);
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="h-3 w-3 shrink-0 rounded-[2px] ring-1 ring-inset ring-black/10"
        style={{ background: intensityColor(score) }}
        aria-hidden="true"
      />
      <span className="num w-6 text-right text-meta font-semibold text-ink">
        <span className="sr-only">來源內百分位 </span>
        {value}
      </span>
    </span>
  );
}

/** The bulletin legend: one swatch per band with its lower threshold printed beneath. */
export function IntensityLegend() {
  return (
    <div className="flex items-end gap-2" role="img" aria-label="來源內百分位色階：20 以下到 90 以上">
      <span className="pb-3 text-meta text-shell-ink-2">來源內百分位</span>
      <div className="flex">
        {intensityBands.map((band) => (
          <span key={band.label} className="flex w-6 flex-col items-center gap-0.5 sm:w-5">
            <span className="h-2.5 w-full" style={{ background: intensityColor(band.min) }} />
            <span className="num text-[10px] leading-3 text-shell-ink-2">{band.min === 0 ? "" : band.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
