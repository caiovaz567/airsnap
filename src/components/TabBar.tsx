import { AirVent, CircleUser, Zap } from "lucide-react";
import { cx } from "../lib/cx.ts";
import type { Tab } from "./layout.ts";

const ITEMS: { id: Tab; label: string; icon: typeof Zap }[] = [
  { id: "control", label: "Controle", icon: AirVent },
  { id: "energy", label: "Energia", icon: Zap },
  { id: "account", label: "Conta", icon: CircleUser },
];

export function TabBar({ tab, onChange }: { tab: Tab; onChange: (tab: Tab) => void }) {
  return (
    <nav
      aria-label="Seções"
      className="fixed inset-x-0 bottom-0 z-30 flex justify-center px-6 pt-3"
      style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}
    >
      <div className="flex w-full max-w-sm gap-1 rounded-full border border-white/10 bg-neutral-900/80 p-1.5 shadow-2xl shadow-black/60 backdrop-blur-2xl">
        {ITEMS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            aria-current={tab === id ? "page" : undefined}
            onClick={() => onChange(id)}
            className={cx(
              "flex flex-1 flex-col items-center gap-0.5 rounded-full py-2 text-[13px] font-semibold transition",
              tab === id ? "bg-white/10 text-primary" : "text-white/60 active:text-white",
            )}
          >
            <Icon size={22} />
            {label}
          </button>
        ))}
      </div>
    </nav>
  );
}
