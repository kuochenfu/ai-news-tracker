import type { CoverageReport, DataRole } from "@/src/domain";
import { COVERAGE_ROLES } from "@/src/pipeline/coverage";
import { dataRoleLabel, regionLabel } from "@/src/sources";

function Roles({ entries }: { entries: Array<[DataRole, string]> }) {
  if (entries.length === 0) return <span className="text-ink-3">—</span>;
  return (
    <span className="flex flex-wrap gap-x-2 gap-y-0.5">
      {entries.map(([role, text]) => (
        <span key={role} className="num whitespace-nowrap">
          <span className="text-ink-3">{dataRoleLabel[role]}</span> {text}
        </span>
      ))}
    </span>
  );
}

const columns = "md:grid-cols-[5rem_minmax(0,1.4fr)_minmax(0,1.2fr)_4.5rem_4.5rem_minmax(0,1fr)]";

/**
 * Per region: who publishes from there and whether it works this issue, what actually
 * reached a Top 10 about the region (deduplicated clusters), and where one working
 * publisher is all that stands between the region and a blind spot.
 */
export function RegionCoverage({ coverage }: { coverage: CoverageReport }) {
  return (
    <section aria-labelledby="coverage-heading">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="coverage-heading" className="text-head font-bold">
          地區覆蓋
        </h2>
        <p className="num text-meta text-ink-3">
          {coverage.observedDays < 30 ? `歷史只涵蓋 ${coverage.observedDays} 天，30 天數字仍在累積` : "近 7／30 天"} · 地區未判定：7 天{" "}
          {coverage.unplaced[7]}、30 天 {coverage.unplaced[30]}
        </p>
      </div>
      <div className="overflow-hidden rounded-[4px] border border-rule bg-surface">
        <div className={`hidden gap-3 border-b border-rule bg-surface-2 px-4 py-2 text-meta font-semibold text-ink-2 md:grid ${columns}`}>
          <span>地區</span>
          <span>在地來源（正常／總數）</span>
          <span>7 天入選，依角色</span>
          <span className="text-right">7 天</span>
          <span className="text-right">30 天</span>
          <span>依賴</span>
        </div>
        <ul className="divide-y divide-rule">
          {coverage.regions.map((row) => {
            const available = COVERAGE_ROLES.filter((role) => row.availability[role]).map(
              (role): [DataRole, string] => [role, `${row.availability[role]!.healthy}/${row.availability[role]!.total}`]
            );
            const picked = COVERAGE_ROLES.filter((role) => row.pickedByRole7[role]).map((role): [DataRole, string] => [role, String(row.pickedByRole7[role])]);
            return (
              <li key={row.region} className={`grid grid-cols-[5rem_1fr] items-baseline gap-x-3 gap-y-1 px-4 py-2.5 text-meta ${columns}`}>
                <span className="text-body font-semibold">{regionLabel[row.region]}</span>
                <span className="text-ink-2">
                  <Roles entries={available} />
                </span>
                <span className="col-start-2 text-ink-2 md:col-start-auto">
                  <span className="text-ink-3 md:hidden">7 天入選 </span>
                  <Roles entries={picked} />
                </span>
                <span className="num col-start-2 text-ink md:col-start-auto md:text-right">
                  <span className="text-ink-3 md:hidden">7 天 </span>
                  {row.picked[7]}
                  <span className="text-ink-3 md:hidden"> · 30 天 {row.picked[30]}</span>
                </span>
                <span className="num hidden text-right text-ink md:block">{row.picked[30]}</span>
                <span className="col-start-2 md:col-start-auto">
                  {available.length === 0 ? (
                    <span className="font-bold">無在地來源</span>
                  ) : row.singlePoints.length > 0 ? (
                    <span className="font-bold underline decoration-dotted underline-offset-2">
                      單點：{row.singlePoints.map((role) => dataRoleLabel[role]).join("、")}
                    </span>
                  ) : (
                    <span className="text-ink-3">有備援</span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
      <p className="mt-2 text-meta text-ink-3">
        在地來源依發布者所在地；入選數依事件地區（由內文提到的組織與地名推斷，可同時屬於多區），並以跨來源合併後的事件計算，同一發布被多個管道轉述只算一次。
      </p>
    </section>
  );
}
