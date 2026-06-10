import { createHash } from "node:crypto";
import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const CACHE_DIR = join(__dirname, "..", "..", "cache");

// Footywire returns 406 without a browser UA (fitzRoy sets one too).
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

const MIN_INTERVAL_MS = 600;
let lastRequestAt = 0;

function cachePath(url: string): string {
  const u = new URL(url);
  const hash = createHash("sha1").update(url).digest("hex").slice(0, 10);
  const slug = (u.pathname + u.search)
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .slice(0, 120);
  return join(CACHE_DIR, u.hostname, `${slug}_${hash}.html`);
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export interface FetchOptions {
  /** Re-download even if cached (used by `refresh` for current-season pages). */
  force?: boolean;
}

/**
 * Polite cached fetch: every successfully fetched page is stored on disk so
 * the full scrape is resumable and re-runs are free. Live requests are
 * throttled and retried with backoff.
 */
export async function fetchPage(url: string, opts: FetchOptions = {}): Promise<string> {
  const file = cachePath(url);
  if (!opts.force && existsSync(file)) {
    return readFileSync(file, "utf-8");
  }

  let lastError: unknown;
  for (let attempt = 1; attempt <= 4; attempt++) {
    const wait = lastRequestAt + MIN_INTERVAL_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastRequestAt = Date.now();
    try {
      const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      const body = await res.text();
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, body);
      return body;
    } catch (err) {
      lastError = err;
      await sleep(1500 * attempt);
    }
  }
  throw new Error(`Failed after retries: ${url}: ${lastError}`);
}

export function isCached(url: string): boolean {
  return existsSync(cachePath(url));
}
