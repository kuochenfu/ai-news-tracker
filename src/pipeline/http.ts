const USER_AGENT = "ai-news-tracker/0.2 (+https://kuochenfu.github.io/ai-news-tracker/)";

export interface FetchPolicy {
  timeoutMs?: number;
  retries?: number;
  backoffMs?: number;
}

function retryable(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * fetch with a per-attempt timeout and bounded retries on network errors,
 * timeouts, 408, 429, and 5xx. Other HTTP errors fail immediately.
 */
export async function fetchWithRetry(url: string | URL, init: RequestInit = {}, policy: FetchPolicy = {}): Promise<Response> {
  const { timeoutMs = 15_000, retries = 2, backoffMs = 600 } = policy;
  const headers = { "User-Agent": USER_AGENT, ...(init.headers as Record<string, string> | undefined) };
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    if (attempt > 0) await sleep(backoffMs * 2 ** (attempt - 1));
    try {
      const response = await fetch(url, { ...init, headers, signal: AbortSignal.timeout(timeoutMs) });
      if (response.ok || !retryable(response.status) || attempt === retries) return response;
      lastError = new Error(`${response.status} ${response.statusText}`);
    } catch (error) {
      lastError = error;
    }
  }
  const reason = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`${new URL(String(url)).hostname} failed after ${retries + 1} attempts: ${reason}`);
}

export async function fetchJson<T>(url: string | URL, headers: Record<string, string> = {}, policy?: FetchPolicy): Promise<T> {
  const response = await fetchWithRetry(url, { headers: { Accept: "application/json", ...headers } }, policy);
  if (!response.ok) throw new Error(`${new URL(String(url)).hostname}${new URL(String(url)).pathname} returned ${response.status}`);
  return (await response.json()) as T;
}

export async function fetchText(url: string | URL, accept: string, policy?: FetchPolicy): Promise<string> {
  const response = await fetchWithRetry(url, { headers: { Accept: accept } }, policy);
  if (!response.ok) throw new Error(`${new URL(String(url)).hostname} returned ${response.status}`);
  return response.text();
}

/** Runs tasks with at most `limit` in flight. */
export async function mapLimit<T, R>(items: T[], limit: number, task: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await task(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}
