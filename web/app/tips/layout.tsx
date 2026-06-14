import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "The Tipping Run — tip real footy history",
  description:
    "Real AFL/VFL matches since 1920, one at a time. Pick the winner, ride the streak — upsets score double points, one miss ends the run.",
  alternates: { canonical: "/tips" },
};

export default function TipsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
