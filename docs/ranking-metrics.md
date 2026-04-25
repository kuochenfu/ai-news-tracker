# Top 10 Ranking Metrics

This project ranks each source independently. A "Top 10" list means the ten highest-scoring candidates inside that single source, not a cross-source global popularity ranking.

Scores are normalized to `0.0 - 1.0` before sorting. The UI intentionally hides raw scores and shows only rank, title link, and a short preview.

## Shared AI Keyword Signal

Several source scores use an AI keyword match signal. The current keyword set includes terms such as:

- `ai`, `人工智慧`, `生成式`
- `agent`, `agentic`, `llm`, `大模型`, `模型`
- `openai`, `anthropic`, `claude`, `gemini`, `deepseek`
- `inference`, `推論`, `multimodal`, `多模態`
- `vector`, `向量`, `mcp`
- `coding`, `code`, `developer`, `開發`
- `robot`, `機器人`
- `chip`, `semiconductor`, `gpu`, `nvidia`, `晶片`, `半導體`

The keyword score increases when more of these terms appear in the title, summary, URL, description, or topics available for that source.

## Hacker News

Source: official Hacker News Firebase API.

Candidate pool:

- `topstories`
- `newstories`
- `beststories`
- Story details from `item/<id>.json`
- Only stories matching AI-related terms are retained.

Ranking formula:

```text
HN source score =
  0.35 * points signal
+ 0.30 * comment signal
+ 0.20 * recency signal
+ 0.15 * AI keyword signal
```

Signals:

- Points signal: log-scaled HN score.
- Comment signal: log-scaled comment count.
- Recency signal: exponential decay by story age with a short half-life.
- AI keyword signal: keyword matches in title, text, and URL.

## GitHub

Source: GitHub Search API.

Candidate pool:

- Searches the configured AI queries.
- Requires `stars:>50`.
- Deduplicates repositories by GitHub repository id.

Ranking formula:

```text
GitHub source score =
  0.35 * star adoption signal
+ 0.20 * fork signal
+ 0.20 * update recency signal
+ 0.15 * AI keyword signal
+ 0.10 * repository novelty signal
```

Signals:

- Star adoption signal: log-scaled `stargazers_count`.
- Fork signal: log-scaled `forks_count`.
- Update recency signal: recent `pushed_at` ranks higher.
- AI keyword signal: keyword matches in repo name, description, and topics.
- Repository novelty signal: newer `created_at` receives a modest boost.

## RSS Media Sources

Sources:

- The Verge
- TechCrunch
- MIT Technology Review
- 36Kr
- iThome
- TechNews
- The Next Web

Candidate pool:

- Public RSS feed items from each source.
- Only feeds that are reachable from the scheduled GitHub Actions environment are included.

Ranking formula:

```text
RSS source score =
  0.50 * AI keyword signal
+ 0.30 * recency signal
+ 0.20 * feed position signal
```

Signals:

- AI keyword signal: keyword matches in title and description/summary.
- Recency signal: newer publication dates rank higher.
- Feed position signal: preserves some of the publisher's feed ordering, but it is no longer the only ranking input.

## Current Limitations

- RSS feeds do not expose page views, social shares, or comment counts, so media ranking uses content relevance and recency rather than audience engagement.
- GitHub star growth is approximated from current repository stats. True growth rate would require historical snapshots over multiple refreshes.
- HN ranking uses public story metadata only. It does not analyze comment quality yet.
- Entity clustering across sources is not active yet, so the same topic can appear separately in different source lists.
