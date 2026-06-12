import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Guess the Legend — daily AFL mystery player",
  description:
    "A new mystery AFL great every day. Six guesses, a clue per miss — era, stats, honours, clubs. Can you name the legend?",
  alternates: { canonical: "/legend" },
};

export default function LegendLayout({ children }: { children: React.ReactNode }) {
  return children;
}
