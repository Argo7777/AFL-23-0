#!/bin/bash
# AFL player-prop odds scraper — runs from an AU IP (the AU books geo-block GitHub's
# US runners, so this can't live in CI). Scrapes Sportsbet/Dabble/Ladbrokes/TAB,
# commits the odds feeds, and pushes to main (which triggers the site deploy).
#
# Driven by a launchd agent every 3h. Reads bookmaker creds (TAB_*, DABBLE_AUTH,
# LAD_AFL_CATEGORY_ID) from pipeline/.env, which odds.ts loads automatically.
set -uo pipefail

# launchd runs with a minimal PATH — add Homebrew (node/npm/git) explicitly.
export PATH="/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin"

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO" || exit 1
LOG="$REPO/scripts/odds-cron.log"
ts() { date "+%Y-%m-%d %H:%M:%S"; }
exec >>"$LOG" 2>&1
echo "===== $(ts) odds-cron start ($REPO) ====="

# Get latest main first (CI commits projections here too) so the push fast-forwards.
git pull --rebase --autostash origin main || { echo "$(ts) pull failed"; exit 1; }

npm run odds --prefix pipeline || { echo "$(ts) odds scrape failed"; exit 1; }

# SuperCoach feed — prices/news move weekly-ish, so refresh at most once a day
# (it pulls a per-round score series, which is heavier than the odds scrape).
SC=web/public/data/supercoach-latest.json
if [ ! -f "$SC" ] || [ -n "$(find "$SC" -mmin +1200 2>/dev/null)" ]; then
  echo "$(ts) refreshing supercoach…"
  npm run supercoach --prefix pipeline || echo "$(ts) supercoach scrape failed (keeping previous)"
fi

git add web/public/data/odds-latest.json \
        web/public/data/pickem-latest.json \
        web/public/data/ou-latest.json \
        "$SC"
if git diff --cached --quiet; then
  echo "$(ts) no odds changes — nothing to push"
  exit 0
fi
git config user.name  "afl-odds-bot"
git config user.email "afl-odds-bot@localhost"
git commit -m "Refresh AFL odds (local AU scrape $(date -u +%Y-%m-%dT%H:%MZ))"

# Push with rebase-retry in case CI pushed in the meantime.
for i in 1 2 3 4 5; do
  if git push origin HEAD:main; then echo "$(ts) pushed (attempt $i)"; exit 0; fi
  echo "$(ts) push rejected (attempt $i) — rebasing..."
  git pull --rebase --autostash origin main || { echo "$(ts) rebase failed"; exit 1; }
done
echo "$(ts) failed to push after 5 attempts"
exit 1
