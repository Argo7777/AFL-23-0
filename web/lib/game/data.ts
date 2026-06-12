import { Meta, PlayerEntry } from "./types";

// inlined at build time; "/AFL-23-0" on GitHub Pages, "" elsewhere
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const playerCache = new Map<number, PlayerEntry[]>();
let metaCache: Meta | null = null;
let strengthsCache: Record<string, [number, string][]> | null = null;

export async function loadMeta(): Promise<Meta> {
  if (!metaCache) {
    metaCache = await (await fetch(`${BASE_PATH}/data/meta.json`)).json();
  }
  return metaCache!;
}

export async function loadDecade(decade: number): Promise<PlayerEntry[]> {
  if (!playerCache.has(decade)) {
    const data = await (await fetch(`${BASE_PATH}/data/players-${decade}.json`)).json();
    playerCache.set(decade, data);
  }
  return playerCache.get(decade)!;
}

export async function loadStrengths(): Promise<Record<string, [number, string][]>> {
  if (!strengthsCache) {
    strengthsCache = await (await fetch(`${BASE_PATH}/data/strengths.json`)).json();
  }
  return strengthsCache!;
}

/** pool the selected decades into aligned, ascending values + labels */
export function poolStrengths(
  all: Record<string, [number, string][]>,
  eras: number[],
): { values: number[]; labels: string[] } {
  const pairs = eras
    .flatMap((e) => all[String(e)] ?? [])
    .sort((a, b) => a[0] - b[0]);
  return { values: pairs.map((p) => p[0]), labels: pairs.map((p) => p[1]) };
}

/** Players who played for `club` in `decade`, best rating first. */
export async function loadPool(decade: number, club: string): Promise<PlayerEntry[]> {
  const all = await loadDecade(decade);
  return all.filter((p) => (p.c[club] ?? 0) > 0);
}
