# AFL 23-0 — Monetization Strategy

_Strategy document. No code — ideas, numbers, and a prioritized plan._

---

## The new reality: this is a real publisher

Reported traffic: **~40–50k unique visitors and ~120k page views per day.**

That is roughly **1.2–1.5M visitors and ~3.6M page views per month.** This is no
longer a hobby site — at this scale you have a genuine media property, and the
strategy completely changes:

- AdSense alone **massively under-monetises** this much traffic.
- Most of your page views are almost certainly the **3,485 player pages and
  /greats** (SEO traffic) — and **those pages currently have NO ads at all.**
  That is the single biggest pile of money being left on the table right now.
- At this volume you **qualify for premium ad networks** (Raptive/Mediavine/Ezoic)
  that pay **3–10× AdSense**.

> ⚠️ **Seasonality matters for AFL.** Traffic will be far higher in-season
> (March–September) than off-season. Bank the in-season money, and use the
> off-season to build owned channels (email, API) that don't depend on the
> footy calendar.

---

## Headline: what this traffic is roughly worth

These are **ranges**, not promises — real numbers depend on AU-vs-international
split, ad viewability, seasonality, and fill rate. Australian audiences pay
somewhat lower display rates than US ones.

| Approach | Monthly estimate | Notes |
|---|---|---|
| **AdSense, home + result only (today)** | low hundreds $ | tiny fraction of pages carry ads |
| **AdSense on all content pages** | **$10k–35k** | put units on player pages + /greats |
| **Premium network (Raptive/Mediavine)** | **$30k–80k+** | 3.6M pageviews × ~$10–20 RPM |
| **+ Direct sponsorship of the Daily** | **+$2k–20k** | sold directly, you set the price |
| **+ Affiliate on player pages** | **+$1k–10k** | stacks on top of display |
| **+ Data API / MCP (B2B)** | **+$0.5k–10k** | doesn't depend on consumer traffic |
| **+ Premium "Coach's Box" unlock** | **+$1k–5k** | one-time purchases |

The realistic near-term target once ads are on every page and you've moved to a
premium network: **mid five figures per month in-season.**

---

## TIER 1 — Do these first (biggest money, lowest effort)

### 1.1 Put ad units on the SEO pages 🔴 highest priority
Right now ads only run on the home and result screens. **The 120k daily page
views are mostly player pages and /greats — and they serve zero ads.** Adding a
single in-content ad unit to:
- the **3,485 player pages**
- **/greats**, **/about**, the game pages

...could **multiply ad revenue several-fold overnight.** This is the fastest,
biggest win available and needs only the existing AdSense setup extended.
**Buildable now.**

### 1.2 Move from AdSense to a premium ad network
You now exceed the entry bars:
- **Raptive (ex-AdThrive):** needs ~100k pageviews/month → you have ~36×.
- **Mediavine:** needs ~50k sessions/month → you're far past.
- **Ezoic:** no real minimum, good stepping stone, AI-optimised.

These pay **3–10× AdSense** for the same traffic because they sell premium direct
demand and optimise placements. **Action:** apply to Raptive and Mediavine; run
Ezoic in the meantime. This is the biggest single revenue multiplier on the table.
_(Note: most premium networks want the ad code their way — a migration, not a
tweak. Plan a short cutover.)_

### 1.3 Keep feeding SEO + sharing
Revenue = traffic × rate. The player pages are the compounding engine. Keep:
- the weekly data refresh (fresh = Google re-crawls),
- share links and the OG cards,
- internal linking between player pages, /greats, and the games.

---

## TIER 2 — Owned audience & products (compounding value)

### 2.1 Email capture → newsletter
Your daily games create a **return-visit habit** — capture it. A simple
"Get the Daily Challenge + a footy stat in your inbox" form.

At 40–50k daily visitors, even a **2% capture rate = ~800–1,000 emails/day** — a
list of tens of thousands within weeks. An owned email list is worth **10–50× an
anonymous ad impression** because you can later sell sponsorship *or* a product
directly to it, and it survives the AFL off-season.
- Free tools: Buttondown, Substack, Beehiiv.
- The capture form can post to the existing Cloudflare Worker/KV.
- Monetise later via newsletter sponsorship (footy brands, fantasy apps).

**Buildable now** (form + storage); you choose the email platform.

### 2.2 The Data API + MCP server (B2B — see full spec below)
Your **era-fair, 130-year rating dataset is unique.** Nobody else has it. Sell
access to developers, podcasters, fantasy tools, and AI users. Doesn't need
consumer traffic — pure B2B margin. **Detailed in its own section below.**

### 2.3 Premium "Coach's Box" unlock
A one-time ~**A$8** purchase via a Stripe Payment Link (a license check fits in
the existing Worker). Perks that **never break fairness**:
- unlimited re-rolls / lifelines in casual modes,
- extended Dynasty (30 seasons),
- custom share-card colours, a gold name on the ladder,
- **ad-free** browsing.

Rule: cosmetic + convenience only. **Never** pay-to-win the Daily — the
competitive core must stay fair, or you lose trust (and trust is the asset).

---

## TIER 3 — Direct deals (real money once traffic is provable)

### 3.1 Sponsored Daily Challenge / branded content
"Daily #214, presented by [brand]." At ~1.5M monthly visitors this is **not**
$50–200/week anymore — it's a **proper sponsorship line** you sell directly:
footy podcasts, fantasy apps, sports retailers, pubs, local brands. You set the
rate; one banner line of inventory you own outright (no network cut).

### 3.2 Affiliate links on player pages
The player pages are contextual gold. On Gary Ablett's page:
- Amazon Associates link to his biography / footy books,
- club merch via affiliate programs,
- streaming sign-up (Kayo, etc.) affiliate.

Affiliate RPM on intent-heavy content **beats display ads** and **stacks on top**
of them. **Buildable now** once you have an Amazon Associates tag.

### 3.3 Print-on-demand merch (no inventory, no legal risk)
Use **generic** slogans — no player names/likenesses, so no rights issues:
- "PERFECT SPOON 0–23", "THE 23-0 CLUB", "I survived the Gauntlet",
  "HAWTHORN JESUS" (cult-hero line).
- Redbubble / Printful — zero inventory, link from the result screen.

---

## TIER 4 — The long game

### 4.1 White-label the engine into a network
You already built the **Football (soccer) version**. The
spin → draft → simulate-from-history engine works for **any** league:
**NBA, NRL, EPL, cricket, NFL.** Each new sport is mostly a data-scraping job on
the same codebase. A network:
- multiplies every revenue stream above,
- makes you attractive to bigger sponsors,
- and becomes an **acquirable asset.**

### 4.2 Acquisition / exit
At 1.5M monthly visitors with real, growing ad revenue and a unique dataset, the
**site itself is sellable** — sports-media companies, fantasy/betting operators,
and content networks buy properties like this (typically **24–40× monthly
profit**). Worth keeping clean books (the analytics + ad reports help) in case an
offer comes.

---

## The Data API + MCP product (full spec)

Your differentiator is the **era-fair rating engine** — every footballer since
1897 scored on one comparable scale, plus 130 years of cleaned stats, awards,
and premierships. Two products from one dataset:

### A) REST Data API
Sell programmatic access to the ratings and history.

**Endpoints (illustrative):**
- `GET /player/{slug}` — career, per-decade ratings, honours, season lines
- `GET /rankings?decade=1990&position=MID` — era leaderboards
- `GET /compare?a=...&b=...` — head-to-head rating + stat comparison
- `GET /season-sim?team=[...]` — run the season/finals simulation
- `GET /awards/{year}` — Brownlow / Coleman / All-Australian winners

**Who buys it:** fantasy-footy tool builders, footy podcasters/媒体 wanting
"all-era" angles, bloggers, students, hobby devs, sports-stats accounts.

**How to sell it:**
- **RapidAPI marketplace** — handles billing, keys, tiers; instant distribution.
- Or **self-serve**: Stripe + API keys checked in the existing Cloudflare Worker.
- Tiers: free (low rate limit, attribution required) → $9–49/mo (higher limits)
  → custom (commercial/bulk).

**Also offer a one-off dataset:** a clean CSV/JSON download of all ratings for a
flat price (e.g. A$49–199) — easiest possible sale, no infra.

### B) MCP server (the forward-looking play) ⭐
Expose the same data as a **Model Context Protocol server** so anyone using
Claude / an AI assistant can query AFL history conversationally:

> "Who were the best midfielders of the 1990s?" · "Compare Ablett and
> Bontempelli across eras." · "Simulate a team of [5 players]."

**Tools the MCP would expose:** `search_players`, `player_career`,
`compare_players`, `era_rankings`, `award_winners`, `simulate_season`.

**Why it's smart:**
- **It's a brand/distribution channel as much as a product.** Being *the* AFL
  data source inside AI assistants positions you as the authority and funnels
  users back to afl23-0.com.
- **Two models:** free MCP (marketing + funnel, attribution to the site) **or**
  paid via API key (same key system as the REST API).
- It reuses the **exact data you already ship** — low build cost.
- Nobody else has an AFL all-era MCP. First-mover.

**Recommended:** launch the MCP **free** first (awareness + authority), with the
**paid REST API / dataset** as the revenue line. The MCP feeds credibility; the
API and ads capture the money.

---

## Revenue model — rough monthly picture (in-season)

| Stream | Conservative | Optimistic | Effort |
|---|---|---|---|
| Display ads (premium network, all pages) | $20k | $70k | medium (migration) |
| Sponsored Daily | $2k | $15k | low (sales) |
| Affiliate (player pages) | $1k | $8k | low |
| Coach's Box premium | $1k | $5k | medium |
| Data API + dataset sales | $0.5k | $6k | medium |
| Newsletter sponsorship | $0.5k | $5k | low (after list grows) |
| **Total (illustrative)** | **~$25k** | **~$110k** | |

Off-season will be a fraction of this for ad/sponsor lines — which is exactly why
the **email list, API, and merch** (calendar-independent) matter.

---

## Risks & rules (protect the income)

- **Never click your own ads** — not once. #1 cause of AdSense bans. Don't ask
  others to click either; coordinated clicks are detected.
- **Gambling/betting affiliates** are the obvious high-RPM fit given your
  tipping/odds mechanics — but Australian gambling-advertising law is strict
  (state-by-state), carries responsible-gambling obligations, and your audience
  may include minors. **Get legal advice before touching this**, or skip it.
- **Privacy/consent at scale.** With this much (and some international) traffic
  you need a **cookie-consent / CMP** for ads — premium networks usually provide
  one; required for EU/UK visitors and good practice generally.
- **Player likeness:** safe to use names in *editorial/stats* context (you do).
  **Do not** put player names/faces on **merch** without rights — keep merch
  generic.
- **Ad network policies:** don't place ads on the interactive pick/play screen,
  keep them clearly labelled, don't induce accidental clicks. (Current
  placements already follow this.)
- **Don't over-ad the experience.** You built trust with a clean, fast, fair
  game. Too many ads kills retention — which kills the traffic the whole model
  depends on. Ads on content/SEO pages; keep gameplay light.

---

## Prioritized action plan

**This week**
1. ✅ AdSense live (done) — let it ripen.
2. **Add ad units to player pages + /greats** (biggest immediate win). _[buildable now]_
3. **Apply to Raptive + Mediavine**; set up Ezoic as interim. _[you apply]_
4. **Add email capture** to the home/result screens. _[buildable now]_
5. **Add Ko-fi "shout the coach a beer"** to the footer. _[buildable now, needs your account]_

**This month**
6. **Ship the free MCP server** (authority + funnel). _[buildable]_
7. **Stand up the REST API + CSV dataset** on RapidAPI or Stripe. _[buildable, needs your accounts]_
8. **Add affiliate links** to player pages (Amazon Associates). _[buildable, needs your tag]_
9. **Build the Coach's Box** Stripe gate. _[buildable, needs Stripe]_

**Ongoing / longer**
10. Sell the **Daily sponsorship** once analytics prove the numbers.
11. **Print-on-demand merch** linked from results.
12. Plan the **next sport** in the network (you have Football already).

---

## What I can build vs what needs you

| Task | I build | You provide |
|---|---|---|
| Ads on player/greats pages | ✅ | nothing (uses existing pub id) |
| Email capture form + storage | ✅ | choose Buttondown/Substack/Beehiiv |
| Ko-fi button | ✅ | create Ko-fi account → link |
| Affiliate links on player pages | ✅ | Amazon Associates tag |
| MCP server | ✅ | (deploy on Cloudflare — your account) |
| REST API + keys | ✅ | Stripe or RapidAPI account |
| CSV dataset for sale | ✅ | Gumroad/Stripe link |
| Coach's Box premium gate | ✅ | Stripe account |
| Premium ad network migration | ✅ (the code) | apply + get accepted |

**My recommended first three to build:** (1) **ads on the SEO pages**
(immediate multiplier), (2) **email capture** (compounding owned audience),
(3) the **free MCP + paid dataset** (unique B2B asset). Say the word on any.
