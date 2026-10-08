import type { Region } from "../domain";
import type { Candidate } from "./types";

/**
 * Origin: the organisation an item comes from. Items with the same origin
 * (a lab's announcement, its GitHub release, its npm package) echo one another
 * and never count as independent corroboration.
 */

interface Org {
  label: string;
  region: Region;
}

export const ORGS: Record<string, Org> = {
  openai: { label: "OpenAI", region: "us" },
  anthropic: { label: "Anthropic", region: "us" },
  google: { label: "Google", region: "us" },
  meta: { label: "Meta", region: "us" },
  microsoft: { label: "Microsoft", region: "us" },
  nvidia: { label: "NVIDIA", region: "us" },
  mistral: { label: "Mistral AI", region: "europe" },
  qwen: { label: "Qwen", region: "china" },
  deepseek: { label: "DeepSeek", region: "china" },
  moonshot: { label: "Moonshot AI", region: "china" },
  zhipu: { label: "Zhipu AI", region: "china" },
  huggingface: { label: "Hugging Face", region: "us" },
  vercel: { label: "Vercel", region: "us" },
  langchain: { label: "LangChain", region: "us" },
  llamaindex: { label: "LlamaIndex", region: "us" },
  modelcontextprotocol: { label: "Model Context Protocol", region: "us" },
  ollama: { label: "Ollama", region: "us" },
  chroma: { label: "Chroma", region: "us" },
  crewai: { label: "CrewAI", region: "us" },
  berriai: { label: "LiteLLM", region: "us" },
  vllm: { label: "vLLM", region: "us" },
  ggml: { label: "ggml", region: "europe" },
  nstc: { label: "國科會", region: "taiwan" },
  "european-commission": { label: "歐盟執委會", region: "europe" }
};

/** GitHub owners, Hugging Face owners, and package scopes that belong to a known organisation. */
const ALIASES: Record<string, string> = {
  openai: "openai",
  anthropics: "anthropic",
  "anthropic-ai": "anthropic",
  anthropic: "anthropic",
  google: "google",
  "google-gemini": "google",
  "google-deepmind": "google",
  googleapis: "google",
  "facebookresearch": "meta",
  "meta-llama": "meta",
  microsoft: "microsoft",
  nvidia: "nvidia",
  mistralai: "mistral",
  qwen: "qwen",
  qwenlm: "qwen",
  "deepseek-ai": "deepseek",
  moonshotai: "moonshot",
  thudm: "zhipu",
  "zai-org": "zhipu",
  huggingface: "huggingface",
  vercel: "vercel",
  "ai-sdk": "vercel",
  "langchain-ai": "langchain",
  langchain: "langchain",
  "run-llama": "llamaindex",
  modelcontextprotocol: "modelcontextprotocol",
  ollama: "ollama",
  "chroma-core": "chroma",
  crewaiinc: "crewai",
  berriai: "berriai",
  "vllm-project": "vllm",
  "ggml-org": "ggml",
  "abetlen": "ggml"
};

/** Unscoped package names whose publisher is known. */
const PACKAGES: Record<string, string> = {
  openai: "openai",
  anthropic: "anthropic",
  ai: "vercel",
  langchain: "langchain",
  llamaindex: "llamaindex",
  "llama-index": "llamaindex",
  ollama: "ollama",
  chromadb: "chroma",
  transformers: "huggingface",
  litellm: "berriai",
  crewai: "crewai",
  "autogen-agentchat": "microsoft",
  vllm: "vllm",
  mcp: "modelcontextprotocol",
  "llama-cpp-python": "ggml"
};

function alias(owner: string | undefined | null): string | null {
  return owner ? ALIASES[owner.toLowerCase()] ?? null : null;
}

/** Origin key for a candidate, or null when the item is a report about someone else (media, community, search results). */
export function originOf(candidate: Candidate): string | null {
  if (candidate.origin) return candidate.origin;
  switch (candidate.source) {
    case "github_releases":
    case "github":
      return candidate.repoFullName ? alias(candidate.repoFullName.split("/")[0]) ?? `gh:${candidate.repoFullName.split("/")[0].toLowerCase()}` : null;
    case "hugging_face":
      return alias(candidate.externalId.split("/")[0]) ?? `hf:${candidate.externalId.split("/")[0].toLowerCase()}`;
    case "npm":
    case "pypi": {
      const name = candidate.packageName?.toLowerCase() ?? "";
      if (name.startsWith("@")) return alias(name.slice(1).split("/")[0]);
      return PACKAGES[name] ?? (candidate.repoFullName ? alias(candidate.repoFullName.split("/")[0]) : null);
    }
    default:
      return null;
  }
}

export function orgLabel(origin: string | null): string | null {
  if (!origin) return null;
  return ORGS[origin]?.label ?? origin.replace(/^(gh|hf):/, "");
}

export function orgRegion(origin: string | null): Region | null {
  return origin ? ORGS[origin]?.region ?? null : null;
}
