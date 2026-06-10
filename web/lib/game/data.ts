import { Meta, PlayerEntry } from "./types";

// inlined at build time; "/AFL-23-0" on GitHub Pages, "" elsewhere
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const playerCache = new Map<number, PlayerEntry[]>();
let metaCache: Meta | null = null;
let strengthsCache: Record<string, number[]> | null = null;

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

export async function loadStrengths(): Promise<Record<string, number[]>> {
  if (!strengthsCache) {
    strengthsCache = await (await fetch(`${BASE_PATH}/data/strengths.json`)).json();
  }
  return strengthsCache!;
}

/** Players who played for `club` in `decade`, best rating first. */
export async function loadPool(decade: number, club: string): Promise<PlayerEntry[]> {
  const all = await loadDecade(decade);
  return all.filter((p) => (p.c[club] ?? 0) > 0);
}
