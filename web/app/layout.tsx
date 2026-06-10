import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AFL 23-0 — Can you build the perfect all-era team?",
  description:
    "Spin clubs and eras across 130 years of VFL/AFL history, draft your dream side, and chase a perfect 23-0 season. Every rating derived from real stats.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
