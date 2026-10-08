import assert from "node:assert/strict";
import test from "node:test";

import type { Region } from "../src/domain";
import { eventRegions } from "../src/pipeline/regions";

const cases: Array<{ title: string; publisher?: Region; expected: Region[] }> = [
  { title: "Anthropic’s latest feud with the Trump admin may actually help it", expected: ["us"] },
  { title: "Google brings agentic AI to Gemini, starting with businesses", expected: ["us"] },
  { title: "沐曦股份曦云C系列GPU Day 0 适配智谱GLM-5.2旗舰模型", expected: ["china"] },
  { title: "「逆矩阵」完成超亿美元融资，创始人：通用世界基座模型窗口期已压至18个月", expected: [] },
  { title: "新加坡啟用新AI超級電腦Aspire 2B，搭載逾1,500顆H200", expected: [] },
  { title: "AI 吃掉八成 NAND 產能，慧榮：供應缺口 2027 年恐更嚴峻", expected: [] },
  { title: "台積電 9 月營收創新高，AI 需求持續", expected: ["taiwan"] },
  { title: "國科會第23次委員會議討論攸關臺灣競爭力之AI人才", expected: ["taiwan"] },
  { title: "Station F and Anthropic say the AI boom is drawing startups back in person", expected: ["us", "europe"] },
  { title: "Mistral raises new funding to expand in Europe", expected: ["europe"] },
  { title: "EU AI Act: Commission publishes guidelines for general-purpose models", expected: ["europe"] },
  { title: "AI-powered hacking tools enabled a likely single attacker to breach multiple South Korean companies", expected: ["korea"] },
  { title: "富士通では「Copilot」10万ライセンスの利用率が“9割超え”", expected: ["us", "japan"] },
  { title: "政府、AI基本計画を閣議決定", publisher: "japan", expected: ["japan"] },
  { title: "政府、AI基本計画を閣議決定", publisher: "us", expected: [] },
  { title: "카카오, 국제 AI 학회서 MoE 학습 최적화 성과 공개", expected: ["korea"] },
  { title: "오픈AI \"10대 챗GPT 평균 15분 사용\" 주장에 안전성 논란", expected: ["us"] },
  { title: "삼성전자, 엔비디아에 HBM4 공급", expected: ["us", "korea"] },
  { title: "Users discuss US export rules", expected: ["us"] },
  { title: "Let us discuss the cursor position in editors", expected: [] },
  { title: "Metadata standards for datasets", expected: [] }
];

test("event regions: organisations and places map to regions, multi-label, no false hits", () => {
  for (const { title, publisher, expected } of cases) {
    assert.deepEqual(eventRegions(title, "", publisher).sort(), [...expected].sort(), title);
  }
});

test("the body is consulted only when the title names no region", () => {
  assert.deepEqual(eventRegions("New model tops benchmark", "Released by Alibaba's Qwen team in Hangzhou."), ["china"]);
  assert.deepEqual(eventRegions("OpenAI ships update", "Mistral and Alibaba also responded."), ["us"]);
});
