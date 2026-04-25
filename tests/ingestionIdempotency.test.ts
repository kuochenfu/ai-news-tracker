import { describe, expect, it } from 'vitest';
import { buildContentHash } from '../src/core/dedup';
import { buildExternalId } from '../src/core/keys';
import { IngestionWriter, type SqlConnection, type SqlParams } from '../src/core/writer';

class FakeConnection implements SqlConnection {
  public readonly calls: Array<{ sql: string; params: SqlParams }> = [];
  public commits = 0;

  execute(sql: string, params: SqlParams): void {
    this.calls.push({ sql, params });
  }

  commit(): void {
    this.commits += 1;
  }
}

describe('idempotency helpers', () => {
  it('builds source-specific external ids', () => {
    expect(buildExternalId('hn', { item: { id: 123 } })).toBe('123');
    expect(buildExternalId('x', { tweet_id: 'abc' })).toBe('abc');
    expect(buildExternalId('github', { repo_full_name: 'openai/openai-python' }, new Date('2026-04-25'))).toBe(
      'openai/openai-python:2026-04-25'
    );
  });

  it('normalizes content hash', async () => {
    const first = await buildContentHash('Hello  World', 'https://example.com/X', 'HN');
    const second = await buildContentHash(' hello world ', 'https://example.com/x', 'hn');
    expect(first).toBe(second);
  });

  it('executes upsert statements and commits', async () => {
    const conn = new FakeConnection();
    const writer = new IngestionWriter(conn);

    const run = writer.startRun();

    writer.upsertRawEvent({
      source: 'hn',
      externalId: '1',
      contentHash: await buildContentHash('A', 'https://a', 'hn'),
      title: 'A',
      url: 'https://a',
      payloadJson: '{"id":1}',
      runId: run.runId
    });

    writer.upsertSourceMetric({
      entityId: 'openai/openai-python',
      source: 'github',
      metricDate: new Date('2026-04-25'),
      metricName: 'stars',
      metricValue: 101,
      runId: run.runId
    });

    writer.upsertTrendScore({
      entityId: 'openai/openai-python',
      trendDate: new Date('2026-04-25'),
      score: 0.2,
      runId: run.runId
    });

    writer.markRunError(run.runId);
    writer.completeRun(run.runId, 'completed', 1);

    expect(conn.commits).toBe(6);
    expect(conn.calls.some((c) => c.sql.includes('INSERT INTO raw_events'))).toBe(true);
    expect(conn.calls.some((c) => c.sql.includes('INSERT INTO source_metrics'))).toBe(true);
    expect(conn.calls.some((c) => c.sql.includes('INSERT INTO trend_scores'))).toBe(true);
    expect(conn.calls.some((c) => c.sql.includes('UPDATE ingestion_runs'))).toBe(true);
  });
});
