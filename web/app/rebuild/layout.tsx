import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "The Rebuild — from basket case to premiers",
  description: "Inherit a terrible AFL side and rebuild it one trade per season. How many seasons to the flag?",
  alternates: { canonical: "/rebuild" },
};

export default function RebuildLayout({ children }: { children: React.ReactNode }) {
  return children;
}
