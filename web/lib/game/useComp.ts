import { type Comp } from "./data";

/**
 * Read the ?comp= param from the URL (client-only). Games call this inside their
 * data-load effect and then setComp(), so no Suspense boundary is needed (unlike
 * the useSearchParams hook). AFL is the default / SSR value.
 */
export function compFromUrl(): Comp {
  if (typeof window === "undefined") return "afl";
  return new URLSearchParams(window.location.search).get("comp") === "aflw" ? "aflw" : "afl";
}
