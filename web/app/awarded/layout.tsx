import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Who Won It? — AFL award trivia",
  description:
    "Two players, near-identical seasons — only one took home the Brownlow, the Coleman or an All-Australian blazer. Pick the winner and build a streak.",
  alternates: { canonical: "/awarded" },
};

export default function AwardedLayout({ children }: { children: React.ReactNode }) {
  return children;
}
