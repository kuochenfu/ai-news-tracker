import { createHash } from "node:crypto";

import type { Candidate } from "./types";

/**
 * Entity identity, ported from the former Python ingestion layer with two fixes:
 * GitHub, arXiv, and Hugging Face links are recognised from any source (an HN
 * story linking a repo now joins that repo), and title slugs keep CJK text.
 */

const GITHUB_RE = /github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)/i;
const ARXIV_RE = /arxiv\.org\/(?:abs|pdf|html)\/(\d{4}\.\d{4,5})(?:v\d+)?/i;
const HF_RE = /huggingface\.co\/(?!blog\/|papers\/|spaces\/|datasets\/|docs\/)([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)/i;
const NOT_REPO_OWNERS = new Set(["orgs", "topics", "sponsors", "features", "about", "settings", "marketplace"]);
const TRACKING_PARAMS = /^(utm_|ref$|ref_src$|source$|fbclid$|gclid$|f$|mc_)/i;

export function normalizeText(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase().split(/\s+/).filter(Boolean).join(" ");
}

export function normalizeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url.trim());
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    const path = parsed.pathname.replace(/\/+$/, "").toLowerCase();
    const params = [...parsed.searchParams.entries()]
      .filter(([key]) => !TRACKING_PARAMS.test(key))
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join("&");
    return `${host}${path}${params ? `?${params}` : ""}`;
  } catch {
    return null;
  }
}

export function extractGithubRepo(value: string | null | undefined): string | null {
  const match = value?.match(GITHUB_RE);
  if (!match || NOT_REPO_OWNERS.has(match[1].toLowerCase())) return null;
  return `${match[1]}/${match[2].replace(/\.git$/i, "")}`.toLowerCase();
}

export function extractArxivId(value: string | null | undefined): string | null {
  return value?.match(ARXIV_RE)?.[1] ?? null;
}

export function extractHuggingFaceModel(value: string | null | undefined): string | null {
  return value?.match(HF_RE)?.[1]?.toLowerCase() ?? null;
}

export function titleSlug(title: string | null | undefined, maxWords = 12): string {
  return normalizeText(title)
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .slice(0, maxWords)
    .join("-");
}

/**
 * Identity keys for a candidate, most specific first. The first key is the
 * item's own identity (used for history); any shared key links items across
 * sources as one entity.
 */
export function entityKeys(candidate: Candidate): string[] {
  const keys: string[] = [];
  const { source, url } = candidate;

  const repo = candidate.repoFullName?.toLowerCase() ?? extractGithubRepo(url);
  const arxivId = source === "arxiv" ? extractArxivId(url) ?? extractArxivId(candidate.externalId) : extractArxivId(url);
  const hfModel = source === "hugging_face" ? candidate.externalId.toLowerCase() : extractHuggingFaceModel(url);

  if (source === "github_releases" && repo && candidate.releaseTag) keys.push(`release:${repo}@${candidate.releaseTag.toLowerCase()}`);
  if ((source === "npm" || source === "pypi") && candidate.packageName) keys.push(`${source}:${candidate.packageName.toLowerCase()}`);
  if (repo) keys.push(`repo:${repo}`);
  if (arxivId) keys.push(`arxiv:${arxivId}`);
  if (hfModel) keys.push(`hf:${hfModel}`);

  const normalized = normalizeUrl(url);
  if (normalized && !repo && !arxivId && !hfModel) keys.push(`url:${normalized}`);

  if (keys.length === 0) {
    const slug = titleSlug(candidate.title);
    keys.push(slug ? `topic:${slug}` : `event:${source}:${candidate.externalId}`);
  }
  return keys;
}

/** Hash of source + title + url, for spotting the same item served twice by one feed. */
export function contentHash(candidate: Pick<Candidate, "source" | "title" | "url">): string {
  return createHash("sha256")
    .update([candidate.source, normalizeText(candidate.title), normalizeText(candidate.url)].join("|"))
    .digest("hex");
}

/** Drops repeated items within one source: same identity key or same content hash. */
export function dedupeWithinSource(candidates: Candidate[]): Candidate[] {
  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    const identity = [entityKeys(candidate)[0], contentHash(candidate)];
    if (identity.some((key) => seen.has(key))) return false;
    identity.forEach((key) => seen.add(key));
    return true;
  });
}

/** Groups items that share any identity key (union-find over keys). Returns item index groups. */
export function clusterByKeys(keysPerItem: string[][]): number[][] {
  const parent = keysPerItem.map((_, index) => index);
  const find = (index: number): number => (parent[index] === index ? index : (parent[index] = find(parent[index])));
  const owner = new Map<string, number>();

  keysPerItem.forEach((keys, index) => {
    for (const key of keys) {
      const existing = owner.get(key);
      if (existing === undefined) owner.set(key, index);
      else parent[find(index)] = find(existing);
    }
  });

  const groups = new Map<number, number[]>();
  keysPerItem.forEach((_, index) => {
    const root = find(index);
    groups.set(root, [...(groups.get(root) ?? []), index]);
  });
  return [...groups.values()];
}
