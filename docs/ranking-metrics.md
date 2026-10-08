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
- The gate applies to HN, GitHub search, all media RSS, and the government feeds (國科會, 歐盟). Government feeds are judged on the **title only**, because their press releases mention AI in passing. AI lab announcements, arXiv (category-filtered), GitHub releases, Hugging Face, npm, and PyPI (curated lists) skip the gate.
- The vocabulary covers English, Traditional and Simplified Chinese, Japanese, and Korean.
- A source shows fewer than 10 items rather than padding with off-topic ones.
- Accuracy is checked against hand-labelled titles in `test/fixtures/relevance-labels.ts`: 52 English and Chinese titles, plus 31 Japanese, Korean, Simplified Chinese, and government titles. Each set must reach precision ≥ 0.95 and recall ≥ 0.90. Add an example whenever the filter misjudges something.

## Source scores (`sourceScore` in `src/pipeline/ranking.ts`)

Freshness is exponential decay with the stated half-life. Items with no usable date get zero freshness instead of being treated as new.

| Source | Score |
| --- | --- |
| Hacker News | 0.35 log(points) + 0.30 log(comments) + 0.20 freshness (1 day) + 0.15 relevance |
| GitHub search | 0.35 log(stars) + 0.20 log(forks) + 0.20 push freshness (14 d) + 0.15 relevance + 0.10 repo novelty (180 d) |
| AI lab announcements, arXiv | 0.70 freshness (7 d) + 0.30 feed position |
| GitHub releases | 0.80 freshness (7 d) + 0.20 stable-release bonus |
| Hugging Face | 0.60 log(trending score) + 0.25 log(likes) + 0.15 freshness (30 d) |
| npm, PyPI | 0.60 log(weekly downloads) + 0.40 release freshness (30 d) |
| Media RSS | 0.50 relevance + 0.35 freshness (2 d) + 0.15 feed position |

## Mixed lists and the Daily (`selectDaily`)

- Lists that mix sources sort by percentile, then rank, then tier, then recency. Raw source scores only break ties within one source.
- Daily score = 0.6 × percentile + 0.3 × freshness (1.5 d) + 0.1 when an **independent** source carries the same entity (see Corroboration).
- Quotas: at least 3 items per tier, then one per source until 10 picks, then the best of the rest with at most 2 per source. One item per linked cluster, and no stale items.

## Real metrics and history (`src/pipeline/history.ts`)

- Metrics are the sources' own numbers: HN points, GitHub stars, Hugging Face likes, and npm / PyPI weekly downloads.
- History lives on the `data` branch (`observations.json`, `latest.json`). CI force-pushes one squashed commit per refresh, and entries are kept for 90 days.
- **Change** compares a metric against the oldest observation of the same metric from 6 hours to 7 days ago. With no such observation it is unknown (`null`) and the UI shows nothing.
- **First seen** is when the entity first appeared in history. When there is no history at all, `seenBefore` is `null` (unknown), not "new".

## Entity identity (`src/pipeline/entity.ts`)

Keys are tried from most to least specific: `release:owner/repo@tag`, `npm:` / `pypi:` package, `repo:owner/repo` (from any source's URL), `arxiv:id` (version-less), `hf:owner/model`, then the canonical URL, then a title slug that keeps CJK text. Items sharing any key across sources are one entity, which drives "另見".

Known limit: two outlets covering the same event at different URLs with different headlines are not merged; that needs fuzzy title matching.

## Origin and corroboration (`src/pipeline/origin.ts`, `build.ts`)

- **Origin** is the organisation an item comes from. It is known for lab feeds and government sources, and derived from the GitHub owner, Hugging Face owner, or package publisher via an alias table (for example `anthropics` → Anthropic, `@ai-sdk/*` → Vercel). Media and community items have no origin; their voice is the outlet itself.
- In a linked cluster, another item is **independent** when its voice (origin, or outlet if it has none) differs. A lab's announcement, its GitHub release, and its npm package are **same-origin echoes**: they are shown as 同源 and never count as confirmation. Several items from one voice count once.
- First-party items show their organisation as publisher, with that organisation's region. Other items show the outlet.

## Regions and coverage (`src/pipeline/regions.ts`, `coverage.ts`)

- **Publisher region** is where the publisher is based. Regional outlets use their source's region. Lab feeds use each lab's region. Platforms and arXiv are "global".
- **Event regions** are the places an item concerns, inferred from organisations, places, and institutions named in the title (the body only when the title names none). An item can have several or none. Generic words such as 政府 or 정부 count only for the publisher's own region. Tests are in `test/regions.test.ts`.
- **Coverage** (shown on `/sources/`), per region:
  - Availability: regional publishers per data role (official, research, media, community, platform), counting each publisher inside aggregated stations, and how many returned fresh data.
  - Picks: distinct linked clusters about the region that reached a Top 10 in the last 7 and 30 days, from stored history, with the 7-day count split by role.
  - Single point: a role with only one working publisher, or none.
- There is no regional quota. The goal is that important events are not missed because a source is down, not equal numbers per region.

## Failure handling (`src/pipeline/build.ts`, `http.ts`)

- Every request has a timeout and up to 2 retries on network errors, timeouts, 408, 429, and 5xx.
- Lab announcements aggregate several feeds plus Anthropic's news page, which is scraped because it has no feed. Each publisher's health is reported separately.
- A source with no candidates is **failed**. Its last good items are shown for up to 3 days, marked **stale**, and `lastSync` keeps the last fresh time.
- Sources that fan out many requests (HN, npm, …) count as **degraded** when more than 20% of requests fail. Single-request sources are degraded on any error.
- If fewer than two thirds of sources return fresh data (14 of 21), the refresh exits non-zero. Nothing is published, and the site keeps its last issue, whose next-issue time then shows as overdue.
