import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { List, ListItem, Toggle } from "konsta/react";
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  CloudSun,
  Droplets,
  Fan,
  Flame,
  Leaf,
  Minus,
  Plus,
  Power,
  Snowflake,
  Sparkles,
  Wind,
  type LucideIcon,
} from "lucide-react";
import {
  MODE_LABELS,
  canSetTemp,
  hasSwing,
  isOn,
  jobMode,
  modes,
  swingOn,
  tempBlock,
  tempRange,
  wind,
  windLabel,
  windLevels,
} from "../lib/ac.ts";
import { cx } from "../lib/cx.ts";
import { degrees } from "../lib/format.ts";
import type { AirConditioner } from "../hooks/useAirConditioner.ts";
import { AcUnit } from "./AcUnit.tsx";
import { RoundButton, Section, Slider } from "./ui.tsx";
import { WindSheet } from "./WindSheet.tsx";

const WIND_DELAY_MS = 600;

const MODE_ICONS: Record<string, LucideIcon> = {
  COOL: Snowflake,
  HEAT: Flame,
  FAN: Fan,
  AIR_DRY: Droplets,
  AUTO: Sparkles,
  AIR_CLEAN: Wind,
  ENERGY_SAVING: Leaf,
  AROMA: CloudSun,
};

export function ControlPanel({ ac, footer }: { ac: AirConditioner; footer?: ReactNode }) {
  const { state, profile, pendingTarget } = ac;
  const on = isOn(state);
  const temps = tempBlock(state);
  const range = tempRange(profile);
  const target = pendingTarget ?? temps?.targetTemperature ?? null;
  const mode = jobMode(state);
  const levels = windLevels(state, profile);
  const currentWind = wind(state, profile);
  const modeList = modes(profile);
  const [windOpen, setWindOpen] = useState(false);
  const [pendingWind, setPendingWind] = useState<string | null>(null);
  const windTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const shownWind = pendingWind ?? currentWind;
  const windSteps = levels.filter((l) => l !== "AUTO");
  const windIndex = windSteps.indexOf(shownWind ?? "");

  const stepWind = (dir: 1 | -1) => {
    const next = windSteps[windIndex < 0 ? 0 : Math.min(windSteps.length - 1, Math.max(0, windIndex + dir))];
    if (!next || next === shownWind) return;
    setPendingWind(next);
    clearTimeout(windTimer.current);
    windTimer.current = setTimeout(() => {
      ac.setWind(next);
      setPendingWind(null);
    }, WIND_DELAY_MS);
  };

  return (
    <div className="flex flex-col gap-6">
      <Section className="flex flex-col items-center gap-2 !pt-4 !pb-7 text-center">
        <AcUnit on={on} mode={mode} intensity={currentWind === "AUTO" || windIndex < 0 ? 0.6 : (windIndex + 1) / Math.max(1, windSteps.length)} />
        <span className="text-sm text-white/70">Temperatura da sala</span>
        <span className="text-7xl leading-none font-extralight tracking-tight tabular-nums">{degrees(temps?.currentTemperature)}</span>
        <span
          className={cx(
            "mt-1 rounded-full px-3 py-1 text-sm font-semibold",
            on ? "bg-green-500/15 text-green-500" : "bg-black/5 opacity-70 dark:bg-white/10",
          )}
        >
          {state ? (on ? `Ligado · ${MODE_LABELS[mode ?? ""] ?? mode}` : "Desligado") : "Carregando…"}
        </span>
        <button
          type="button"
          aria-label={on ? "Desligar" : "Ligar"}
          aria-pressed={on}
          disabled={!state}
          onClick={ac.togglePower}
          className={cx(
            "mt-4 grid h-20 w-20 place-items-center rounded-full transition active:scale-95 disabled:opacity-40",
            on ? "bg-primary text-white shadow-lg shadow-primary/40" : "bg-black/5 dark:bg-white/10",
          )}
        >
          <Power size={32} strokeWidth={2.25} />
        </button>
        <span className="text-sm text-white/70">{on ? "Toque para desligar" : "Toque para ligar"}</span>
      </Section>

      <Section title="Temperatura desejada" disabled={!canSetTemp(state)} className="flex flex-col gap-4">
        <div className="grid grid-cols-[44px_1fr_44px] items-center">
          <RoundButton label="Diminuir" onClick={() => ac.stepTarget(-1)}>
            <Minus size={20} />
          </RoundButton>
          <span className="text-center text-5xl font-light tabular-nums">
            {degrees(target)}
            <span className="text-2xl text-white/70">C</span>
          </span>
          <RoundButton label="Aumentar" onClick={() => ac.stepTarget(1)}>
            <Plus size={20} />
          </RoundButton>
        </div>
        <Slider
          label="Temperatura desejada"
          value={target ?? range.min}
          min={range.min}
          max={range.max}
          step={range.step}
          onChange={ac.setTarget}
        />
        <div className="-mt-2 flex justify-between text-sm text-white/70">
          <span>{range.min}°</span>
          <span>{range.max}°</span>
        </div>
      </Section>

      <Section title="Modo" disabled={!on}>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(68px,1fr))] gap-2">
          {modeList.map((m) => {
            const Icon = MODE_ICONS[m] ?? Sparkles;
            const active = m === mode;
            return (
              <button
                key={m}
                type="button"
                aria-pressed={active}
                onClick={() => ac.setMode(m)}
                className={cx(
                  "flex h-[76px] flex-col items-center justify-center gap-1.5 rounded-2xl text-sm font-medium transition active:scale-95",
                  active ? "bg-primary text-white" : "bg-black/5 dark:bg-white/10",
                )}
              >
                <Icon size={22} />
                {MODE_LABELS[m] ?? m}
              </button>
            );
          })}
        </div>
      </Section>

      <section className={cx("transition-opacity", !on && "pointer-events-none opacity-40")}>
        <List strong inset className="!my-0">
          <ListItem
            title="Ventilação"
            media={<Fan size={22} className="text-primary" />}
            role="button"
            tabIndex={0}
            aria-label={`Ventilação: ${windLabel(shownWind, levels)}. Abrir seletor`}
            onClick={() => setWindOpen(true)}
            onKeyDown={(e: KeyboardEvent) => (e.key === "Enter" || e.key === " ") && setWindOpen(true)}
            className="cursor-pointer transition-colors active:bg-white/5"
            after={
              <div className="flex items-center gap-1 text-current" onClick={(e) => e.stopPropagation()}>
                <RoundButton label="Menos vento" onClick={() => stepWind(-1)}>
                  <ChevronLeft size={18} />
                </RoundButton>
                <button
                  type="button"
                  aria-label="Abrir seletor de ventilação"
                  onClick={() => setWindOpen(true)}
                  className="min-w-[4.5rem] text-center font-semibold text-primary active:opacity-60"
                >
                  {windLabel(shownWind, levels)}
                </button>
                <RoundButton label="Mais vento" onClick={() => stepWind(1)}>
                  <ChevronRight size={18} />
                </RoundButton>
              </div>
            }
          />
          {hasSwing(state, profile) && (
            <ListItem
              label
              title="Circular (cima/baixo)"
              media={<ArrowUpDown size={22} className="text-primary" />}
              after={<Toggle checked={swingOn(state)} onChange={ac.toggleSwing} />}
            />
          )}
        </List>
      </section>

      <WindSheet
        opened={windOpen}
        levels={levels}
        current={currentWind}
        onChange={ac.setWind}
        onClose={() => setWindOpen(false)}
      />

      {footer}
    </div>
  );
}
