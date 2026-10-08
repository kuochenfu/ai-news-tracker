# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The owner, reading alone. They open the site about twice a day, after the 08:00 and 16:00 Asia/Taipei refreshes, to quickly scan what is new in AI. It is a personal intelligence dashboard and is not meant for a team or the public. The UI is in Traditional Chinese. Content titles mix English and Chinese.

## Product Purpose

The site answers one question first: **what new things appeared today?** Each refresh collects AI signals from first-party sources, research, developer platforms, community discussion, and tech media, then condenses them into a snapshot. A visit succeeds when the owner knows within a few minutes what is worth following up on today, and can click through to the original source.

## Positioning

The site separates signals by **source tier**, so origin and validation stay apart:
- Tier 1 is first-party origin: official blogs, arXiv, GitHub Releases.
- Tier 2 is community and adoption: HN, GitHub, Hugging Face, npm, PyPI.
- Tier 3 is media validation: tech media RSS.

Media coverage confirms a signal but does not originate it. Every source is ranked independently, and there is no global popularity ranking.

## Operating Context

- Static site (Next.js static export) on GitHub Pages under the `/ai-news-tracker` base path. No backend.
- Data comes from `src/generated/snapshot.json`, which `scripts/refresh-data.ts` produces twice a day.
- Routes: `/` (home), `/daily/` (daily report, 15 picks), `/trends/` (per-source Top 10), `/sources/` (source health).

## Capabilities and Constraints

- 21 sources (`src/sources.ts`), each with a tier, a publisher region, a data role (official / research / media / community / platform), and a signal role.
- Regional balance means not missing events when a source fails, not equal counts. There are no regional quotas. Coverage and single points of failure are shown per region on `/sources/`.
- Corroboration counts only independent voices. A lab's own release and package are echoes.
- Each item has a title, a summary, an original link, a source, and three separate scores: AI relevance, the source's own ranking score, and its percentile within that source. There is no cross-source "trend score" and no verdict.
- Real metrics only: HN points, GitHub stars, Hugging Face likes, npm and PyPI weekly downloads. Growth and "first seen" come from stored history (the `data` branch). Without history they are shown as unknown, never estimated.
- Media and community sources must pass an AI relevance threshold. A source shows fewer than 10 items rather than padding with off-topic ones.
- A failed source shows its last good items for up to 3 days, marked stale. Publishing requires at least 10 sources with fresh data.
- Every source must appear on every page. A source with no data gets an explicit empty state and is never hidden.
- Must support system dark mode.
- Detail links can go stale between snapshots. The 404 page redirects to `/trends/`.

## Evidence on Hand

The real snapshot data is in `src/generated/snapshot.json`. There are no users, testimonials, or external metrics, and none should be invented.

## Product Principles

1. "What's new today" comes first. Per-source browsing is the second layer.
2. Scanning speed beats decoration. Density is fine as long as it stays clear.
3. Origin, discussion, and validation stay visibly separate. Tier is core information, not a footnote.
4. Every title links to the original. The site points readers onward and does not replace the source.
