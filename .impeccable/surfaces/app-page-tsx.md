---
version: 1
slug: "app-page-tsx"
primary_target: "app/page.tsx"
related_targets: ["app/daily/page.tsx","app/trends/page.tsx","app/sources/page.tsx"]
---

# Surface brief: dashboard (/, /daily, /trends, /sources)

Scope: the whole static dashboard. Mode: Operate. The owner scans it alone twice a day, after the 08:00 and 16:00 Taipei refreshes. UI copy is in Traditional Chinese.

## Direction contract

THESIS: Each refresh is an issued weather bulletin: a fixed issue time, observation stations (the sources) grouped by tier, and signal strength read off a rainfall-intensity scale. This refuses the category default of a grey news list with one blue accent.

OWN-WORLD: The shell is a navy bulletin bar (#0b2a4a) over a cool paper ground; dark mode uses a deep night-blue ground. The CWA rainfall progression (light blue → blue → green → yellow → orange → red → magenta → purple) is reserved for signal intensity and nothing else. Public Sans and Noto Sans TC are the only faces, and numerals are tabular. Rank is carried by weight and case on a three-step scale. Every station block uses identical columns and scale.

STORY: The owner sees when this bulletin was issued and when the next one is due, sees which signals are new in the past 24 hours and how strong each is, narrows by tier, and clicks through to the original. The second layer is per-station Top 10 and station health.

FIRST VIEWPORT: The bulletin bar runs full width: product name, nav (今日 / 日報 / 各站排行 / 觀測站), and an issue line with the issue time, next issue, station count, and the intensity legend. The main column on the left lists "past 24 hours" rows (intensity chip and value, title link, station plus tier tag, publish time) with tier filter tabs above it. The right rail lists the 15 stations grouped by tier, each with its 10-cell intensity strip.

FORM: Weather observation bulletin, position 3 of the ordered list. Raises taken from the declined challengers: color only does one job (airport), weight instead of size (timetable), the same scale across blocks (botanical), fixed columns (split-flap). Seed key b68e48c2.

SIGNATURE: The station intensity strip, 10 cells per source colored by the rank 1–10 scores. Hovering a cell names that item. The tier filter re-counts in place.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
