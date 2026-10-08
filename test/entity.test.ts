import assert from "node:assert/strict";
import test from "node:test";

import { clusterByKeys, dedupeWithinSource, entityKeys, normalizeUrl, titleSlug } from "../src/pipeline/entity";
import type { Candidate } from "../src/pipeline/types";

function candidate(overrides: Partial<Candidate>): Candidate {
  return { source: "hn", externalId: "1", title: "Title", publishedAt: null, entityType: "tool", ...overrides };
}

test("normalizes URLs: host case, www, trailing slash, tracking params", () => {
  assert.equal(normalizeUrl("https://www.Example.com/Post/?utm_source=x&id=2"), "example.com/post?id=2");
  assert.equal(normalizeUrl("not a url"), null);
});

test("an HN story linking a GitHub repo shares the repo's identity", () => {
  const story = entityKeys(candidate({ url: "https://github.com/Vercel/AI#readme" }));
  const repo = entityKeys(candidate({ source: "github", repoFullName: "vercel/ai", url: "https://github.com/vercel/ai" }));
  assert.ok(story.includes("repo:vercel/ai"));
  assert.ok(repo.includes("repo:vercel/ai"));
  assert.deepEqual(clusterByKeys([story, repo]), [[0, 1]]);
});

test("a release keeps its own identity but links to its repo", () => {
  const keys = entityKeys(
    candidate({ source: "github_releases", repoFullName: "openai/openai-python", releaseTag: "v1.2.0", url: "https://github.com/openai/openai-python/releases/tag/v1.2.0" })
  );
  assert.deepEqual(keys, ["release:openai/openai-python@v1.2.0", "repo:openai/openai-python"]);
});

test("arXiv versions and PDF links collapse to one paper", () => {
  const abs = entityKeys(candidate({ source: "arxiv", url: "https://arxiv.org/abs/2606.18249v1" }));
  const pdf = entityKeys(candidate({ url: "https://arxiv.org/pdf/2606.18249v2" }));
  assert.equal(abs[0], "arxiv:2606.18249");
  assert.equal(pdf[0], "arxiv:2606.18249");
});

test("title slugs keep CJK text instead of dropping it", () => {
  assert.equal(titleSlug("智谱 发布 GLM-5.2"), "智谱-发布-glm-5-2");
  assert.equal(entityKeys(candidate({ title: "智谱发布新模型" }))[0], "topic:智谱发布新模型");
});

test("dedupes repeated items within a source", () => {
  const items = [
    candidate({ externalId: "a", url: "https://example.com/post" }),
    candidate({ externalId: "b", url: "https://example.com/post/?utm_campaign=rss" }),
    candidate({ externalId: "c", url: "https://example.com/other" })
  ];
  assert.deepEqual(dedupeWithinSource(items).map((item) => item.externalId), ["a", "c"]);
});
