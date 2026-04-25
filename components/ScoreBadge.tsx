import type { TrendVerdict } from "@/src/trendScoring";

const verdictTone: Record<TrendVerdict, string> = {
  "high-confidence": "bg-emerald-100 text-emerald-800",
  watchlist: "bg-amber-100 text-amber-900",
  emerging: "bg-sky-100 text-sky-800",
  "likely-hype": "bg-rose-100 text-rose-800"
};

export function ScoreBadge({ score, verdict }: { score: number; verdict: TrendVerdict }) {
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${verdictTone[verdict]}`}>
      {(score * 100).toFixed(0)} · {verdict}
    </span>
  );
}

