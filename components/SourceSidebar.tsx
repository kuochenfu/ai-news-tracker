import type { SourceName } from "@/src/domain";

const labels: Record<SourceName, string> = {
  hn: "Hacker News",
  github: "GitHub"
};

export function SourceSidebar({ sources }: { sources: SourceName[] }) {
  return (
    <aside className="rounded-md border border-border bg-card p-3 lg:sticky lg:top-6">
      <h2 className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sources</h2>
      <nav className="mt-2 grid gap-1">
        {sources.map((source) => (
          <a
            key={source}
            href={`#${source}`}
            className="rounded-md px-2 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            {labels[source]}
          </a>
        ))}
      </nav>
    </aside>
  );
}

