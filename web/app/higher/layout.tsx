import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Higher or Lower — AFL stats streak",
  description:
    "Two players, one stat, endless footy trivia from 130 years of real AFL numbers. How long can your streak run?",
  alternates: { canonical: "/higher" },
};

export default function HigherLayout({ children }: { children: React.ReactNode }) {
  return children;
}
