import assert from "node:assert/strict";
import test from "node:test";

import { aiRelevance, isAiRelevant } from "../src/pipeline/relevance";
import { relevanceLabels } from "./fixtures/relevance-labels";

test("short English terms match whole words only", () => {
  assert.equal(aiRelevance("He said the train was late").score, 0);
  assert.equal(aiRelevance("Maintainers explain the plan").score, 0);
  assert.ok(isAiRelevant("New AI model tops benchmark"));
  assert.ok(isAiRelevant("微信支付“AI专属卡”上线"));
});

test("CJK phrases count without double-counting nested terms", () => {
  const result = aiRelevance("智谱发布新一代大模型");
  assert.deepEqual(result.matches, ["大模型"]);
  assert.ok(isAiRelevant("智谱发布新一代大模型"));
  assert.equal(isAiRelevant("泰國拚 2050 自製晶片"), false);
});

test("body matches count at half weight", () => {
  assert.equal(isAiRelevant("Quarterly earnings", "The company mentioned AI once."), false);
  assert.ok(isAiRelevant("Quarterly earnings", "Revenue from AI and LLM products doubled."));
});

test("labelled snapshot titles: precision and recall stay above the bar", () => {
  let truePositive = 0;
  let falsePositive = 0;
  let falseNegative = 0;
  const misses: string[] = [];
  for (const { title, ai } of relevanceLabels) {
    const predicted = isAiRelevant(title);
    if (predicted && ai) truePositive += 1;
    if (predicted && !ai) {
      falsePositive += 1;
      misses.push(`false positive: ${title}`);
    }
    if (!predicted && ai) {
      falseNegative += 1;
      misses.push(`false negative: ${title}`);
    }
  }
  const precision = truePositive / (truePositive + falsePositive);
  const recall = truePositive / (truePositive + falseNegative);
  assert.ok(relevanceLabels.length >= 40, "keep at least 40 labelled examples");
  assert.ok(precision >= 0.95, `precision ${precision.toFixed(2)}\n${misses.join("\n")}`);
  assert.ok(recall >= 0.9, `recall ${recall.toFixed(2)}\n${misses.join("\n")}`);
});
