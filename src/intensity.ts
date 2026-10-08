/** Cells per station strip: one per rank in a station's Top 10. */
export const STRIP_CELLS = 10;

const thresholds = [0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];

export const intensityBands = [
  { min: 0, label: "<20" },
  { min: 0.2, label: "20" },
  { min: 0.3, label: "30" },
  { min: 0.4, label: "40" },
  { min: 0.5, label: "50" },
  { min: 0.6, label: "60" },
  { min: 0.7, label: "70" },
  { min: 0.8, label: "80" },
  { min: 0.9, label: "90" }
];

export function intensityBand(score: number): number {
  let band = 0;
  for (const threshold of thresholds) {
    if (score >= threshold) band += 1;
  }
  return band;
}

export function intensityColor(score: number): string {
  return `var(--i${intensityBand(score)})`;
}

export function intensityValue(score: number): number {
  return Math.round(Math.min(Math.max(score, 0), 1) * 100);
}
