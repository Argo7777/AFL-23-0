"use client";

import GuessGame from "@/components/GuessGame";

export default function LegendPage() {
  return (
    <GuessGame
      cfg={{
        title: "Guess the Legend",
        accent: "text-gold",
        tagline: "One mystery great per day. Each miss unlocks a clue — name them within six.",
        storageKey: "afl230-legend",
        seedXor: 0x1e9e,
        decadeMin: 1950,
        pick: (p) => Math.max(p.r.DEF, p.r.MID, p.r.RUC, p.r.FWD) >= 90 && p.g >= 50,
        shareLabel: "Legend",
        path: "/legend/",
        revealLine: () => ["legend identified", "today's legend was"],
      }}
    />
  );
}
