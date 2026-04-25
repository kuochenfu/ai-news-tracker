import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyVerdict,
  computeTrendScore,
  parseGitHubRepo,
  parseHackerNewsStory,
  parseXPost
} from "../src/index.js";

test("computes the weighted trend score", () => {
  const result = computeTrendScore({
    hnDiscussionScore: 0.8,
    xVelocityScore: 0.5,
    githubAdoptionScore: 0.6,
    noveltyScore: 1,
    credibilityScore: 0.4
  });

  assert.equal(Number(result.finalScore.toFixed(3)), 0.66);
  assert.equal(result.verdict, "watchlist");
});

test("clamps feature inputs to the normalized range", () => {
  const result = computeTrendScore({
    hnDiscussionScore: 2,
    xVelocityScore: -5,
    githubAdoptionScore: 1,
    noveltyScore: 1,
    credibilityScore: 1
  });

  assert.equal(Number(result.finalScore.toFixed(2)), 0.7);
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

  const x = parseXPost(
    {
      id: "20",
      author_id: "u1",
      text: "new model",
      created_at: "2026-04-25T00:00:00Z",
      public_metrics: {
        like_count: 5,
        retweet_count: 2,
        reply_count: 1,
        quote_count: 0
      }
    },
    { users: [{ id: "u1", username: "alice" }] }
  );
  assert.equal(x.author, "alice");
  assert.equal(x.metrics.repostCount, 2);

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

