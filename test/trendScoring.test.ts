import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyVerdict,
  computeTrendScore,
  parseGitHubRepo,
  parseHackerNewsStory
} from "../src/index";

test("computes the weighted trend score", () => {
  const result = computeTrendScore({
    hnDiscussionScore: 0.8,
    githubAdoptionScore: 0.6
  });

  assert.equal(Number(result.finalScore.toFixed(3)), 0.71);
  assert.equal(result.verdict, "watchlist");
});

test("clamps feature inputs to the normalized range", () => {
  const result = computeTrendScore({
    hnDiscussionScore: 2,
    githubAdoptionScore: 1
  });

  assert.equal(Number(result.finalScore.toFixed(2)), 1);
});

test("classifies verdict bands", () => {
  assert.equal(classifyVerdict(0.2), "likely-hype");
  assert.equal(classifyVerdict(0.4), "emerging");
  assert.equal(classifyVerdict(0.55), "watchlist");
  assert.equal(classifyVerdict(0.8), "high-confidence");
});

test("normalizes supported source payloads", () => {
  const hn = parseHackerNewsStory({
    id: 1,
    title: "T",
    by: "a",
    score: 10,
    descendants: 3
  });
  assert.equal(hn.externalId, "1");
  assert.equal(hn.source, "hn");
  assert.equal(hn.metrics.commentCount, 3);

  const gh = parseGitHubRepo({
    id: 99,
    full_name: "openai/openai-python",
    owner: { login: "openai" },
    stargazers_count: 100,
    forks_count: 11
  });
  assert.equal(gh.source, "github");
  assert.equal(gh.metrics.stars, 100);
});
