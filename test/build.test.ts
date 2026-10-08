import assert from "node:assert/strict";
import test from "node:test";

import { buildSnapshot, MIN_FRESH_SOURCES, nextScheduledRun } from "../src/pipeline/build";
import { emptyStore } from "../src/pipeline/history";
import { activeSourceOrder } from "../src/sources";
import { NOW, candidate, fullResults, hoursAgo, result } from "./helpers";

test("media items below the AI relevance bar never reach the Top 10", () => {
  const results = [
    result("the_verge", [
      candidate("the_verge", { title: "The Complete Calvin and Hobbes is a great last-minute Father’s Day gift", body: "Gift guide." }),
      candidate("the_verge", { title: "OpenAI ships a new reasoning model" })
    ])
  ];
  const { snapshot } = buildSnapshot({ results, previous: null, store: emptyStore(), now: NOW });
  const verge = snapshot.sourceTopTrends.the_verge ?? [];
  assert.deepEqual(verge.map((trend) => trend.canonicalName), ["OpenAI ships a new reasoning model"]);
  const status = snapshot.sourceStatuses.find((entry) => entry.source === "the_verge")!;
  assert.equal(status.filteredOut, 1);
  assert.equal(status.rankedCount, 1, "fewer than ten is fine; padding with off-topic items is not");
});

test("items with no title are dropped; items with no date keep a null date", () => {
  const results = [result("arxiv", [candidate("arxiv", { title: "   " }), candidate("arxiv", { publishedAt: null, title: "LLM paper" })])];
  const { snapshot } = buildSnapshot({ results, previous: null, store: emptyStore(), now: NOW });
  const arxiv = snapshot.sourceTopTrends.arxiv ?? [];
  assert.equal(arxiv.length, 1);
  assert.equal(arxiv[0].publishedAt, null);
});

test("a failed source carries its last good items, marked stale, within the limit", () => {
  const first = buildSnapshot({ results: fullResults(activeSourceOrder), previous: null, store: emptyStore(), now: NOW });
  const later = new Date(NOW.getTime() + 12 * 3_600_000);
  const results = fullResults(activeSourceOrder).map((entry) =>
    entry.source === "techcrunch" ? result("techcrunch", [], { errors: ["TechCrunch feed returned 503"] }) : entry
  );
  const second = buildSnapshot({ results, previous: first.snapshot, store: first.store, now: later });
  const status = second.snapshot.sourceStatuses.find((entry) => entry.source === "techcrunch")!;

  assert.equal(status.status, "stale");
  assert.equal(status.lastSync, NOW.toISOString(), "lastSync stays at the last fresh fetch");
  assert.ok((second.snapshot.sourceTopTrends.techcrunch ?? []).every((trend) => trend.stale));
  assert.equal(second.freshSources, activeSourceOrder.length - 1);
});

test("stale data past the limit is dropped and the source reports failed", () => {
  const first = buildSnapshot({ results: fullResults(activeSourceOrder), previous: null, store: emptyStore(), now: NOW });
  const muchLater = new Date(NOW.getTime() + 4 * 86_400_000);
  const results = fullResults(activeSourceOrder).filter((entry) => entry.source !== "tnw");
  const second = buildSnapshot({ results, previous: first.snapshot, store: first.store, now: muchLater });
  assert.equal(second.snapshot.sourceStatuses.find((entry) => entry.source === "tnw")!.status, "failed");
  assert.equal(second.snapshot.sourceTopTrends.tnw, undefined);
});

test("coverage below the minimum is reported so the refresh can refuse to publish", () => {
  const results = fullResults(activeSourceOrder.slice(0, MIN_FRESH_SOURCES - 1));
  const { freshSources } = buildSnapshot({ results, previous: null, store: emptyStore(), now: NOW });
  assert.ok(freshSources < MIN_FRESH_SOURCES);
});

test("partial request failures mark a source degraded but keep its fresh data", () => {
  const results = [result("npm", [candidate("npm", { packageName: "openai" })], { attempted: 10, failed: 4, errors: ["4 packages failed"] })];
  const { snapshot } = buildSnapshot({ results, previous: null, store: emptyStore(), now: NOW });
  assert.equal(snapshot.sourceStatuses.find((entry) => entry.source === "npm")!.status, "degraded");
  assert.equal(snapshot.sourceTopTrends.npm?.length, 1);
});

test("the same entity in two sources is linked, not counted twice", () => {
  const results = [
    result("hn", [candidate("hn", { title: "Vercel AI SDK 5 is out", url: "https://github.com/vercel/ai", metric: { name: "points", label: "", value: 300 } })]),
    result("github", [candidate("github", { title: "vercel/ai", repoFullName: "vercel/ai", body: "AI SDK", url: "https://github.com/vercel/ai" })])
  ];
  const { snapshot } = buildSnapshot({ results, previous: null, store: emptyStore(), now: NOW });
  assert.deepEqual(snapshot.sourceTopTrends.hn?.[0].corroboration, { independent: ["github"], sameOrigin: [] });
  assert.deepEqual(snapshot.sourceTopTrends.github?.[0].corroboration, { independent: ["hn"], sameOrigin: [] });
  assert.equal(snapshot.sourceTopTrends.hn?.[0].entityKey, snapshot.sourceTopTrends.github?.[0].entityKey);
});

test("history: first issue knows nothing; the next one knows what is new and how metrics moved", () => {
  const repo = (stars: number) =>
    result("github", [candidate("github", { title: "vercel/ai", repoFullName: "vercel/ai", body: "AI SDK", metric: { name: "stars", label: "", value: stars } })]);
  const first = buildSnapshot({ results: [repo(1000)], previous: null, store: emptyStore(), now: NOW });
  const firstTrend = first.snapshot.sourceTopTrends.github![0];
  assert.equal(firstTrend.seenBefore, null, "no history yet: unknown, not new");
  assert.equal(firstTrend.metric?.change, null, "no earlier observation: growth unknown");
  assert.deepEqual(first.snapshot.dailyReport.newEntityIds, []);

  const later = new Date(NOW.getTime() + 2 * 86_400_000);
  const newcomer = candidate("github", { title: "acme/agent", repoFullName: "acme/agent", body: "AI agent", publishedAt: hoursAgo(1) });
  const second = buildSnapshot({
    results: [result("github", [...repo(1300).candidates, newcomer])],
    previous: first.snapshot,
    store: first.store,
    now: later
  });
  const [known, fresh] = ["repo:vercel/ai", "repo:acme/agent"].map((key) => second.snapshot.sourceTopTrends.github!.find((trend) => trend.entityKey === key)!);
  assert.equal(known.seenBefore, true);
  assert.equal(known.firstSeen, NOW.toISOString());
  assert.deepEqual(known.metric?.change, { value: 300, days: 2 });
  assert.equal(fresh.seenBefore, false);
  assert.deepEqual(second.snapshot.dailyReport.newEntityIds, [fresh.id]);
});

test("next issue time follows the 06:00 and 18:00 Taipei schedule (22:00 and 10:00 UTC)", () => {
  assert.equal(nextScheduledRun(new Date("2026-10-09T00:20:00Z")).toISOString(), "2026-10-09T10:00:00.000Z");
  assert.equal(nextScheduledRun(new Date("2026-10-09T10:15:00Z")).toISOString(), "2026-10-09T22:00:00.000Z");
  assert.equal(nextScheduledRun(new Date("2026-10-09T22:20:00Z")).toISOString(), "2026-10-10T10:00:00.000Z");
});

test("government sources are judged on the title alone", () => {
  const results = [
    result("nstc_tw", [
      candidate("nstc_tw", { title: "2026臺德半導體合作成果交流研討會", body: "會中討論 AI 與人工智慧晶片應用。" }),
      candidate("nstc_tw", { title: "國科會第23次委員會議討論AI人才關鍵戰略" })
    ])
  ];
  const { snapshot } = buildSnapshot({ results, previous: null, store: emptyStore(), now: NOW });
  assert.deepEqual(snapshot.sourceTopTrends.nstc_tw?.map((trend) => trend.canonicalName), ["國科會第23次委員會議討論AI人才關鍵戰略"]);
  assert.equal(snapshot.sourceTopTrends.nstc_tw?.[0].publisher, "國科會");
});
