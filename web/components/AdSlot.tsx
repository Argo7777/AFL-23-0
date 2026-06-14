"use client";

import { useEffect, useRef } from "react";
import { ADSENSE_CLIENT } from "@/lib/ads";

// re-export so existing imports keep working
export { ADSENSE_CLIENT, AD_SLOTS } from "@/lib/ads";

/**
 * A single responsive AdSense unit. Renders nothing until this unit's slot id
 * is configured — so the AdSense script can be reviewed/approved while the
 * site stays clean, and each slot lights up the moment you paste its id below.
 */
export default function AdSlot({
  slot,
  className = "",
  label = true,
}: {
  slot?: string;
  className?: string;
  label?: boolean;
}) {
  const pushed = useRef(false);

  useEffect(() => {
    if (!ADSENSE_CLIENT || !slot || pushed.current) return;
    pushed.current = true;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
    } catch {
      /* blocked / not loaded */
    }
  }, [slot]);

  if (!ADSENSE_CLIENT || !slot) return null;

  return (
    <div className={`mx-auto w-full max-w-3xl ${className}`}>
      {label && (
        <p className="mb-1 text-center text-[9px] uppercase tracking-widest text-slate-700">
          advertisement
        </p>
      )}
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
