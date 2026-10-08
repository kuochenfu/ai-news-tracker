import assert from "node:assert/strict";
import test from "node:test";

import { buildSnapshot } from "../src/pipeline/build";
import { parseAnthropicNews } from "../src/pipeline/collectors";
import { computeCoverage } from "../src/pipeline/coverage";
import { emptyStore } from "../src/pipeline/history";
import { selectDaily } from "../src/pipeline/ranking";
import { NOW, candidate, fullResults, hoursAgo, result } from "./helpers";
import { activeSourceOrder } from "../src/sources";

/** One OpenAI SDK release seen four ways: GitHub release, npm package, an HN thread, a media article. */
function openAiRelease() {
  const repo = "openai/openai-node";
  return [
    result("github_releases", [
      candidate("github_releases", { title: `${repo} v6.0.0`, repoFullName: repo, releaseTag: "v6.0.0", url: `https://github.com/${repo}/releases/tag/v6.0.0` })
    ]),
    result("npm", [candidate("npm", { title: "openai 6.0.0", packageName: "openai", repoFullName: repo, url: "https://www.npmjs.com/package/openai" })]),
    result("hn", [candidate("hn", { title: "OpenAI Node SDK v6 is out", url: `https://github.com/${repo}`, metric: { name: "points", label: "", value: 200 } })]),
    result("techcrunch", [candidate("techcrunch", { title: "OpenAI ships SDK v6", url: "https://techcrunch.com/openai-sdk-v6" })])
  ];
}

test("a lab's release and its package echo each other; only other voices count as independent", () => {
  const { snapshot } = buildSnapshot({ results: openAiRelease(), previous: null, store: emptyStore(), now: NOW });
  const release = snapshot.sourceTopTrends.github_releases![0];
  const pkg = snapshot.sourceTopTrends.npm![0];
  const story = snapshot.sourceTopTrends.hn![0];

  assert.equal(release.origin, "openai");
  assert.equal(pkg.origin, "openai");
  assert.deepEqual(release.corroboration, { independent: ["hn"], sameOrigin: ["npm"] });
  assert.deepEqual(pkg.corroboration, { independent: ["hn"], sameOrigin: ["github_releases"] });
  assert.deepEqual(story.corroboration, { independent: ["github_releases"], sameOrigin: [] }, "release and package are one voice to the HN thread");
  assert.equal(release.cluster, pkg.cluster);
});

test("the Daily shows one item per linked cluster", () => {
  const { snapshot } = buildSnapshot({ results: openAiRelease(), previous: null, store: emptyStore(), now: NOW });
  const all = Object.values(snapshot.sourceTopTrends).flat();
  const picked = selectDaily(all, NOW);
  const clusters = picked.map((trend) => trend.cluster);
  assert.equal(new Set(clusters).size, clusters.length);
});

test("first-party items are published by their organisation, with its region", () => {
  const results = [result("official_blog", [candidate("official_blog", { title: "Mistral Large 4", origin: "mistral" })])];
  const { snapshot } = buildSnapshot({ results, previous: null, store: emptyStore(), now: NOW });
  const item = snapshot.sourceTopTrends.official_blog![0];
  assert.equal(item.publisher, "Mistral AI");
  assert.equal(item.publisherRegion, "europe");
  assert.deepEqual(item.eventRegions, ["europe"]);
});

test("parses Anthropic's news index without depending on hashed class names", () => {
  const html = `
    <a href="/news/claude-haiku-5-5" class="Featured_x1__abc"><h2 class="Featured_h">Introducing Claude Haiku 5.5</h2></a>
    <ul>
      <li><a href="/news/barclays-scales-claude" class="List__a1"><div><time class="List__date">Oct 1, 2026</time></div><span class="List__title body-3">Barclays scales Claude &amp; more</span></a></li>
      <li><a href="/news/barclays-scales-claude" class="List__a1"><span class="List__title">Duplicate</span></a></li>
      <li><a href="/news/no-title" class="List__a1"><img src="x.png"/></a></li>
    </ul>`;
  const items = parseAnthropicNews(html);
  assert.deepEqual(items.map((item) => item.title), ["Introducing Claude Haiku 5.5", "Barclays scales Claude & more"]);
  assert.equal(items[1].publishedAt, new Date("Oct 1, 2026").toISOString());
  assert.equal(items[0].publishedAt, null);
  assert.ok(items.every((item) => item.origin === "anthropic" && item.url?.startsWith("https://www.anthropic.com/news/")));
});

test("coverage: regional availability flags single points, picks are counted per cluster and window", () => {
  const results = fullResults(activeSourceOrder).map((entry) =>
    entry.source === "qbitai" ? result("qbitai", [], { errors: ["feed down"] }) : entry
  );
  results.push(result("thirtysixkr", [candidate("thirtysixkr", { title: "智谱发布新一代大模型", publishedAt: hoursAgo(1) })]));
  const { snapshot, store } = buildSnapshot({ results, previous: null, store: emptyStore(), now: NOW });
  const china = snapshot.coverage.regions.find((entry) => entry.region === "china")!;

  assert.deepEqual(china.availability.media, { total: 2, healthy: 1 });
  assert.ok(china.singlePoints.includes("media"), "China media rests on 36Kr alone while 量子位 is down");
  assert.ok(china.picked[7] >= 1);

  const later = computeCoverage(store, snapshot.sourceStatuses, new Date(NOW.getTime() + 10 * 86_400_000));
  assert.equal(later.regions.find((entry) => entry.region === "china")!.picked[7], 0, "outside the 7-day window");
  assert.ok(later.regions.find((entry) => entry.region === "china")!.picked[30] >= 1);
});

test("a publisher with several feeds counts once and works if any feed works", () => {
  const feeds = [
    { origin: "google", url: "https://deepmind.google/blog/rss.xml", ok: false },
    { origin: "google", url: "https://blog.google/technology/ai/rss/", ok: true },
    { origin: "qwen", url: "https://qwenlm.github.io/blog/index.xml", ok: false }
  ];
  const results = [result("official_blog", [candidate("official_blog", { origin: "google" })], { feeds, attempted: 3, failed: 2 })];
  const { snapshot } = buildSnapshot({ results, previous: null, store: emptyStore(), now: NOW });
  const status = snapshot.sourceStatuses.find((entry) => entry.source === "official_blog")!;
  assert.deepEqual(status.feeds, [
    { publisher: "Google", region: "us", ok: true },
    { publisher: "Qwen", region: "china", ok: false }
  ]);
  const china = snapshot.coverage.regions.find((entry) => entry.region === "china")!;
  assert.deepEqual(china.availability.official, { total: 1, healthy: 0 });
  assert.ok(china.singlePoints.includes("official"));
});
