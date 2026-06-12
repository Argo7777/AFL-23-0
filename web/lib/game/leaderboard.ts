/** Global ladder client — features auto-hide until the worker URL is set. */
export const LEADERBOARD_URL = process.env.NEXT_PUBLIC_LEADERBOARD_URL ?? "";

export interface BoardEntry {
  n: string;
  w: number;
  l: number;
  r: number;
  f: boolean;
  m: string;
  t: number;
}

const NAME_KEY = "afl230-coach-name";

export function coachName(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(NAME_KEY) ?? "";
}

export function setCoachName(n: string) {
  try { localStorage.setItem(NAME_KEY, n.slice(0, 12)); } catch { /* ignore */ }
}

export async function submitScore(s: {
  name: string; wins: number; losses: number; rating: number;
  flag: boolean; mode: string; daily?: string;
}): Promise<boolean> {
  if (!LEADERBOARD_URL) return false;
  try {
    const res = await fetch(`${LEADERBOARD_URL}/score`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(s),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchBoard(daily: string): Promise<{ daily: BoardEntry[]; alltime: BoardEntry[] } | null> {
  if (!LEADERBOARD_URL) return null;
  try {
    const res = await fetch(`${LEADERBOARD_URL}/board?d=${daily}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
