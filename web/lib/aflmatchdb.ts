import { readFileSync } from "node:fs";
import { join } from "node:path";

/** Build-time AFL match box scores (footywire), sharded by year so each match
 *  page only loads its own season's data. */

export interface AflBoxPlayer {
  n: string; di: number; kk: number; hb: number; mk: number; tk: number;
  gl: number; ho: number; ga: number; i5: number; cl: number; r5: number;
}
export interface AflBoxScore {
  round: string; date: string; venue: string; year: number;
  t1: string; s1: number; t2: string; s2: number;
  home: AflBoxPlayer[]; away: AflBoxPlayer[];
}

const dir = join(process.cwd(), "public", "data");
function readOr<T>(file: string, fallback: T): T {
  try { return JSON.parse(readFileSync(join(dir, file), "utf8")); } catch { return fallback; }
}

let indexCache: Record<string, number> | null = null;
function index(): Record<string, number> {
  return (indexCache ??= readOr<Record<string, number>>("afl-box-index.json", {}));
}
const yearCache = new Map<number, Record<string, AflBoxScore>>();
function yearFile(year: number): Record<string, AflBoxScore> {
  if (!yearCache.has(year)) yearCache.set(year, readOr<Record<string, AflBoxScore>>(`afl-boxscores-${year}.json`, {}));
  return yearCache.get(year)!;
}

export function allAflMatchIds(): string[] {
  return Object.keys(index());
}
export function aflMatchBox(id: string): AflBoxScore | undefined {
  const year = index()[id];
  if (year == null) return undefined;
  return yearFile(year)[id];
}
