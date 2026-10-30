import { niceMax } from "../lib/energy.ts";
import { cx } from "../lib/cx.ts";
import { brl, kwh } from "../lib/format.ts";
import type { Bar } from "../lib/types.ts";

export function BarChart({
  bars,
  selected,
  onSelect,
  price,
  tall,
}: {
  bars: Bar[];
  selected: number | null;
  onSelect: (i: number) => void;
  price: number;
  tall?: boolean;
}) {
  const max = niceMax(Math.max(0, ...bars.map((b) => b.kwh)));
  const current = selected != null ? bars[selected] : undefined;

  return (
    <div>
      <div className={cx("relative ml-8", tall ? "h-64" : "h-44")}>
        {[0, 0.5, 1].map((f) => (
          <div key={f} className="absolute inset-x-0 border-t border-black/10 dark:border-white/10" style={{ bottom: `${f * 100}%` }}>
            <span className="absolute -top-2 -left-9 w-7 text-right text-xs tabular-nums text-white/70">
              {(max * f).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
            </span>
          </div>
        ))}
        <div className="absolute inset-0 flex items-end gap-[2px]">
          {bars.map((b, i) => (
            <button
              key={b.key}
              type="button"
              aria-label={`${b.long}: ${kwh(b.kwh)}`}
              onClick={() => onSelect(i)}
              onMouseEnter={() => onSelect(i)}
              className="flex h-full min-w-0 flex-1 items-end justify-center"
            >
              <span
                className={cx(
                  "w-full max-w-8 rounded-t-[4px] transition-colors",
                  i === selected ? "bg-primary" : "bg-teal-500/70",
                )}
                style={{ height: `${(b.kwh / max) * 100}%` }}
              />
            </button>
          ))}
        </div>
      </div>
      <div className="mt-1 ml-8 flex gap-[2px]">
        {bars.map((b) => (
          <span key={b.key} className="min-w-0 flex-1 text-center text-xs text-white/70">
            {b.label}
          </span>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-black/5 px-4 py-3 text-sm dark:bg-white/5">
        <span className="opacity-70">{current?.long ?? "--"}</span>
        <span className="font-semibold tabular-nums">
          {!current || current.future ? "--" : `${kwh(current.kwh)} · ${brl(current.kwh * price)}`}
        </span>
      </div>
    </div>
  );
}
