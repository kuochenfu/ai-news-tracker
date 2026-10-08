"use client";

import { Fragment, useState, type ReactNode } from "react";

type TierFilter = "all" | 1 | 2 | 3;

interface SignalFeedProps {
  rows: Array<{ id: string; tier: 1 | 2 | 3; node: ReactNode }>;
  emptyMessage: ReactNode;
}

const filters: Array<{ value: TierFilter; label: string }> = [
  { value: "all", label: "全部" },
  { value: 1, label: "T1 一手" },
  { value: 2, label: "T2 社群" },
  { value: 3, label: "T3 媒體" }
];

/** Tier filter over server-rendered signal rows; counts re-tally in place. */
export function SignalFeed({ rows, emptyMessage }: SignalFeedProps) {
  const [filter, setFilter] = useState<TierFilter>("all");
  const visible = filter === "all" ? rows : rows.filter((row) => row.tier === filter);

  return (
    <div>
      <div role="group" aria-label="依 Tier 篩選" className="flex flex-wrap gap-1 border-b border-rule px-3 py-2 sm:px-4">
        {filters.map((option) => {
          const count = option.value === "all" ? rows.length : rows.filter((row) => row.tier === option.value).length;
          const active = filter === option.value;
          return (
            <button
              key={option.label}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(option.value)}
              disabled={count === 0 && !active}
              className={`rounded-[3px] px-2.5 py-1 text-meta font-semibold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40 ${
                active ? "bg-shell text-shell-ink" : "text-ink-2 hover:bg-surface-2 hover:text-ink"
              }`}
            >
              {option.label}
              <span className={`num ml-1.5 font-normal ${active ? "text-shell-ink-2" : "text-ink-3"}`}>{count}</span>
            </button>
          );
        })}
      </div>
      {visible.length > 0 ? (
        <ol className="divide-y divide-rule">{visible.map((row) => <Fragment key={row.id}>{row.node}</Fragment>)}</ol>
      ) : (
        <div className="px-4 py-10 text-center text-body text-ink-2">{emptyMessage}</div>
      )}
    </div>
  );
}

