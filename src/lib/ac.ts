import type { AcProfile, AcState, Command, ProfileValue, TemperatureBlock } from "./types.ts";

export const MODE_LABELS: Record<string, string> = {
  COOL: "Frio",
  HEAT: "Quente",
  FAN: "Ventilar",
  AIR_DRY: "Seco",
  AUTO: "Auto",
  AIR_CLEAN: "Purificar",
  ENERGY_SAVING: "Economia",
  AROMA: "Aroma",
};

const WIND_ORDER = ["SLOW", "LOW", "LOW_MID", "MID", "MID_HIGH", "HIGH", "POWER"];
const DEFAULT_MODES = ["COOL", "FAN", "AIR_DRY", "AUTO"];
const DEFAULT_WINDS = ["LOW", "MID", "HIGH", "AUTO"];
const TEMP_MODES = ["COOL", "HEAT", "AUTO"];

type Resource = Record<string, ProfileValue | undefined>;

function resource(profile: AcProfile | null, name: string): Resource | undefined {
  return profile?.property?.[name] as Resource | undefined;
}

export function tempBlock(state: AcState | null): TemperatureBlock | null {
  if (!state) return null;
  const t = state.temperatureInUnits;
  if (Array.isArray(t)) return t.find((x) => x?.unit === "C") ?? t[0] ?? null;
  if (t && typeof t === "object") return t;
  return state.temperature ?? null;
}

export const isOn = (state: AcState | null): boolean => state?.operation?.airConOperationMode === "POWER_ON";
export const jobMode = (state: AcState | null): string | null => state?.airConJobMode?.currentJobMode ?? null;
export const swingOn = (state: AcState | null): boolean => !!state?.windDirection?.rotateUpDown;
export const canSetTemp = (state: AcState | null): boolean => isOn(state) && TEMP_MODES.includes(jobMode(state) ?? "");

export function hasSwing(state: AcState | null, profile: AcProfile | null): boolean {
  return !!(resource(profile, "windDirection")?.rotateUpDown || (state?.windDirection && "rotateUpDown" in state.windDirection));
}

function windStepRange(profile: AcProfile | null): TempRange | null {
  const value = resource(profile, "airFlow")?.windStep?.value as
    | { w?: Partial<TempRange>; r?: Partial<TempRange> }
    | undefined;
  const range = value?.w ?? value?.r;
  if (typeof range?.min !== "number" || typeof range.max !== "number") return null;
  return { min: range.min, max: range.max, step: range.step || 1 };
}

export function windKey(state: AcState | null, profile: AcProfile | null): string {
  if (windStepRange(profile)) return "windStep";
  if (resource(profile, "airFlow")?.windStrengthDetail) return "windStrengthDetail";
  if (state?.airFlow?.windStrengthDetail && !state.airFlow.windStrength) return "windStrengthDetail";
  return "windStrength";
}

export function wind(state: AcState | null, profile: AcProfile | null): string | null {
  if (state?.airFlow?.windStrength === "AUTO") return "AUTO";
  const value = state?.airFlow?.[windKey(state, profile)];
  return value == null ? null : String(value);
}

export function windCommandKey(level: string, state: AcState | null, profile: AcProfile | null): string {
  const key = windKey(state, profile);
  if (level !== "AUTO" || key === "windStrength") return key;
  return writable(profile, "airFlow", key, []).includes("AUTO") ? key : "windStrength";
}

export const windCommandValue = (key: string, level: string): string | number => (key === "windStep" ? Number(level) : level);

function writable(profile: AcProfile | null, res: string, prop: string, fallback: string[]): string[] {
  const value = resource(profile, res)?.[prop]?.value;
  const list = value && (value.w || value.r);
  return Array.isArray(list) && list.length ? (list as string[]) : fallback;
}

export const modes = (profile: AcProfile | null): string[] =>
  writable(profile, "airConJobMode", "currentJobMode", DEFAULT_MODES);

export function windLevels(state: AcState | null, profile: AcProfile | null): string[] {
  const steps = windStepRange(profile);
  const list = steps
    ? Array.from({ length: Math.floor((steps.max - steps.min) / steps.step) + 1 }, (_, i) => String(steps.min + i * steps.step))
    : writable(profile, "airFlow", windKey(state, profile), DEFAULT_WINDS);
  const rank = (v: string) => (WIND_ORDER.includes(v) ? WIND_ORDER.indexOf(v) : 99);
  const levels = steps
    ? list
    : list.filter((v) => v !== "AUTO" && WIND_ORDER.includes(v)).sort((a, b) => rank(a) - rank(b));
  const autoAvailable =
    list.includes("AUTO") ||
    writable(profile, "airFlow", "windStrength", ["AUTO"]).includes("AUTO") ||
    state?.airFlow?.windStrength === "AUTO";
  return autoAvailable ? [...levels, "AUTO"] : levels;
}

export function windLabel(value: string | null, levels: string[]): string {
  if (value === "AUTO") return "Auto";
  const i = value ? levels.indexOf(value) : -1;
  return i >= 0 ? `Nível ${i + 1}` : (value ?? "--");
}

export interface TempRange {
  min: number;
  max: number;
  step: number;
}

export function tempRange(profile: AcProfile | null): TempRange {
  let res = (profile?.property?.temperatureInUnits ?? profile?.property?.temperature) as
    | Resource
    | (Resource & { unit?: string })[]
    | undefined;
  if (Array.isArray(res)) res = res.find((x) => x.unit === "C") ?? res[0];
  const tt = res?.targetTemperatureC ?? res?.targetTemperature;
  const raw = tt?.value as ({ w?: { min?: number; max?: number; step?: number } } & { min?: number; max?: number; step?: number }) | undefined;
  const v = raw?.w ?? raw;
  if (v && typeof v.min === "number" && typeof v.max === "number") return { min: v.min, max: v.max, step: v.step || 1 };
  return { min: 16, max: 30, step: 1 };
}

export function temperatureCommand(state: AcState | null, value: number): Command {
  const payload = { targetTemperature: value, unit: "C" };
  return state?.temperatureInUnits !== undefined ? { temperatureInUnits: payload } : { temperature: payload };
}
