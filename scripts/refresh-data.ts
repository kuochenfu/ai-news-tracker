import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { buildSnapshot, MIN_FRESH_SOURCES } from "../src/pipeline/build";
import { collectAll } from "../src/pipeline/collectors";
import { loadHistory, saveHistory } from "../src/pipeline/history";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const outputPath = join(rootDir, "src/generated/snapshot.json");
/** Checkout of the `data` branch in CI; a local directory otherwise. */
const dataDir = resolve(rootDir, process.env.DATA_DIR ?? ".data");

async function main() {
  const now = new Date();
  const { store, previous } = await loadHistory(dataDir);
  const results = await collectAll();
  const { snapshot, store: nextStore, freshSources } = buildSnapshot({ results, previous, store, now });

  for (const status of snapshot.sourceStatuses) {
    const line = `${status.source.padEnd(16)} ${status.status.padEnd(9)} ranked ${String(status.rankedCount).padStart(2)} / ${status.candidateCount} candidates, ${status.filteredOut} off-topic`;
    console.log(status.errors.length ? `${line}\n${" ".repeat(17)}${status.errors.join("\n" + " ".repeat(17))}` : line);
  }

  if (freshSources < MIN_FRESH_SOURCES) {
    console.error(`Only ${freshSources} sources returned fresh data (minimum ${MIN_FRESH_SOURCES}). Not publishing; the site keeps its last issue.`);
    process.exitCode = 1;
    return;
  }

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  await saveHistory(dataDir, nextStore, snapshot);
  console.log(
    `Wrote ${outputPath}: ${freshSources} fresh sources, ${snapshot.dailyReport.topTrendIds.length} daily picks, ` +
      `${snapshot.dailyReport.newEntityIds.length} new entities, ${snapshot.historyDays} days of history in ${dataDir}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
