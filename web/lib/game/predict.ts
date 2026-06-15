import { LEADERBOARD_URL } from "./leaderboard";

/** Awards-predictor voting via the leaderboard worker. */
export type Tallies = Record<string, Record<string, number>>;

export async function fetchVotes(comp: "afl" | "aflw"): Promise<Tallies> {
  if (!LEADERBOARD_URL) return {};
  try {
    const res = await fetch(`${LEADERBOARD_URL}/votes?comp=${comp}`);
    if (!res.ok) return {};
    return (await res.json()) as Tallies;
  } catch {
    return {};
  }
}

export async function submitVote(v: {
  comp: "afl" | "aflw"; category: string; choice: string; prev?: string;
}): Promise<boolean> {
  if (!LEADERBOARD_URL) return false;
  try {
    const res = await fetch(`${LEADERBOARD_URL}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(v),
    });
    return res.ok;
  } catch {
    return false;
  }
}
