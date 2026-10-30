import { MONTHS, MONTHS_LONG, WEEKDAYS, daysIn, pad, startOfToday, ym, ymd } from "./format.ts";
import type { Bar, Period, Slot, UsagePoint } from "./types.ts";

export interface ViewRange {
  slots: Slot[];
  title: string;
  period: "DAILY" | "MONTHLY";
  start: string;
  end: string;
}

export function viewRange(kind: Period, offset: number): ViewRange {
  const now = startOfToday();
  const slots: Slot[] = [];

  if (kind === "week") {
    const sunday = new Date(now);
    sunday.setDate(now.getDate() - now.getDay() + offset * 7);
    for (let i = 0; i < 7; i++) {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      slots.push({
        key: ymd(d),
        label: WEEKDAYS[i],
        long: `${WEEKDAYS[i].toLowerCase()}, ${d.getDate()} de ${MONTHS[d.getMonth()]}`,
        future: d > now,
      });
    }
    const saturday = new Date(sunday);
    saturday.setDate(sunday.getDate() + 6);
    return {
      slots,
      title: `${pad(sunday.getDate())}/${pad(sunday.getMonth() + 1)} – ${pad(saturday.getDate())}/${pad(saturday.getMonth() + 1)}`,
      period: "DAILY",
      start: slots[0].key,
      end: ymd(saturday < now ? saturday : now),
    };
  }

  if (kind === "month") {
    const first = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const total = daysIn(first.getFullYear(), first.getMonth());
    for (let day = 1; day <= total; day++) {
      const d = new Date(first.getFullYear(), first.getMonth(), day);
      slots.push({
        key: ymd(d),
        label: day === 1 || day % 5 === 0 ? String(day) : "",
        long: `${day} de ${MONTHS[first.getMonth()]}`,
        future: d > now,
      });
    }
    const last = new Date(first.getFullYear(), first.getMonth(), total);
    return {
      slots,
      title: `${MONTHS_LONG[first.getMonth()]} de ${first.getFullYear()}`,
      period: "DAILY",
      start: slots[0].key,
      end: ymd(last < now ? last : now),
    };
  }

  const year = now.getFullYear() + offset;
  for (let m = 0; m < 12; m++) {
    const d = new Date(year, m, 1);
    slots.push({ key: ym(d), label: MONTHS[m].charAt(0).toUpperCase(), long: `${MONTHS_LONG[m]} de ${year}`, future: d > now });
  }
  return {
    slots,
    title: String(year),
    period: "MONTHLY",
    start: `${year}01`,
    end: year === now.getFullYear() ? ym(now) : `${year}12`,
  };
}

export function fillBars(slots: Slot[], list: UsagePoint[]): Bar[] {
  const keyed = list.some((x) => x.key);
  const byKey = new Map(list.filter((x) => x.key).map((x) => [x.key as string, x.kwh]));
  return slots.map((s, i) => ({ ...s, kwh: (keyed ? byKey.get(s.key) : list[i]?.kwh) ?? 0 }));
}

export function lastPastIndex(bars: Bar[]): number {
  for (let i = bars.length - 1; i >= 0; i--) if (!bars[i].future) return i;
  return 0;
}

export function niceMax(v: number): number {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  for (const s of [1, 2, 2.5, 5, 10]) if (s * p >= v) return s * p;
  return 10 * p;
}

export interface MonthSummary {
  today: number;
  month: number;
  average: number;
  monthName: string;
  at: number;
}

export function summarize(days: number[], at: number, now = startOfToday()): MonthSummary {
  const today = days.length ? days[days.length - 1] : 0;
  const month = days.reduce((a, b) => a + b, 0);
  const finished = days.slice(0, -1);
  const average = finished.length ? finished.reduce((a, b) => a + b, 0) / finished.length : today;
  return { today, month, average, monthName: MONTHS_LONG[now.getMonth()], at };
}

export function monthToDateSlots(now = startOfToday()): Slot[] {
  return Array.from({ length: now.getDate() }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth(), i + 1);
    return { key: ymd(d), label: "", long: "", future: false };
  });
}
