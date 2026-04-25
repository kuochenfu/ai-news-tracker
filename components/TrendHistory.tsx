export function TrendHistory({ points }: { points: Array<{ date: string; score: number }> }) {
  return (
    <div className="flex h-16 items-end gap-2" aria-label="Historical trend score bars">
      {points.map((point) => (
        <div key={point.date} className="flex flex-1 flex-col items-center gap-1">
          <div
            className="w-full rounded-t bg-primary"
            style={{ height: `${Math.max(point.score * 100, 8)}%` }}
            title={`${point.date}: ${(point.score * 100).toFixed(0)}`}
          />
          <span className="text-[10px] text-muted-foreground">{point.date.slice(5)}</span>
        </div>
      ))}
    </div>
  );
}

