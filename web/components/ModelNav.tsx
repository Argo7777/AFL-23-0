"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS: [string, string][] = [
  ["Projections", "/projections"],
  ["Lineups", "/lineups"],
  ["Compare odds", "/compare"],
  ["Over / Unders", "/overunders"],
  ["Pick’em", "/pickem"],
  ["Value", "/value"],
  ["Model Lab", "/lab"],
  ["Backtest", "/backtest"],
  ["How it works", "/how-it-works"],
];

/** Sub-nav shared across the model (player-stat projection) pages. */
export default function ModelNav() {
  const path = usePathname();
  return (
    <div className="mb-4 flex flex-wrap gap-1.5">
      {TABS.map(([label, href]) => {
        const active = path === href;
        return (
          <Link
            key={href}
            href={href}
            className={
              "rounded-lg px-3 py-1.5 font-display text-xs font-black uppercase tracking-wide transition " +
              (active
                ? "bg-grass text-pitch"
                : "bg-card text-slate-300 hover:bg-card-hover hover:text-slate-100")
            }
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
