import type { Metadata } from "next";
import Link from "next/link";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How AFL 23-0 handles data, cookies and advertising — including Google AdSense, third-party vendors and your choices.",
  alternates: { canonical: "/privacy" },
};

const UPDATED = "15 June 2026";

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <span className="flex items-center gap-2">
        <Link href="/" className="font-display text-2xl font-black text-grass">23–0</Link>
        <Link href="/" className="rounded-lg border border-line px-2.5 py-1 font-display text-[11px] font-black text-slate-300 hover:border-grass/50">🏠 HOME</Link>
      </span>

      <h1 className="font-display mt-4 text-3xl font-black">Privacy Policy</h1>
      <p className="mt-1 text-xs text-slate-500">Last updated {UPDATED}</p>

      <div className="mt-6 space-y-5 text-sm leading-relaxed text-slate-300">
        <p>
          AFL 23-0 (&ldquo;we&rdquo;, &ldquo;us&rdquo;, the &ldquo;site&rdquo;) is a free, fan-made
          Australian-rules football game and statistics site. This policy explains what data the site
          handles and the choices you have. By using the site you agree to this policy.
        </p>

        <section>
          <h2 className="font-display text-lg font-black text-slate-100">What we collect</h2>
          <p className="mt-2">
            We do <b>not</b> ask you to create an account and we do not collect names, emails or other
            personal information to play. Your game progress (teams, results, daily streaks) is stored
            only in your own browser&rsquo;s local storage on your device — we never receive it. Optional
            leaderboard entries store only a nickname you choose and your game result.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-black text-slate-100">Analytics</h2>
          <p className="mt-2">
            We use Cloudflare Web Analytics to understand aggregate traffic. It is privacy-first, does
            not use cookies, and does not fingerprint or track individuals across sites.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-black text-slate-100">Advertising &amp; cookies</h2>
          <p className="mt-2">
            This site is supported by advertising. We use <b>Google AdSense</b> to display ads.
          </p>
          <ul className="mt-2 list-disc space-y-1.5 pl-5">
            <li>
              Third-party vendors, including Google, use cookies to serve ads based on your prior visits
              to this and other websites.
            </li>
            <li>
              Google&rsquo;s use of advertising cookies enables it and its partners to serve ads to you
              based on your visit to this site and/or other sites on the Internet.
            </li>
            <li>
              You may opt out of personalised advertising by visiting{" "}
              <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" className="text-ice underline">Google Ads Settings</a>.
            </li>
            <li>
              You can opt out of a third-party vendor&rsquo;s use of cookies for personalised advertising
              at{" "}
              <a href="https://www.aboutads.info/choices/" target="_blank" rel="noopener noreferrer" className="text-ice underline">aboutads.info</a>{" "}
              and{" "}
              <a href="https://www.youronlinechoices.com/" target="_blank" rel="noopener noreferrer" className="text-ice underline">youronlinechoices.com</a>.
            </li>
          </ul>
          <p className="mt-2">
            For more on how Google uses data when you use our partners&rsquo; sites or apps, see{" "}
            <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener noreferrer" className="text-ice underline">
              Google&rsquo;s policy
            </a>.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-black text-slate-100">Children</h2>
          <p className="mt-2">
            The site is intended for a general audience and is not directed at children under 13. We do
            not knowingly collect personal information from children.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-black text-slate-100">Your choices</h2>
          <p className="mt-2">
            You can clear the site&rsquo;s local data at any time by clearing your browser storage, and
            manage or block cookies through your browser settings. Blocking advertising cookies will not
            stop ads but may make them less relevant.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-black text-slate-100">Changes &amp; contact</h2>
          <p className="mt-2">
            We may update this policy from time to time; the date above reflects the latest version.
            Questions? See our <Link href="/contact" className="text-ice underline">contact page</Link>.
          </p>
        </section>
      </div>

      <p className="mt-8 text-center text-xs text-slate-600">
        <Link href="/about" className="underline hover:text-ice">About</Link> ·{" "}
        <Link href="/contact" className="underline hover:text-ice">Contact</Link> ·{" "}
        <Link href="/" className="underline hover:text-ice">Home</Link>
      </p>
    </main>
  );
}
