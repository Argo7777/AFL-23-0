import { Meta, PlayerEntry } from "./types";

// inlined at build time; "/AFL-23-0" on GitHub Pages, "" elsewhere
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export type Comp = "afl" | "aflw";

// The game runs one competition per session. The play flow calls setComp()
// from the ?comp= param; AFLW loads parallel data files (aflw-*.json) that
// share the AFL shape, so the whole engine is reused. AFL is the default.
let COMP: Comp = "afl";
export function setComp(c: Comp) {
  COMP = c;
}
export function getComp(): Comp {
  return COMP;
}
function prefix(): string {
  return COMP === "aflw" ? "aflw-" : "";
}
/** Era label: AFL spins are decades ("1990s"), AFLW spins are single years ("2022"). */
export function eraLabel(n: number, comp: Comp = COMP): string {
  return comp === "aflw" ? `${n}` : `${n}s`;
}

const playerCache = new Map<string, PlayerEntry[]>();
const metaCache = new Map<Comp, Meta>();
const strengthsCache = new Map<Comp, Record<string, [number, string][]>>();
const topRatingsCache = new Map<Comp, Record<string, TopPlayer[]>>();

export async function loadMeta(): Promise<Meta> {
  if (!metaCache.has(COMP)) {
    metaCache.set(COMP, await (await fetch(`${BASE_PATH}/data/${prefix()}meta.json`)).json());
  }
  return metaCache.get(COMP)!;
}

export async function loadDecade(decade: number): Promise<PlayerEntry[]> {
  const key = `${COMP}-${decade}`;
  if (!playerCache.has(key)) {
    const data = await (await fetch(`${BASE_PATH}/data/${prefix()}players-${decade}.json`)).json();
    playerCache.set(key, data);
  }
  return playerCache.get(key)!;
}

export async function loadStrengths(): Promise<Record<string, [number, string][]>> {
  if (!strengthsCache.has(COMP)) {
    strengthsCache.set(COMP, await (await fetch(`${BASE_PATH}/data/${prefix()}strengths.json`)).json());
  }
  return strengthsCache.get(COMP)!;
}

export type TopPlayer = [string, number, string]; // [name, rating, club]

/** top players per era — fuel for synthetic all-star opponents */
export async function loadTopRatings(): Promise<Record<string, TopPlayer[]>> {
  if (!topRatingsCache.has(COMP)) {
    try {
      topRatingsCache.set(COMP, await (await fetch(`${BASE_PATH}/data/${prefix()}topratings.json`)).json());
    } catch {
      topRatingsCache.set(COMP, {});
    }
  }
  return topRatingsCache.get(COMP)!;
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
