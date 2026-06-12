import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My coaching career",
  description: "Your AFL 23-0 record: seasons, premierships, badges and win curve — stored on your device.",
  alternates: { canonical: "/me" },
  robots: { index: false },
};

export default function MeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
