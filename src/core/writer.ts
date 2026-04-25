export type SqlParams = Array<string | number | null>;

export interface SqlConnection {
  execute(sql: string, params: SqlParams): void;
  commit(): void;
}

export type RunMetadata = {
  runId: string;
  startedAt: Date;
  completedAt?: Date;
  status: 'running' | 'completed' | 'failed';
  errorCount: number;
};

function randomId(): string {
  return crypto.randomUUID();
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export class IngestionWriter {
  constructor(private readonly conn: SqlConnection) {}

  startRun(): RunMetadata {
    const metadata: RunMetadata = {
      runId: randomId(),
      startedAt: new Date(),
      status: 'running',
      errorCount: 0
    };

    this.conn.execute(
      `INSERT INTO ingestion_runs(run_id, started_at, status, error_count)
       VALUES (?, ?, ?, ?)`,
      [metadata.runId, metadata.startedAt.toISOString(), metadata.status, metadata.errorCount]
    );
    this.conn.commit();
    return metadata;
  }

  completeRun(runId: string, status: RunMetadata['status'], errorCount = 0): void {
    this.conn.execute(
      `UPDATE ingestion_runs
       SET completed_at = ?, status = ?, error_count = ?
       WHERE run_id = ?`,
      [new Date().toISOString(), status, errorCount, runId]
    );
    this.conn.commit();
  }

  upsertRawEvent(input: {
    source: string;
    externalId: string;
    contentHash: string;
    title: string | null;
    url: string | null;
    payloadJson: string;
    runId: string;
  }): void {
    this.conn.execute(
      `INSERT INTO raw_events(source, external_id, content_hash, title, url, payload_json, first_seen_run_id, last_seen_run_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(source, external_id)
       DO UPDATE SET
         content_hash = excluded.content_hash,
         title = excluded.title,
         url = excluded.url,
         payload_json = excluded.payload_json,
         last_seen_run_id = excluded.last_seen_run_id,
         updated_at = CURRENT_TIMESTAMP`,
      [input.source, input.externalId, input.contentHash, input.title, input.url, input.payloadJson, input.runId, input.runId]
    );
    this.conn.commit();
  }

  upsertSourceMetric(input: {
    entityId: string;
    source: string;
    metricDate: Date;
    metricName: string;
    metricValue: number;
    runId: string;
  }): void {
    this.conn.execute(
      `INSERT INTO source_metrics(entity_id, source, date, metric_name, metric_value, run_id)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(entity_id, source, date)
       DO UPDATE SET
         metric_name = excluded.metric_name,
         metric_value = excluded.metric_value,
         run_id = excluded.run_id,
         updated_at = CURRENT_TIMESTAMP`,
      [input.entityId, input.source, isoDate(input.metricDate), input.metricName, input.metricValue, input.runId]
    );
    this.conn.commit();
  }

  upsertTrendScore(input: { entityId: string; trendDate: Date; score: number; runId: string }): void {
    this.conn.execute(
      `INSERT INTO trend_scores(entity_id, date, score, run_id)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(entity_id, date)
       DO UPDATE SET
         score = excluded.score,
         run_id = excluded.run_id,
         updated_at = CURRENT_TIMESTAMP`,
      [input.entityId, isoDate(input.trendDate), input.score, input.runId]
    );
    this.conn.commit();
  }

  markRunError(runId: string): void {
    this.conn.execute(
      `UPDATE ingestion_runs
       SET error_count = error_count + 1
       WHERE run_id = ?`,
      [runId]
    );
    this.conn.commit();
  }
}
