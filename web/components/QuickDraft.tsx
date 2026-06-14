"use client";

import { useCallback, useEffect, useState } from "react";
import { eraLabel, getComp, loadMeta, loadPool } from "@/lib/game/data";
import { clubColors } from "@/lib/game/clubColors";
import { Meta, PlayerEntry, Slot, scoreInSlot } from "@/lib/game/types";

export interface QuickPick {
  player: PlayerEntry;
  decade: number;
  club: string;
}

/** the open slot where this player scores best */
export function bestOpenSlot(p: PlayerEntry, open: Slot[]): Slot {
  return open.reduce((a, b) => (scoreInSlot(p, a) >= scoreInSlot(p, b) ? a : b));
}

/**
 * One spin, one pick: rolls a random club+era, shows the top of the pool
 * (sorted for the slot being filled), search included. The fast-draft core
 * shared by Duel, Rebuild and Dynasty.
 */
export default function QuickDraft({
  prompt,
  forSlot,
  excludeKeys,
  worstFirst = false,
  onPick,
}: {
  prompt: string;
  forSlot: Slot | null; // sort pool for this slot (null = best overall)
  excludeKeys: Set<string>;
  worstFirst?: boolean;
  onPick: (pick: QuickPick) => void;
}) {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [combo, setCombo] = useState<{ decade: number; club: string } | null>(null);
  const [pool, setPool] = useState<PlayerEntry[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadMeta().then(setMeta);
  }, []);

  const roll = useCallback(async () => {
    if (!meta) return;
    setCombo(null);
    setSearch("");
    for (let attempt = 0; attempt < 30; attempt++) {
      const decades = meta.decades;
      const d = decades[Math.floor(Math.random() * decades.length)];
      const clubs = meta.clubsByDecade[String(d)] ?? [];
      const club = clubs[Math.floor(Math.random() * clubs.length)];
      if (!club) continue;
      // eslint-disable-next-line no-await-in-loop
      const players = await loadPool(d, club);
      if (players.filter((p) => !excludeKeys.has(p.id.split("|")[0])).length >= 10) {
        setCombo({ decade: d, club });
        setPool(players);
        return;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta]);

  useEffect(() => {
    if (meta && !combo) roll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta]);

  if (!combo) {
    return <p className="py-6 text-center text-sm text-slate-500">spinning the eras…</p>;
  }

  const score = (p: PlayerEntry) =>
    forSlot ? scoreInSlot(p, forSlot) : Math.max(p.r.DEF, p.r.MID, p.r.RUC, p.r.FWD);
  let list = pool.filter((p) => !excludeKeys.has(p.id.split("|")[0]));
  list = [...list].sort((a, b) => (worstFirst ? score(a) - score(b) : score(b) - score(a)));
  if (search.trim()) {
    const q = search.trim().toLowerCase();
    list = list.filter((p) => p.n.toLowerCase().includes(q));
  }
  const [c1, c2] = clubColors(combo.club);

  return (
    <div className="rounded-2xl border border-line bg-pitch-light p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-slate-500">{prompt}</p>
          <p className="font-display text-xl font-black">
            {combo.club} <span className="text-gold">{eraLabel(combo.decade, getComp())}</span>
          </p>
        </div>
        <span className="flex h-1.5 w-16 overflow-hidden rounded-full">
          <span className="flex-1" style={{ background: c1 }} />
          <span className="flex-1" style={{ background: c2 }} />
        </span>
      </div>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={`Search all ${pool.length}…`}
        className="mt-2 w-full rounded-xl border border-line bg-card px-3 py-2 text-sm outline-none placeholder:text-slate-600 focus:border-grass/60"
      />
      <div className="mt-2 grid max-h-72 gap-1 overflow-y-auto">
        {list.slice(0, 12).map((p) => (
          <button
            key={p.id}
            onClick={() => onPick({ player: p, decade: combo.decade, club: combo.club })}
            className="flex items-center justify-between rounded-lg border border-line bg-pitch px-3 py-1.5 text-left text-sm hover:border-grass/60"
          >
            <span className="min-w-0 truncate font-display font-black">{p.n}
              <span className="ml-2 text-xs font-normal text-slate-500">{p.nat} · {p.g} games</span>
            </span>
            <span className="shrink-0 font-display font-black text-grass">
              {Math.round(score(p))}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
