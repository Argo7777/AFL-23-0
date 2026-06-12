import { PlayerEntry } from "./types";

/** human-readable honours chips for a player-decade entry */
export function honours(p: PlayerEntry): string[] {
  const out: string[] = [];
  if (p.a.bwW > 0) out.push(`${p.a.bwW}× Brownlow Medal`);
  if (p.a.aa > 0) out.push(`${p.a.aa}× All-Australian`);
  // the leading-goalkicker medal has carried Coleman's name since 1955
  if (p.a.col > 0) out.push(`${p.a.col}× ${p.y[0] >= 1955 ? "Coleman Medal" : "leading goalkicker"}`);
  if (p.a.pr > 0) out.push(`${p.a.pr}× premiership`);
  if (p.a.bw > 0 && p.a.bwW === 0) out.push(`${p.a.bw} Brownlow votes`);
  if (p.a.rs > 0) out.push("Rising Star");
  return out;
}
