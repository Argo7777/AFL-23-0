import Link from "next/link";
import { KOFI_URL } from "@/lib/affiliate";

/** Sitewide footer: tip jar + a few internal links for SEO/navigation. */
export default function Footer() {
  return (
    <footer className="mx-auto mt-12 max-w-4xl px-4 pb-10 text-center">
      <a
        href={KOFI_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block rounded-xl border border-gold/40 bg-gold/5 px-5 py-2.5 font-display text-sm font-black text-gold transition hover:bg-gold/10"
      >
        ☕ Enjoying it? Shout the coach a beer
      </a>
      <p className="mt-4 text-xs text-slate-500">
        <Link href="/" className="hover:text-ice hover:underline">play</Link> ·{" "}
        <Link href="/greats" className="hover:text-ice hover:underline">the greats</Link> ·{" "}
        <Link href="/ladder" className="hover:text-ice hover:underline">ladder</Link> ·{" "}
        <Link href="/me" className="hover:text-ice hover:underline">my career</Link> ·{" "}
        <Link href="/about" className="hover:text-ice hover:underline">about the numbers</Link>
      </p>
      <p className="mt-2 text-[11px] text-slate-600">
        AFL 23-0 — a fan project. Ratings derived from real data (afltables.com, footywire.com).
      </p>
    </footer>
  );
}
