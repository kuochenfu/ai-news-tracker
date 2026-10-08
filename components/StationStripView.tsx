"use client";

import { useState, type KeyboardEvent } from "react";

import { STRIP_CELLS as CELLS, intensityColor, intensityValue } from "@/src/intensity";


export interface StripItem {
  title: string;
  score: number;
}

interface Readout {
  index: number;
  left: number;
  top: number;
}

/**
 * Ten observation cells, rank 1 to 10, colored by each item's intensity.
 * Hover, tap, or arrow keys (when focused) read out the cell's item.
 */
export function StationStripView({ items, label }: { items: StripItem[]; label: string }) {
  const [readout, setReadout] = useState<Readout | null>(null);
  const strongest = items[0] ? intensityValue(items[0].score) : null;

  function show(index: number, element: Element | null) {
    if (!element || !items[index]) return;
    const rect = element.getBoundingClientRect();
    setReadout({ index, left: rect.left + rect.width / 2, top: rect.top });
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (items.length === 0) return;
    const current = readout?.index ?? -1;
    let next = current;
    if (event.key === "ArrowRight") next = Math.min(current + 1, items.length - 1);
    else if (event.key === "ArrowLeft") next = Math.max(current - 1, 0);
    else if (event.key === "Escape") return setReadout(null);
    else return;
    event.preventDefault();
    show(next, event.currentTarget.children[next] ?? null);
  }

  const active = readout ? items[readout.index] : null;

  return (
    <div
      className="strip relative flex h-3.5 shrink-0 items-end gap-[2px] rounded-[2px]"
      tabIndex={items.length > 0 ? 0 : undefined}
      role="group"
      aria-label={strongest === null ? `${label}：無觀測` : `${label}：${items.length} 筆觀測，最強 ${strongest}。左右鍵逐格讀取`}
      onKeyDown={onKeyDown}
      onFocus={(event) => {
        if (event.target === event.currentTarget && items.length > 0) show(0, event.currentTarget.children[0] ?? null);
      }}
      onBlur={() => setReadout(null)}
      onMouseLeave={() => setReadout(null)}
    >
      {Array.from({ length: CELLS }, (_, index) => {
        const item = items[index];
        return item ? (
          <span
            key={index}
            data-active={readout?.index === index ? "" : undefined}
            className="strip-cell h-full w-2 rounded-[1px]"
            style={{ background: intensityColor(item.score) }}
            onMouseEnter={(event) => show(index, event.currentTarget)}
            onClick={(event) => show(index, event.currentTarget)}
          />
        ) : (
          <span key={index} className="h-full w-2 rounded-[1px] border border-dashed border-rule-strong" />
        );
      })}
      {active && readout ? (
        <span
          role="status"
          className="pointer-events-none fixed z-50 w-max max-w-[16rem] -translate-x-1/2 -translate-y-full rounded-[3px] bg-shell px-2 py-1.5 text-meta text-shell-ink shadow-[0_4px_12px_rgba(4,12,21,0.25)]"
          style={{ left: Math.min(Math.max(readout.left, 136), window.innerWidth - 136), top: readout.top - 6 }}
        >
          <span className="num font-semibold">
            #{readout.index + 1} · 強度 {intensityValue(active.score)}
          </span>
          <span className="mt-0.5 line-clamp-2 block">{active.title}</span>
        </span>
      ) : null}
    </div>
  );
}
