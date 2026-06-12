import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Draft Duel — two coaches, one phone",
  description: "Pass-and-play AFL drafting: two coaches alternate spins from 130 years of footy, five picks each, then their teams fight a best-of-5 series.",
  alternates: { canonical: "/duel" },
};

export default function DuelLayout({ children }: { children: React.ReactNode }) {
  return children;
}
