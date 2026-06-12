import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Guess the Battler — daily AFL cult hero",
  description:
    "Forget the superstars — name the honest toiler. A new role player, cult hero or journeyman every day, with six guesses and a clue per miss.",
  alternates: { canonical: "/battler" },
};

export default function BattlerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
