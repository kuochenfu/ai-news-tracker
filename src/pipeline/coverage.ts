import type { DataRole, Region, SourceName, SourceStatus } from "../domain";
import { activeSourceOrder, sourceMetadata } from "../sources";
import type { ObservationStore } from "./history";

export const COVERAGE_REGIONS: Region[] = ["us", "china", "taiwan", "europe", "japan", "korea"];
export const COVERAGE_ROLES: DataRole[] = ["official", "research", "media", "community", "platform"];
export const COVERAGE_WINDOWS = [7, 30] as const;

const DAY_MS = 86_400_000;

export interface RegionCoverage {
  region: Region;
  /** Publishers based in the region, per role: how many exist and how many returned fresh data this issue. */
  availability: Partial<Record<DataRole, { total: number; healthy: number }>>;
  /** Linked clusters concerning the region (event region) that reached a Top 10, per window. */
  picked: Record<(typeof COVERAGE_WINDOWS)[number], number>;
  /** Of those clusters in the 7-day window, how many were carried by each role. */
  pickedByRole7: Partial<Record<DataRole, number>>;
  /** Roles where the region depends on one working publisher (or none that works). */
  singlePoints: DataRole[];
}

export interface CoverageReport {
  regions: RegionCoverage[];
  /** Clusters with no inferred region, per window. */
  unplaced: Record<(typeof COVERAGE_WINDOWS)[number], number>;
  /** Days of history the windows can actually see. */
  observedDays: number;
}

function fresh(status: SourceStatus | undefined): boolean {
  return status?.status === "healthy" || status?.status === "degraded";
}

export function computeCoverage(store: ObservationStore, statuses: SourceStatus[], now: Date): CoverageReport {
  const statusBySource = new Map(statuses.map((status) => [status.source, status]));

  // Availability: regional publishers, plus each publisher feed inside aggregated stations.
  const availability = new Map<Region, Partial<Record<DataRole, { total: number; healthy: number }>>>();
  const add = (region: Region, role: DataRole, ok: boolean) => {
    const roles = availability.get(region) ?? {};
    const slot = roles[role] ?? { total: 0, healthy: 0 };
    slot.total += 1;
    if (ok) slot.healthy += 1;
    roles[role] = slot;
    availability.set(region, roles);
  };
  for (const source of activeSourceOrder) {
    const metadata = sourceMetadata[source];
    const status = statusBySource.get(source);
    if (status?.feeds) {
      for (const feed of status.feeds) add(feed.region, metadata.dataRole, feed.ok && fresh(status));
    } else if (metadata.region !== "global") {
      add(metadata.region, metadata.dataRole, fresh(status));
    }
  }

  // Actual coverage: distinct clusters per event region and window, from stored history.
  const windows = Object.fromEntries(COVERAGE_WINDOWS.map((days) => [days, now.getTime() - days * DAY_MS]));
  const picked = new Map<string, Set<string>>();
  const pickedByRole = new Map<string, Set<string>>();
  let oldest = now.getTime();
  for (const [key, entity] of Object.entries(store.entities)) {
    oldest = Math.min(oldest, Date.parse(entity.firstSeen));
    const cluster = entity.cluster ?? key;
    const regions = entity.regions?.length ? entity.regions : ["unplaced"];
    for (const days of COVERAGE_WINDOWS) {
      const inWindow = entity.points.filter((point) => Date.parse(point.at) >= windows[days]);
      if (inWindow.length === 0) continue;
      for (const region of regions) {
        const bucket = `${region}:${days}`;
        picked.set(bucket, (picked.get(bucket) ?? new Set()).add(cluster));
        if (days !== 7) continue;
        for (const point of inWindow) {
          const role = sourceMetadata[point.source as SourceName]?.dataRole;
          if (!role) continue;
          const roleBucket = `${region}:${role}`;
          pickedByRole.set(roleBucket, (pickedByRole.get(roleBucket) ?? new Set()).add(cluster));
        }
      }
    }
  }

  const count = (bucket: string) => picked.get(bucket)?.size ?? 0;
  return {
    regions: COVERAGE_REGIONS.map((region) => {
      const roles = availability.get(region) ?? {};
      return {
        region,
        availability: roles,
        picked: { 7: count(`${region}:7`), 30: count(`${region}:30`) },
        pickedByRole7: Object.fromEntries(
          COVERAGE_ROLES.filter((role) => pickedByRole.has(`${region}:${role}`)).map((role) => [role, pickedByRole.get(`${region}:${role}`)!.size])
        ),
        singlePoints: COVERAGE_ROLES.filter((role) => roles[role] && roles[role]!.healthy <= 1)
      };
    }),
    unplaced: { 7: count("unplaced:7"), 30: count("unplaced:30") },
    observedDays: Math.max(0, Math.floor((now.getTime() - oldest) / DAY_MS))
  };
}
