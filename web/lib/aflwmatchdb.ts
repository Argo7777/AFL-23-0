import { readFileSync } from "node:fs";
import { join } from "node:path";

/** Build-time AFLW match box scores for the per-match pages. */

export interface BoxPlayer {
  n: string; pos: string;
  di: number; kk: number; hb: number; mk: number; tk: number; gl: number; ho: number;
  cp: number; i5: number; cl: number; r5: number; ic: number; ga: number;
}
export interface BoxScore {
  round: string; date: string; venue: string; label: string; year: number;
  t1: string; s1: number; t2: string; s2: number;
  home: BoxPlayer[]; away: BoxPlayer[];
}

let cache: Record<string, BoxScore> | null = null;
function data(): Record<string, BoxScore> {
  if (!cache) {
    cache = JSON.parse(readFileSync(join(process.cwd(), "public", "data", "aflw-boxscores.json"), "utf8"));
  }
  return cache!;
}

export function allMatchIds(): string[] {
  return Object.keys(data());
}
export function matchBox(id: string): BoxScore | undefined {
  return data()[id];
}
