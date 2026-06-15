import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AFL & AFLW Awards Predictor — vote the Brownlow, premiership & more",
  description: "Tip who'll win the premiership, Brownlow Medal, Coleman Medal and wooden spoon — and the AFLW best & fairest. Vote and see the crowd's predictions live.",
  alternates: { canonical: "/predict" },
};

export default function PredictLayout({ children }: { children: React.ReactNode }) {
  return children;
}
