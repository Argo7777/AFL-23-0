import type { Metadata } from "next";
import Link from "next/link";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with the team behind AFL 23-0 — feedback, corrections, and enquiries.",
  alternates: { canonical: "/contact" },
};

const EMAIL = "danieltomaro3@gmail.com";

export default function ContactPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <span className="flex items-center gap-2">
        <Link href="/" className="font-display text-2xl font-black text-grass">23–0</Link>
        <Link href="/" className="rounded-lg border border-line px-2.5 py-1 font-display text-[11px] font-black text-slate-300 hover:border-grass/50">🏠 HOME</Link>
      </span>

      <h1 className="font-display mt-4 text-3xl font-black">Contact</h1>

      <div className="mt-5 space-y-5 text-sm leading-relaxed text-slate-300">
        <p>
          AFL 23-0 is a small, independent fan project. We&rsquo;d love to hear from you — feedback on the
          game, a stat that looks off, a feature idea, or a general enquiry.
        </p>

        <div className="rounded-2xl border border-line bg-pitch-light p-5">
          <p className="text-[11px] uppercase tracking-widest text-slate-500">Email</p>
          <a href={`mailto:${EMAIL}`} className="font-display text-lg font-black text-ice hover:underline">
            {EMAIL}
          </a>
          <p className="mt-3 text-[11px] uppercase tracking-widest text-slate-500">Support the site</p>
          <a href="https://ko-fi.com/danieltomaro" target="_blank" rel="noopener noreferrer" className="font-display text-lg font-black text-gold hover:underline">
            ko-fi.com/danieltomaro ☕
          </a>
        </div>

        <p className="text-xs text-slate-500">
          Spotted a data error? Ratings and results are derived automatically from public records, so
          the odd quirk slips through — let us know the player or match and we&rsquo;ll take a look.
        </p>
      </div>

      <p className="mt-8 text-center text-xs text-slate-600">
        <Link href="/about" className="underline hover:text-ice">About</Link> ·{" "}
        <Link href="/privacy" className="underline hover:text-ice">Privacy</Link> ·{" "}
        <Link href="/" className="underline hover:text-ice">Home</Link>
      </p>
    </main>
  );
}
