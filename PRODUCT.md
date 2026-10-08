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

- 15 sources (`src/sources.ts`), each with a tier, a type (first_party / community / platform / media), and a signal role (origin / early_discussion / adoption / validation).
- Each trend has a title, a summary, an original link, a source, and a score breakdown with a verdict (high-confidence / watchlist / emerging / likely-hype).
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
