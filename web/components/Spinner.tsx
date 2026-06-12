"use client";

import { useEffect, useRef, useState } from "react";
import { clubColors } from "@/lib/game/clubColors";

import { soundOn } from "@/lib/game/sound";

// pokie-style ticks via WebAudio; silently no-ops where audio is blocked
let audioCtx: AudioContext | null = null;
function blip(freq: number, durMs: number, gainV = 0.04) {
  if (!soundOn()) return;
  try {
    audioCtx ??= new AudioContext();
    if (audioCtx.state === "suspended") audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "square";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(gainV, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + durMs / 1000);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + durMs / 1000);
  } catch {
    /* audio unavailable */
  }
}

/** Slot-machine style reveal of the rolled club + era. Pure presentation. */
export default function Spinner({
  decade,
  club,
  candidates,
  onDone,
}: {
  decade: number;
  club: string;
  candidates: { decade: number; club: string }[];
  onDone: () => void;
}) {
  const [display, setDisplay] = useState<{ decade: number; club: string }>({ decade, club });
  const [settled, setSettled] = useState(false);
  const tick = useRef(0);

  useEffect(() => {
    setSettled(false);
    tick.current = 0;
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      if (elapsed > 1300) {
        clearInterval(interval);
        setDisplay({ decade, club });
        setSettled(true);
        blip(880, 220, 0.06); // the reveal ding
        try { navigator.vibrate?.(60); } catch { /* no haptics */ }
        setTimeout(onDone, 450);
        return;
      }
      tick.current++;
      if (tick.current % 2 === 0) blip(220 + tick.current * 14, 40);
      const c = candidates[(tick.current * 7) % Math.max(1, candidates.length)];
      if (c) setDisplay(c);
    }, 85);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decade, club]);

  return (
    <div className="flex flex-col items-center py-10">
      <div
        className={`w-full max-w-md rounded-3xl border-2 px-4 py-6 text-center transition-all sm:px-10 sm:py-8 ${
          settled
            ? "border-grass bg-card shadow-[0_0_50px_-10px] shadow-grass/50 pop"
            : "border-line bg-pitch-light"
        }`}
      >
        <div key={display.club + display.decade} className={settled ? "" : "spinflash"}>
          <div className="font-display text-3xl font-black sm:text-5xl">{display.club}</div>
          <div className="mt-2 font-display text-2xl font-black text-gold sm:text-3xl">
            {display.decade}s
          </div>
          <div className="mx-auto mt-3 flex h-1.5 w-24 overflow-hidden rounded-full">
            <span className="flex-1" style={{ background: clubColors(display.club)[0] }} />
            <span className="flex-1" style={{ background: clubColors(display.club)[1] }} />
          </div>
        </div>
      </div>
      <p className="mt-4 text-xs uppercase tracking-[0.25em] text-slate-500">
        {settled ? "locked in" : "spinning..."}
      </p>
    </div>
  );
}
