import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "The greatest AFL players of every decade",
  description:
    "The best AFL/VFL footballers of the 1890s through the 2020s, rated era-fairly from real stats, Brownlow votes, All-Australian selections and premierships. Browse the greats by decade and position.",
  alternates: { canonical: "/greats" },
};

export default function GreatsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
