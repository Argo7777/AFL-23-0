import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // draw into the notch / dynamic island
  themeColor: "#0b1120",
};

const SITE = "https://afl23-0.com";
const DESCRIPTION =
  "Build the greatest all-era AFL team and chase a perfect 23-0 season. Spin clubs and decades from 130 years of VFL/AFL history — every rating derived from real stats, Brownlow votes and premierships. Can you go undefeated?";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: "AFL 23-0 — Build the perfect all-era footy team",
    template: "%s — AFL 23-0",
  },
  description: DESCRIPTION,
  keywords: [
    "AFL", "AFL game", "footy game", "AFL team builder", "all-era AFL team",
    "23-0", "AFL trivia", "Australian rules football", "VFL", "AFL legends",
    "fantasy footy", "AFL quiz", "greatest AFL players",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: SITE,
    siteName: "AFL 23-0",
    title: "AFL 23-0 — Build the perfect all-era footy team",
    description: DESCRIPTION,
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "AFL 23-0 — all-era team builder" }],
    locale: "en_AU",
  },
  twitter: {
    card: "summary_large_image",
    title: "AFL 23-0 — Build the perfect all-era footy team",
    description: DESCRIPTION,
    images: ["/og.png"],
  },
  robots: { index: true, follow: true },
  icons: {
    icon: [{ url: "/icon-192.png", sizes: "192x192" }, { url: "/icon.svg", type: "image/svg+xml" }],
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "AFL 23-0",
    statusBarStyle: "black-translucent",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "AFL 23-0",
  url: SITE,
  applicationCategory: "GameApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "AUD" },
  description: DESCRIPTION,
  inLanguage: "en-AU",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AU">
      <body className="antialiased">
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {/* Cloudflare Web Analytics — privacy-friendly, no cookies */}
        <script
          defer
          src="https://static.cloudflareinsights.com/beacon.min.js"
          data-cf-beacon='{"token": "b75504cea85842969120dffc5b746484"}'
        />
      </body>
    </html>
  );
}
