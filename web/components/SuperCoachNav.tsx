"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS: [string, string][] = [
  ["Overview", "/supercoach"],
  ["Players", "/supercoach/players"],
  ["Prices", "/supercoach/prices"],
  ["Value", "/supercoach/value"],
  ["Form", "/supercoach/form"],
  ["Ownership", "/supercoach/ownership"],
  ["Injuries", "/supercoach/injuries"],
  ["Fixtures", "/supercoach/fixtures"],
  ["Model vs SC", "/supercoach/model"],
  ["How it works", "/supercoach/how-it-works"],
];

/** Sub-nav shared across the SuperCoach pages. */
export default function SuperCoachNav() {
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
                ? "bg-gold text-pitch"
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
