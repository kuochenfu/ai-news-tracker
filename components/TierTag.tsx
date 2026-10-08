import { tierShort } from "@/src/bulletin";
import type { SourceMetadata } from "@/src/sources";

export function TierTag({ tier }: { tier: SourceMetadata["tier"] }) {
  return (
    <span className="inline-flex shrink-0 items-center rounded-[3px] border border-rule-strong px-1 text-[11px] font-semibold leading-4 text-ink-2">
      T{tier}
      <span className="ml-1 font-normal">{tierShort[tier]}</span>
    </span>
  );
}
