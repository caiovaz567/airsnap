import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api.ts";
import { fillBars, lastPastIndex, monthToDateSlots, summarize, viewRange, type MonthSummary } from "../lib/energy.ts";
import { startOfToday, ym, ymd } from "../lib/format.ts";
import { storage } from "../lib/storage.ts";
import type { Bar, Period, UsagePoint } from "../lib/types.ts";

const FRESH_MS = 10 * 60 * 1000;

interface EnergyProfile {
  result?: { property?: (string | { property?: string; name?: string })[] };
}

interface EnergyUsage {
  result?: { dataList?: Record<string, unknown>[] };
}

async function energyProperty(deviceId: string): Promise<string> {
  const cached = storage.get<string>(`eprop.${deviceId}`);
  if (cached) return cached;
  const profile = await api<EnergyProfile>("GET", `devices/${deviceId}/energy-profile`);
  const first = profile?.result?.property?.[0];
  const prop = typeof first === "string" ? first : (first?.property ?? first?.name);
  if (!prop) throw new Error("Seu ar não manda dados de energia pela LG.");
  storage.set(`eprop.${deviceId}`, prop);
  return prop;
}

async function usage(
  deviceId: string,
  period: "DAILY" | "MONTHLY",
  start: string,
  end: string,
  force: boolean,
): Promise<{ list: UsagePoint[]; at: number }> {
  const cacheKey = `energy.${deviceId}.${period}.${start}.${end}`;
  const cached = storage.get<{ at: number; list: UsagePoint[] }>(cacheKey);
  const today = new Date();
  const isPast = end < (period === "MONTHLY" ? ym(today) : ymd(today));
  if (cached && !force && (isPast || Date.now() - cached.at < FRESH_MS)) return cached;

  const prop = await energyProperty(deviceId);
  const data = await api<EnergyUsage>("GET", `devices/${deviceId}/energy-usage`, {
    query: { property: prop, period, startDate: start, endDate: end },
  });
  const list = (data?.result?.dataList ?? []).map((item) => {
    const key = Object.values(item).find((v): v is string => typeof v === "string" && /^\d{6,8}$/.test(v)) ?? null;
    const wh = Number(item[prop] ?? item.energyUsage) || 0;
    return { key, kwh: wh / 1000 };
  });
  const fresh = { at: Date.now(), list };
  storage.set(cacheKey, fresh);
  return fresh;
}

export function useEnergy(deviceId: string | null, enabled: boolean, onError: (e: unknown) => void) {
  const [summary, setSummary] = useState<MonthSummary | null>(() =>
    deviceId ? storage.get<MonthSummary>(`etop.${deviceId}`) : null,
  );
  const [period, setPeriodState] = useState<Period>(() => storage.get<Period>("eperiod") ?? "month");
  const [offset, setOffset] = useState(0);
  const [bars, setBars] = useState<Bar[]>([]);
  const [title, setTitle] = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const loadSummary = useCallback(
    async (force: boolean) => {
      if (!deviceId) return;
      const now = startOfToday();
      const slots = monthToDateSlots(now);
      const { list, at } = await usage(deviceId, "DAILY", slots[0].key, ymd(now), force);
      const s = summarize(
        fillBars(slots, list).map((b) => b.kwh),
        at,
        now,
      );
      storage.set(`etop.${deviceId}`, s);
      setSummary(s);
    },
    [deviceId],
  );

  const loadView = useCallback(
    async (force: boolean) => {
      if (!deviceId) return;
      const range = viewRange(period, offset);
      setTitle(range.title);
      const { list } = await usage(deviceId, range.period, range.start, range.end, force);
      const next = fillBars(range.slots, list);
      setBars(next);
      setSelected((sel) => (sel == null || sel >= next.length ? lastPastIndex(next) : sel));
    },
    [deviceId, period, offset],
  );

  const refresh = useCallback(
    async (force = true): Promise<boolean> => {
      setLoading(true);
      try {
        await Promise.all([loadSummary(force), loadView(force)]);
        return true;
      } catch (e) {
        onError(e);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [loadSummary, loadView, onError],
  );

  useEffect(() => {
    if (!deviceId) return;
    setSummary(storage.get<MonthSummary>(`etop.${deviceId}`));
    loadSummary(false).catch(onError);
  }, [deviceId, loadSummary, onError]);

  useEffect(() => {
    if (!enabled || !deviceId) return;
    setLoading(true);
    loadView(false)
      .catch(onError)
      .finally(() => setLoading(false));
  }, [enabled, deviceId, loadView, onError]);

  const setPeriod = useCallback((p: Period) => {
    storage.set("eperiod", p);
    setPeriodState(p);
    setOffset(0);
    setSelected(null);
  }, []);

  const move = useCallback((dir: 1 | -1) => {
    setOffset((o) => Math.min(0, o + dir));
    setSelected(null);
  }, []);

  return { summary, period, setPeriod, offset, move, bars, title, selected, setSelected, loading, refresh };
}

export type Energy = ReturnType<typeof useEnergy>;
