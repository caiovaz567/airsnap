import { useEffect, useState } from "react";
import { cx } from "../lib/cx.ts";
import { subscribeHud, type HudPhase, type HudState } from "../lib/hud.ts";
import { Spinner } from "./ui.tsx";

type Visible = Extract<HudState, { phase: HudPhase }>;

function StrokeIcon({ d, className }: { d: string; className: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cx("hud-pop h-10 w-10", className)} aria-hidden="true">
      <path d={d} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="hud-draw" />
    </svg>
  );
}

export function Hud() {
  const [state, setState] = useState<HudState>({ phase: "hidden" });
  const [last, setLast] = useState<Visible | null>(null);

  useEffect(
    () =>
      subscribeHud((next) => {
        setState(next);
        if (next.phase !== "hidden") setLast(next);
      }),
    [],
  );

  if (!last) return null;
  const open = state.phase !== "hidden";

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy={state.phase === "loading"}
      className={cx(
        "fixed inset-0 z-50 grid place-items-center",
        state.phase === "loading" ? "pointer-events-auto cursor-wait" : "pointer-events-none",
      )}
    >
      <div
        key={last.id}
        className={cx(
          "hud-in flex h-28 w-28 flex-col items-center justify-center gap-2 rounded-[28px] bg-neutral-900/90 shadow-xl shadow-black/50 ring-1 ring-white/5 backdrop-blur-2xl transition-all duration-300",
          open ? "scale-100 opacity-100" : "scale-95 opacity-0",
        )}
      >
        <div key={last.phase} className="grid h-10 w-10 place-items-center">
          {last.phase === "loading" && <Spinner className="h-9 w-9 text-white" />}
          {last.phase === "success" && <StrokeIcon d="M5 12.5l4.5 4.5L19 7.5" className="text-green-400" />}
          {last.phase === "error" && <StrokeIcon d="M7 7l10 10M17 7L7 17" className="hud-shake text-red-400" />}
        </div>
        <span className="px-2 text-center text-sm font-medium text-white/90">{last.label}</span>
      </div>
    </div>
  );
}
