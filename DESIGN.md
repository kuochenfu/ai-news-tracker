---
name: AI 訊號觀測
description: A twice-daily AI signal bulletin, read like a weather observation sheet.
colors:
  navy-shell: "#0b2a4a"
  shell-ink: "#f2f6fa"
  shell-ink-muted: "#a9bdd3"
  shell-rule: "#1f4268"
  paper-ground: "#eef2f6"
  sheet-white: "#ffffff"
  row-wash: "#f6f8fb"
  bulletin-ink: "#0f1c2b"
  ink-secondary: "#41526a"
  ink-tertiary: "#66768c"
  hairline-rule: "#d9e0e8"
  strong-rule: "#b9c4d1"
  link-navy: "#0b2a4a"
  selection-blue: "#cfe2fb"
  night-ground: "#07111c"
  night-sheet: "#0d1a28"
  night-row-wash: "#112133"
  night-shell: "#0e2b49"
  night-ink: "#e5edf5"
  night-ink-secondary: "#a8b8ca"
  night-ink-tertiary: "#8394a8"
  night-hairline-rule: "#1c2e42"
  night-strong-rule: "#2b4360"
  night-link: "#d6e4f3"
  night-selection: "#1d4a7a"
  intensity-0-drizzle: "#c6e6fb"
  intensity-0-night: "#24435c"
  intensity-1-light-blue: "#5fb2ee"
  intensity-2-blue: "#1f8fd6"
  intensity-3-green: "#39a852"
  intensity-4-yellow: "#f0cf2e"
  intensity-5-orange: "#f28c22"
  intensity-6-red: "#dc3a26"
  intensity-7-magenta: "#b02280"
  intensity-8-purple: "#6e2db8"
typography:
  title:
    fontFamily: "Public Sans, Noto Sans TC, PingFang TC, Microsoft JhengHei, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: "1.75rem"
    letterSpacing: "-0.025em"
    fontFeature: "\"tnum\" 1"
  headline:
    fontFamily: "Public Sans, Noto Sans TC, PingFang TC, Microsoft JhengHei, sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: "1.5rem"
    fontFeature: "\"tnum\" 1"
  body:
    fontFamily: "Public Sans, Noto Sans TC, PingFang TC, Microsoft JhengHei, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: "1.35rem"
    fontFeature: "\"tnum\" 1"
  label:
    fontFamily: "Public Sans, Noto Sans TC, PingFang TC, Microsoft JhengHei, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: "1.1rem"
    fontFeature: "\"tnum\" 1"
  tag:
    fontFamily: "Public Sans, Noto Sans TC, PingFang TC, Microsoft JhengHei, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: "1rem"
rounded:
  cell: "1px"
  swatch: "2px"
  control: "3px"
  sheet: "4px"
spacing:
  hairline: "2px"
  xs: "4px"
  sm: "8px"
  row-x: "12px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  bulletin-bar:
    backgroundColor: "{colors.navy-shell}"
    textColor: "{colors.shell-ink}"
  nav-link:
    textColor: "{colors.shell-ink-muted}"
    typography: "{typography.body}"
    padding: "10px 12px"
  nav-link-active:
    textColor: "{colors.shell-ink}"
  sheet:
    backgroundColor: "{colors.sheet-white}"
    rounded: "{rounded.sheet}"
  signal-row:
    padding: "10px 16px"
    typography: "{typography.body}"
  signal-row-hover:
    backgroundColor: "{colors.row-wash}"
  filter-tab:
    textColor: "{colors.ink-secondary}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "4px 10px"
  filter-tab-hover:
    backgroundColor: "{colors.row-wash}"
    textColor: "{colors.bulletin-ink}"
  filter-tab-active:
    backgroundColor: "{colors.navy-shell}"
    textColor: "{colors.shell-ink}"
  tier-tag:
    textColor: "{colors.ink-secondary}"
    typography: "{typography.tag}"
    rounded: "{rounded.control}"
    padding: "0 4px"
  intensity-chip:
    rounded: "{rounded.swatch}"
    size: "12px"
  strip-cell:
    rounded: "{rounded.cell}"
    width: "8px"
    height: "14px"
  strip-readout:
    backgroundColor: "{colors.navy-shell}"
    textColor: "{colors.shell-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "6px 8px"
  button-primary:
    backgroundColor: "{colors.navy-shell}"
    textColor: "{colors.shell-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
---

# Design System: AI 訊號觀測

## Overview

**Creative North Star: "The Issued Bulletin"**

Every refresh is a weather bulletin issued at a fixed time. A navy bulletin bar carries the issue time, the next issue, the station count and the intensity legend. Under it, sources are observation stations grouped by tier, and every signal is read off one rainfall-intensity scale borrowed from the Central Weather Administration's accumulated-rainfall legend. The value it encodes is the item's percentile within its own source, so a colour means the same thing at every station. The page is dense, quiet and tabular: one reader, scanning twice a day.

Color does exactly one job. The paper, ink and navy shell are nearly monochrome so the nine-step intensity progression (pale blue through blue, green, yellow, orange, red, magenta, purple) is the only chroma on the screen, and it always means within-source percentile. Rank, status and emphasis are carried by weight, case, underline and icon, never by hue.

Night mode is a deep night-blue ground with the navy shell held above it as a lighter band, so the bulletin bar keeps its identity after dark.

**Key Characteristics:**
- Navy bulletin bar over cool paper; navy shell above a night ground in dark mode.
- One chromatic system, the CWA intensity scale, reserved for intensity.
- Two faces only (Public Sans, Noto Sans TC), tabular numerals everywhere.
- Rank by weight on a three-step size ramp, not by size jumps.
- Fixed columns and the same scale across every station block.
- Flat sheets with hairline rules; the only shadow belongs to the floating strip readout.

## Colors

A near-monochrome navy-and-paper frame that hands all of its chroma to a single meteorological intensity scale.

### Primary
- **Bulletin Navy** (navy-shell): the bulletin bar, the active filter tab, the strip readout and the primary button. In light mode it is also the link color (link-navy), so links read as part of the bulletin, not as a separate accent.

### Secondary
- **The CWA Intensity Scale** (intensity-0 through intensity-8): nine bands with lower thresholds at <20, 20, 30, 40, 50, 60, 70, 80, 90 on the 0-100 within-source percentile. It colors the intensity chip in each signal row, the cells of each station strip, and the legend in the bulletin bar. Only band 0 changes in dark mode (intensity-0-night), so the faintest band stays visible on the night sheet; bands 1-8 are identical in both modes.

### Neutral
- **Cool Paper** (paper-ground): the page ground in light mode; sheets sit on it.
- **Sheet White** (sheet-white): panels, feeds and tables.
- **Row Wash** (row-wash): row hover, table header bands, error blocks, inactive tab hover.
- **Bulletin Ink** (bulletin-ink): titles and primary text. **Ink Secondary** (ink-secondary): station names, descriptions, inactive tabs. **Ink Tertiary** (ink-tertiary): timestamps, counts, helper lines.
- **Hairline Rule** (hairline-rule) divides rows and outlines sheets; **Strong Rule** (strong-rule) outlines tier tags, empty strip cells (dashed) and error blocks.
- **Shell Ink / Shell Ink Muted / Shell Rule**: text and dividers inside the navy bar; muted for labels (發布, 下次, 台北時間), full for values.
- **Selection Blue** (selection-blue / night-selection): text selection only.
- **Night set** (night-ground, night-sheet, night-row-wash, night-ink family, night rules, night-link): the same roles under `prefers-color-scheme: dark` or `data-theme="dark"`.

### Named Rules
**The Intensity-Only Rule.** The CWA scale (`--i0` to `--i8`) is reserved for signal intensity. Status, links and warnings use ink or shell tones with an icon, a weight change or an underline. The status aliases (`--ok`, `--warn`, `--fault`) resolve to ink tones on purpose; never give them a hue. A degraded station is bold ink with a dotted underline; an overdue issue is a struck-through time plus an inverted shell-ink label.

**The Shell Above Night Rule.** In dark mode the shell stays navy (night-shell) and sits visibly above the night ground (night-ground). Never flatten the bar into the ground or turn it black.

## Typography

**Display Font:** none; the system has no display face.
**Body Font:** Public Sans (Latin) with Noto Sans TC (Traditional Chinese, 400/500/700), falling back to PingFang TC, Microsoft JhengHei, sans-serif.
**Label/Mono Font:** same faces; numerals use tabular figures (`"tnum" 1` on body, plus the `num` class on every time, count and value).

**Character:** a plain civic sans pairing that reads like printed government data. Weight does the ranking; size barely moves.

### Hierarchy
- **Title** (700, 1.25rem, 1.75rem, tight tracking): one page heading per view (過去 24 小時新出現, 日報, 各站排行, 觀測站狀態).
- **Headline** (700, 1rem, 1.5rem): the product name in the bar, section and station headings.
- **Body** (400 to 600, 0.875rem, 1.35rem): signal titles (600), station names, nav links (600), empty states.
- **Label** (400 to 700, 0.75rem, 1.1rem): metadata lines, timestamps, the issue line, filter tabs (600), table headers (600), tier group headings.
- **Tag** (600 with a 400 suffix, 11px, 1rem): the tier tag only. The 10px legend threshold numerals are a legend-only size.

### Named Rules
**The Weight Not Size Rule.** Rank is carried by weight (400 / 500 / 600 / 700) across the three working sizes (label, body, headline). Do not add a larger step to make something important; make it bolder.

**The Tabular Rule.** Every number that can change between issues (times, counts, intensity values, ranks) is tabular so columns hold still across bulletins.

## Layout

A centered container (max 1280px) with 16 / 24 / 32px side padding at base / sm / lg. The bulletin bar runs full width: a top row with product name and nav, then a hairline-divided issue line that wraps on small screens and pushes the legend right from sm up.

Pages use a two-column grid from lg (1024px): today's view puts the feed left and a 300px station rail right, sticky at 24px from the top; the per-station view puts a 260px sticky, scrollable rail left. Below lg the rail stacks or is replaced by a horizontal jump bar of station chips. Column gaps are 24px, 32px from lg.

Rows inside sheets use 12px horizontal padding (16px from sm) and 10px vertical. Tables (station status, daily coverage) define one fixed `grid-template-columns` string per table, shared by the header band and every row, appearing from md (768px); below md each row collapses to two columns with the station name spanning both.

**The Fixed Columns Rule.** Every station block uses identical columns and the same intensity scale. A new table defines its column string once and applies it to header and rows alike.

## Elevation & Depth

Flat. Depth comes from tonal layering (paper ground, white sheet, row-wash bands) and hairline rules, not shadows. The single shadow in the system belongs to the floating strip readout, because it hovers above content.

### Shadow Vocabulary
- **Readout lift** (`box-shadow: 0 4px 12px rgba(4,12,21,0.25)`): the station-strip readout tooltip only.

**The Flat Sheet Rule.** Sheets, rows, tabs and buttons carry no shadow. Separation is a 1px rule or a tone step.

## Shapes

Small, nearly square corners on a strict four-step scale: 1px for strip cells, 2px for intensity swatches and the strip group, 3px for controls (tabs, tags, buttons, readout, error blocks, jump chips), 4px for sheets. Borders are 1px hairlines; empty states and empty strip cells use dashed strong rules. The nav marks the current page with a 2px bottom bar in shell ink.

## Components

### Buttons
- **Shape:** control corners (3px).
- **Primary:** navy shell fill with shell ink, body size, semibold, 8px 16px. Used for the single forward action on the not-found page.
- **Hover / Focus:** no underline on hover; focus shows the global 2px link-color outline at 2px offset.

### Filter Tabs (Chips)
- **Style:** label size, semibold, 4px 10px, control corners, no border, each followed by a tabular count at weight 400.
- **State:** inactive is ink-secondary on the sheet, hover washes to row-wash with full ink; active (`aria-pressed`) inverts to navy shell with shell ink and a muted count. Empty tiers disable at 40% opacity. Colors transition over 150ms. Counts re-tally in place when filtering.

### Cards / Containers (Sheets)
- **Corner Style:** sheet corners (4px).
- **Background:** sheet white on paper ground (night-sheet on night-ground).
- **Shadow Strategy:** none (see Elevation).
- **Border:** 1px hairline rule; rows inside divided by hairlines.
- **Internal Padding:** 12px for the rail sheet; rows carry their own padding.

### Navigation
- **Style:** four links in the bulletin bar (今日 / 日報 / 各站排行 / 觀測站), body size, semibold, 10px 12px. Inactive is shell-ink-muted, hover and current are shell ink, current adds a 2px shell-ink bottom bar and `aria-current="page"`. On narrow screens the nav scrolls horizontally under the product name.

### Links
- Plain links inherit ink and underline on hover (1px, 3px offset). Standalone action links (`link`) are link-navy (night-link in dark) and always underlined. Links never take an intensity color.

### Signal Row
The core observation line: optional tabular rank, the intensity chip (12px swatch with a 10% inset ring, then the tabular value), the title as a two-line-clamped semibold link to the original, and a label-size metadata line of station name, tier tag, the source's real metric with its measured change (only when an earlier observation exists), and publish time ("日期不明" when the source gave none). History flags close the line: 首次觀測 is an inverted shell chip; 另見 (other sources carrying the same entity) and 舊資料 (carried over from the last good refresh) are dashed-outline chips. Hover washes the row.

### Tier Tag
A 3px-cornered outline in strong rule: "T1" in semibold followed by the short tier name at 400, 11px, ink-secondary. It is the only tier marker; tiers never get color.

### Station Intensity Strip (signature)
Ten 8 by 14px cells with 2px gaps, one per rank in a station's Top 10, filled by intensity band; missing ranks are dashed strong-rule outlines. Hovering, tapping or arrowing through the focused strip dims the other cells to 55% and lifts the active cell (scaleY 1.45 from the bottom, 160ms, `cubic-bezier(0.16, 1, 0.3, 1)`, disabled under reduced motion), and a navy readout floats above it with "#rank · 百分位 value" and the item title. The strip is a labeled group announcing its ranked count.

### Region Coverage Table
The first section of `/sources/` has one row per region. It shows regional publishers per role as `healthy/total`, 7-day picks by role, 7- and 30-day totals, and a dependency cell. The dependency cell reads "單點：<roles>" in bold ink with a dotted underline, "無在地來源" in bold, or "有備援" in ink-3. On mobile it collapses to a two-column grid with inline labels. Like status, it uses no intensity colours.

### Intensity Legend
Nine 10px-high swatches with the lower threshold printed below in 10px tabular shell-ink-muted, bracketed by 弱 and 強. It lives in the bulletin bar's issue line on every page.

## Do's and Don'ts

### Do:
- **Do** reserve `--i0` to `--i8` for signal intensity: chips, strip cells, the legend.
- **Do** mark status with ink weight, dotted underline, strike-through or an SVG icon (check, alert triangle, circle-off) in ink tones.
- **Do** keep the dark shell navy (night-shell) and visibly lighter than the night ground.
- **Do** use tabular numerals for every time, count, rank and value.
- **Do** rank with weight across the label / body / headline sizes before reaching for a bigger size.
- **Do** share one column template between a table's header band and its rows.
- **Do** keep sheets flat: 1px hairline rule, 4px corners, no shadow.

### Don't:
- **Don't** color a link, status, warning or error with any intensity band, red included.
- **Don't** introduce a second accent hue or a semantic green/amber/red set.
- **Don't** turn the dark-mode bulletin bar black or match it to the ground.
- **Don't** add faces beyond Public Sans and Noto Sans TC.
- **Don't** add shadows to sheets, rows or controls; the readout lift is the only one.
- **Don't** give tiers their own colors; the tier tag is outline and weight only.
