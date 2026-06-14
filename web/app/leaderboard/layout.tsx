import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Global Leaderboard — best 23-0 seasons worldwide",
  description: "The best AFL 23-0 seasons posted by coaches everywhere — today's daily challenge and the all-time board.",
  alternates: { canonical: "/leaderboard" },
};

export default function LadderLayout({ children }: { children: React.ReactNode }) {
  return children;
}
