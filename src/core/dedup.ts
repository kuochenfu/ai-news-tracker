async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((n) => n.toString(16).padStart(2, '0')).join('');
}

export function normalizeText(value?: string | null): string {
  if (!value) return '';
  return value.trim().toLowerCase().split(/\s+/).join(' ');
}

export async function buildContentHash(title: string | null | undefined, url: string | null | undefined, source: string): Promise<string> {
  const basis = [normalizeText(source), normalizeText(title), normalizeText(url)].join('|');
  return sha256Hex(basis);
}
