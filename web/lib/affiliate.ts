// Affiliate config. Paste your Amazon Associates tracking tag below (looks
// like "afl230-22") and book links light up on every player page — earning
// per click/purchase with no ad-fill delay. Empty = no affiliate links shown.
export const AMAZON_TAG = "";

export const KOFI_URL = "https://ko-fi.com/danieltomaro";

/** Amazon book-search link for a player, with the associate tag attached. */
export function amazonBooksLink(playerName: string): string | null {
  if (!AMAZON_TAG) return null;
  const q = encodeURIComponent(`${playerName} AFL`);
  return `https://www.amazon.com.au/s?k=${q}&i=stripbooks&tag=${AMAZON_TAG}`;
}
