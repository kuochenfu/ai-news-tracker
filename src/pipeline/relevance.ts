/**
 * AI relevance: is this item about AI at all? Scored before any ranking so that
 * off-topic items never compete for a Top 10 slot.
 *
 * English terms match as whole words (so "ai" never matches "said"); CJK terms
 * match as phrases because CJK text has no word boundaries.
 */

const STRONG_EN = [
  "ai",
  "a\\.i\\.",
  "artificial intelligence",
  "genai",
  "generative",
  "llms?",
  "large language models?",
  "language models?",
  "foundation models?",
  "frontier models?",
  "machine learning",
  "deep learning",
  "neural networks?",
  "chatgpt",
  "gpt(?:-?\\d[\\w.]*)?",
  "openai",
  "anthropic",
  "claude",
  "gemini",
  "deepseek",
  "qwen",
  "llama",
  "mistral",
  "copilot",
  "hugging ?face",
  "diffusion models?",
  "agentic",
  "ai agents?",
  "mcp",
  "rag",
  "embeddings?",
  "fine-?tun(?:e|es|ed|ing)",
  "multimodal",
  "prompt(?:s|ing)?"
];

const WEAK_EN = [
  "agents?",
  "models?",
  "inference",
  "transformers?",
  "nvidia",
  "gpus?",
  "robots?",
  "robotics",
  "chips?",
  "semiconductors?",
  "data ?centers?",
  "compute",
  "automation"
];

const STRONG_CJK = [
  "人工智慧",
  "人工智能",
  "生成式",
  "大模型",
  "大語言模型",
  "大语言模型",
  "語言模型",
  "语言模型",
  "基座模型",
  "旗艦模型",
  "旗舰模型",
  "機器學習",
  "机器学习",
  "深度學習",
  "深度学习",
  "智能體",
  "智能体",
  "具身",
  "多模態",
  "多模态",
  // Japanese
  "人工知能",
  "大規模言語モデル",
  "言語モデル",
  "機械学習",
  "深層学習",
  "プロンプト",
  "チャットGPT",
  // Korean
  "인공지능",
  "생성형",
  "챗GPT",
  "챗봇",
  "거대언어모델",
  "언어모델",
  "머신러닝",
  "딥러닝",
  "파운데이션 모델"
];

const WEAK_CJK = [
  "模型",
  "推論",
  "推理",
  "算力",
  "晶片",
  "芯片",
  "機器人",
  "机器人",
  "半導體",
  "半导体",
  "代理",
  "エージェント",
  "半導体",
  "ロボット",
  "에이전트",
  "모델",
  "반도체",
  "로봇"
];

const STRONG_WEIGHT = 1;
const WEAK_WEIGHT = 0.4;
/** Matches in the body count at half weight: titles carry what an item is about. */
const BODY_FACTOR = 0.5;
const SATURATION = 2;

/** Minimum relevance for an item to enter ranking. One strong term in the title passes. */
export const MIN_RELEVANCE = 0.5;

function wordPattern(term: string): RegExp {
  return new RegExp(`(?<![A-Za-z0-9])${term}(?![A-Za-z0-9])`, "i");
}

const strongEn = STRONG_EN.map((term) => ({ term, pattern: wordPattern(term) }));
const weakEn = WEAK_EN.map((term) => ({ term, pattern: wordPattern(term) }));

function matchedTerms(text: string): { strong: string[]; weak: string[] } {
  const strong = [
    ...strongEn.filter(({ pattern }) => pattern.test(text)).map(({ term }) => term),
    ...STRONG_CJK.filter((term) => text.includes(term))
  ];
  const weak = [
    ...weakEn.filter(({ pattern }) => pattern.test(text)).map(({ term }) => term),
    // A weak CJK phrase that is part of a strong one (模型 in 大模型) is not counted twice.
    ...WEAK_CJK.filter((term) => text.includes(term) && !STRONG_CJK.some((strongTerm) => strongTerm.includes(term) && text.includes(strongTerm)))
  ];
  return { strong, weak };
}

export interface Relevance {
  score: number;
  matches: string[];
}

export function aiRelevance(title: string, body = ""): Relevance {
  const inTitle = matchedTerms(title);
  const inBody = matchedTerms(body);
  const bodyStrong = inBody.strong.filter((term) => !inTitle.strong.includes(term));
  const bodyWeak = inBody.weak.filter((term) => !inTitle.weak.includes(term));

  const weight =
    inTitle.strong.length * STRONG_WEIGHT +
    inTitle.weak.length * WEAK_WEIGHT +
    BODY_FACTOR * (bodyStrong.length * STRONG_WEIGHT + bodyWeak.length * WEAK_WEIGHT);

  return {
    score: Math.min(1, weight / SATURATION),
    matches: [...new Set([...inTitle.strong, ...inTitle.weak, ...bodyStrong, ...bodyWeak])]
  };
}

export function isAiRelevant(title: string, body = ""): boolean {
  return aiRelevance(title, body).score >= MIN_RELEVANCE;
}
