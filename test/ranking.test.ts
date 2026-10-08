import assert from "node:assert/strict";
import test from "node:test";

import { buildSnapshot } from "../src/pipeline/build";
import { emptyStore } from "../src/pipeline/history";
import { freshness, percentiles, selectDaily } from "../src/pipeline/ranking";
import { activeSourceOrder, sourceMetadata } from "../src/sources";
import { NOW, candidate, fullResults, hoursAgo, result } from "./helpers";

test("percentiles: best item is 1, ties share the higher value", () => {
  assert.deepEqual(percentiles([0.9, 0.5, 0.5, 0.1]), [1, 0.75, 0.75, 0.25]);
  assert.deepEqual(percentiles([]), []);
});

test("items without a date get no freshness instead of looking brand new", () => {
  assert.equal(freshness(null, NOW, 1), 0);
  assert.equal(freshness("not a date", NOW, 1), 0);
  assert.equal(freshness(NOW.toISOString(), NOW, 1), 1);
});

test("Daily respects per-source and per-tier quotas across all sources", () => {
  const { snapshot } = buildSnapshot({ results: fullResults(activeSourceOrder), previous: null, store: emptyStore(), now: NOW });
  const all = Object.values(snapshot.sourceTopTrends).flat();
  const daily = snapshot.dailyReport.topTrendIds.map((id) => all.find((trend) => trend.id === id)!);

  assert.equal(daily.length, 15);
  const perSource = new Map<string, number>();
  for (const trend of daily) perSource.set(trend.source, (perSource.get(trend.source) ?? 0) + 1);
  assert.ok([...perSource.values()].every((count) => count <= 2), "no source takes more than two slots");
  for (const tier of [1, 2, 3]) {
    assert.ok(daily.filter((trend) => sourceMetadata[trend.source].tier === tier).length >= 3, `tier ${tier} has at least three`);
  }
});

test("Daily: a source with low raw scores is not shut out by one with high raw scores", () => {
  const { snapshot } = buildSnapshot({ results: fullResults(activeSourceOrder), previous: null, store: emptyStore(), now: NOW });
  const all = Object.values(snapshot.sourceTopTrends).flat();
  // Raw source scores differ widely by source; percentiles do not.
  assert.ok(all.filter((trend) => trend.rank === 1).every((trend) => trend.scores.percentile === 1));
  const sources = new Set(snapshot.dailyReport.topTrendIds.map((id) => all.find((trend) => trend.id === id)!.source));
  assert.ok(sources.has("hn") || sources.has("github"), "community/adoption sources reach the Daily");
});

test("Daily picks one item per entity and skips stale carry-overs", () => {
  const { snapshot } = buildSnapshot({ results: fullResults(activeSourceOrder), previous: null, store: emptyStore(), now: NOW });
  const all = Object.values(snapshot.sourceTopTrends).flat();
  const twin = { ...all[0], id: "twin", source: "hn" as const, entityKey: "other-key" };
  const stale = { ...all[1], id: "stale", entityKey: "stale", stale: true, scores: { ...all[1].scores, percentile: 1 } };
  const picked = selectDaily([all[0], twin, stale, ...all.slice(2)], NOW).map((trend) => trend.id);
  assert.ok(!(picked.includes(all[0].id) && picked.includes("twin")));
  assert.ok(!picked.includes("stale"));
});

test("a huge archive feed does not pin its Top 10 at the top percentile", () => {
  const archive = Array.from({ length: 2000 }, (_, index) =>
    candidate("official_blog", { title: `Post ${index}`, publishedAt: hoursAgo(index * 6), feedIndex: index })
  );
  const { snapshot } = buildSnapshot({ results: [result("official_blog", archive)], previous: null, store: emptyStore(), now: NOW });
  const values = (snapshot.sourceTopTrends.official_blog ?? []).map((trend) => trend.scores.percentile);
  assert.equal(values[0], 1);
  assert.ok(values[9] <= 0.75, `#10 sits within the best-30 pool, got ${values[9]}`);
});

test("with enough stored history, percentile compares against the source's recent distribution", () => {
  const store = emptyStore();
  store.sourceScores = { hn: Array.from({ length: 100 }, (_, index) => ({ at: hoursAgo(24), score: index / 100 })) };
  const strong = candidate("hn", { title: "OpenAI launches a model", metric: { name: "points", label: "", value: 500 }, signals: { comments: 200 }, publishedAt: hoursAgo(1) });
  const weak = candidate("hn", { title: "AI agents, briefly", metric: { name: "points", label: "", value: 2 }, signals: { comments: 0 }, publishedAt: hoursAgo(30) });
  const { snapshot, store: next } = buildSnapshot({ results: [result("hn", [strong, weak])], previous: null, store, now: NOW });
  const [first, second] = snapshot.sourceTopTrends.hn!;
  assert.ok(first.scores.percentile > 0.9, "a strong HN day reads strong");
  assert.ok(second.scores.percentile < 0.5, "the weak item is not lifted just because the pool is small");
  assert.equal(next.sourceScores?.hn.length, 102, "this refresh's pool joins the reference");
});
