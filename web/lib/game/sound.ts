const KEY = "afl230-sound";

export function soundOn(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(KEY) !== "off";
}

export function toggleSound(): boolean {
  const next = !soundOn();
  try { localStorage.setItem(KEY, next ? "on" : "off"); } catch { /* ignore */ }
  return next;
}
