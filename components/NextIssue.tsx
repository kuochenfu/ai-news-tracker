"use client";

import { useEffect, useState } from "react";

/** Next issue time; marked overdue once it has passed by more than the refresh-and-deploy grace. */
const GRACE_MS = 90 * 60 * 1000;

export function NextIssue({ at, label }: { at: string | null; label: string }) {
  const [overdue, setOverdue] = useState(false);

  useEffect(() => {
    if (!at) return;
    const check = () => setOverdue(Date.now() > new Date(at).getTime() + GRACE_MS);
    check();
    const timer = window.setInterval(check, 60_000);
    return () => window.clearInterval(timer);
  }, [at]);

  return (
    <p>
      <span className="text-shell-ink-2">下次 </span>
      <time className={`num font-semibold ${overdue ? "line-through decoration-1" : ""}`} dateTime={at ?? undefined}>
        {label}
      </time>
      {overdue ? (
        <span className="ml-1.5 rounded-[2px] bg-shell-ink px-1 text-meta font-bold text-shell">逾期，資料可能未更新</span>
      ) : null}
    </p>
  );
}
