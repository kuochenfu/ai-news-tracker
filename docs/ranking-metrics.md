# Ranking Metrics

Every source is ranked independently. The pipeline lives in `src/pipeline/`:
collectors → per-source dedupe → AI relevance gate → source score → percentile → Top 10 → cross-source linking → history.

Three scores are stored per item and are never combined into one "trend score":

| Field | Meaning | Comparable across sources? |
| --- | --- | --- |
| `scores.relevance` | Is the item about AI (0–1)? `null` for sources that are AI-only by construction. | Yes |
| `scores.source` | The source's own ranking score (0–1). | No |
| `scores.percentile` | Rank within the source's relevance-filtered candidate pool (best = 1). | Yes. Mixed lists and intensity colours use this. |

## AI relevance (`src/pipeline/relevance.ts`)

- English terms match as whole words, so `ai` never matches "said". CJK terms match as phrases.
- Strong terms (AI, LLM, OpenAI, 大模型, 人工智慧, …) weigh 1. Weak terms (model, chip, GPU, 晶片, 模型, …) weigh 0.4. Body matches count at half weight.
- Score = weight / 2, capped at 1. The threshold is **0.5**: one strong term in the title passes, while a lone weak term does not.
- The gate applies to HN, GitHub search, and all media RSS. Official blogs, arXiv (category-filtered), GitHub releases, Hugging Face, npm, and PyPI (curated lists) skip it.
- A source shows fewer than 10 items rather than padding with off-topic ones.
- Accuracy is checked against 52 hand-labelled titles in `test/fixtures/relevance-labels.ts`. The test requires precision ≥ 0.95 and recall ≥ 0.90. Add examples there when the filter misjudges something.

## Source scores (`sourceScore` in `src/pipeline/ranking.ts`)

Freshness is exponential decay with the stated half-life. Items with no usable date get zero freshness instead of being treated as new.

| Source | Score |
| --- | --- |
| Hacker News | 0.35 log(points) + 0.30 log(comments) + 0.20 freshness (1 day) + 0.15 relevance |
| GitHub search | 0.35 log(stars) + 0.20 log(forks) + 0.20 push freshness (14 d) + 0.15 relevance + 0.10 repo novelty (180 d) |
| Official blogs, arXiv | 0.70 freshness (7 d) + 0.30 feed position |
| GitHub releases | 0.80 freshness (7 d) + 0.20 stable-release bonus |
| Hugging Face | 0.60 log(trending score) + 0.25 log(likes) + 0.15 freshness (30 d) |
| npm, PyPI | 0.60 log(weekly downloads) + 0.40 release freshness (30 d) |
| Media RSS | 0.50 relevance + 0.35 freshness (2 d) + 0.15 feed position |

## Mixed lists and the Daily (`selectDaily`)

- Lists that mix sources sort by percentile, then rank, then tier, then recency. Raw source scores only break ties within one source.
- Daily score = 0.6 × percentile + 0.3 × freshness (1.5 d) + 0.1 if another source carries the same entity.
- Quotas: at least 3 items per tier, then one per source until 10 picks, then the best of the rest with at most 2 per source. One item per entity, and no stale items.

## Real metrics and history (`src/pipeline/history.ts`)

- Metrics are the sources' own numbers: HN points, GitHub stars, Hugging Face likes, and npm / PyPI weekly downloads.
- History lives on the `data` branch (`observations.json`, `latest.json`). CI force-pushes one squashed commit per refresh, and entries are kept for 90 days.
- **Change** compares a metric against the oldest observation of the same metric from 6 hours to 7 days ago. With no such observation it is unknown (`null`) and the UI shows nothing.
- **First seen** is when the entity first appeared in history. When there is no history at all, `seenBefore` is `null` (unknown), not "new".

## Entity identity (`src/pipeline/entity.ts`)

Keys are tried from most to least specific: `release:owner/repo@tag`, `npm:` / `pypi:` package, `repo:owner/repo` (from any source's URL), `arxiv:id` (version-less), `hf:owner/model`, then the canonical URL, then a title slug that keeps CJK text. Items sharing any key across sources are one entity, which drives "另見".

Known limit: two outlets covering the same event at different URLs with different headlines are not merged; that needs fuzzy title matching.

## Failure handling (`src/pipeline/build.ts`, `http.ts`)

- Every request has a timeout and up to 2 retries on network errors, timeouts, 408, 429, and 5xx.
- A source with no candidates is **failed**. Its last good items are shown for up to 3 days, marked **stale**, and `lastSync` keeps the last fresh time.
- Sources that fan out many requests (HN, npm, …) count as **degraded** when more than 20% of requests fail. Single-request sources are degraded on any error.
- If fewer than 10 sources return fresh data, the refresh exits non-zero. Nothing is published, and the site keeps its last issue, whose next-issue time then shows as overdue.
