import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "The Tipping Run — tip real footy history",
  description:
    "Real AFL/VFL matches since 1920, one at a time. Tip the winner, ride the streak — underdogs pay double, one miss ends the run.",
  alternates: { canonical: "/tips" },
};

export default function TipsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
