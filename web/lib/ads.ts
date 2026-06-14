// Plain (non-"use client") module so SERVER components get the real values.
// Importing these from the client AdSlot component would hand server pages a
// client-reference proxy (slot === undefined → no ad renders).

export const ADSENSE_CLIENT = "ca-pub-2087141992057731";

/**
 * Ad-unit slot ids. Create display units in AdSense and paste their ids here.
 * `content` currently reuses the Result unit so the SEO pages earn now; swap
 * in a dedicated "In-article" unit id for cleaner reporting whenever ready.
 */
export const AD_SLOTS = {
  home: "5789788385", // "Home" unit — between sections on the home page
  result: "6838809461", // "Result" unit — result screen, below the record
  content: "6838809461", // player pages, /greats, /about (reuses Result for now)
};
