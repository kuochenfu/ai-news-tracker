import { StationStripView } from "@/components/StationStripView";
import { decodeNumericEntities } from "@/src/display";
import type { TrendEntity } from "@/src/domain";
import { STRIP_CELLS } from "@/src/intensity";

/** Server wrapper: hands the client strip only titles and scores, not whole trend records. */
export function StationStrip({ trends, label }: { trends: TrendEntity[]; label: string }) {
  const items = trends.slice(0, STRIP_CELLS).map((trend) => ({
    title: decodeNumericEntities(trend.canonicalName),
    score: trend.score.finalScore
  }));
  return <StationStripView items={items} label={label} />;
}
