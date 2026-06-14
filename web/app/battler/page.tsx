"use client";

import GuessGame from "@/components/GuessGame";

export default function BattlerPage() {
  return (
    <GuessGame
      cfg={{
        title: "Guess the Battler",
        accent: "text-ice",
        tagline:
          "No superstars here — a solid, honest footballer per day. Cult heroes, role players, the blokes only real fans remember.",
        storageKey: "afl230-battler",
        seedXor: 0xba771e,
        decadeMin: 1990, // memorable TV-era journeymen
        pick: (p) => {
          const best = Math.max(p.r.DEF, p.r.MID, p.r.RUC, p.r.FWD);
          return best >= 55 && best <= 82 && p.g >= 80;
        },
        pickAflw: (p) => {
          const best = Math.max(p.r.DEF, p.r.MID, p.r.RUC, p.r.FWD);
          return best >= 50 && best <= 80 && p.g >= 6;
        },
        shareLabel: "Battler",
        path: "/battler/",
        revealLine: () => ["you know your footy", "today's battler was"],
      }}
    />
  );
}
