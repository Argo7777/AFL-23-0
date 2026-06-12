import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dynasty — coach an era, win the flags",
  description: "Draft five all-era legends and coach them through the seasons as they age, decline and retire. How many premierships before the era ends?",
  alternates: { canonical: "/dynasty" },
};

export default function DynastyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
