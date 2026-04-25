export class ExternalKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExternalKeyError';
  }
}

export type AnyRecord = Record<string, unknown>;

function nestedRecord(value: unknown): AnyRecord | undefined {
  return value !== null && typeof value === 'object' ? (value as AnyRecord) : undefined;
}

export function buildExternalId(source: string, payload: AnyRecord, snapshotDate?: Date): string {
  const normalized = source.trim().toLowerCase();

  if (normalized === 'hn') {
    const item = nestedRecord(payload.item);
    let itemId = item?.id ?? payload['item.id'] ?? payload.id;
    if (itemId === undefined || itemId === null) {
      throw new ExternalKeyError('HN payload must include item.id');
    }
    return String(itemId);
  }

  if (normalized === 'x') {
    const candidates = ['tweet_id', 'post_id', 'id', 'rest_id'] as const;
    for (const key of candidates) {
      const value = payload[key];
      if (value) return String(value);
    }
    throw new ExternalKeyError('X payload must include tweet/post ID');
  }

  if (normalized === 'github') {
    let repo = payload.repo_full_name ?? payload.full_name;
    if (!repo) {
      const owner = payload.owner;
      const name = payload.name;
      if (owner && name) repo = `${owner}/${name}`;
    }

    if (!repo) throw new ExternalKeyError('GitHub payload must include repository full name');
    if (!snapshotDate) throw new ExternalKeyError('GitHub keys require snapshotDate');

    return `${String(repo)}:${snapshotDate.toISOString().slice(0, 10)}`;
  }

  const value = payload.external_id ?? payload.id;
  if (value === undefined || value === null) {
    throw new ExternalKeyError(`Unsupported source '${source}' and no fallback external key`);
  }
  return String(value);
}
