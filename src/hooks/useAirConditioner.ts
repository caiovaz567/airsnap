import { useCallback, useEffect, useRef, useState } from "react";
import { NoLgAccountError, UnauthorizedError, api } from "../lib/api.ts";
import { withHud } from "../lib/hud.ts";
import { isOn, swingOn, tempBlock, tempRange, temperatureCommand, wind, windCommandKey, windCommandValue } from "../lib/ac.ts";
import { storage } from "../lib/storage.ts";
import type { AcProfile, AcState, Command, Device, LgDevice } from "../lib/types.ts";

interface CachedState {
  s: AcState;
  at: number;
}

const COMMAND_GAP_MS = 1500;
const RETRY_DELAY_MS = 1500;
const RETRIES = 2;
const SYNC_DELAY_MS = 4000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function useAirConditioner(onError: (e: unknown) => void) {
  const [devices, setDevices] = useState<Device[]>(() => storage.get<Device[]>("devices") ?? []);
  const [currentId, setCurrentId] = useState<string | null>(() => storage.get<string>("current"));
  const [state, setState] = useState<AcState | null>(() => {
    const id = storage.get<string>("current");
    return id ? (storage.get<CachedState>(`state.${id}`)?.s ?? null) : null;
  });
  const [profile, setProfile] = useState<AcProfile | null>(() => {
    const id = storage.get<string>("current");
    return id ? storage.get<AcProfile>(`profile.${id}`) : null;
  });
  const [updatedAt, setUpdatedAt] = useState<number | null>(() => {
    const id = storage.get<string>("current");
    return id ? (storage.get<CachedState>(`state.${id}`)?.at ?? null) : null;
  });
  const [pendingTarget, setPendingTarget] = useState<number | null>(null);

  const stateRef = useRef(state);
  stateRef.current = state;
  const idRef = useRef(currentId);
  idRef.current = currentId;
  const tempTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pendingRef = useRef<number | null>(null);
  const queueRef = useRef<Promise<unknown>>(Promise.resolve());
  const lastSentRef = useRef(0);
  const inFlightRef = useRef(0);

  const ensureDevice = useCallback(async (): Promise<string> => {
    const known = storage.get<Device[]>("devices") ?? [];
    if (idRef.current && known.some((d) => d.id === idRef.current)) return idRef.current;
    const list = await api<LgDevice[]>("GET", "devices");
    const acs = (list ?? [])
      .filter((d) => /AIR_CONDITIONER/.test(d.deviceInfo?.deviceType ?? ""))
      .map((d) => ({ id: d.deviceId, name: d.deviceInfo?.alias || d.deviceInfo?.modelName || "Ar-condicionado" }));
    if (!acs.length) throw new Error("Não achei nenhum ar-condicionado na sua conta LG.");
    storage.set("devices", acs);
    setDevices(acs);
    const id = acs.some((d) => d.id === idRef.current) ? (idRef.current as string) : acs[0].id;
    storage.set("current", id);
    idRef.current = id;
    setCurrentId(id);
    return id;
  }, []);

  const loadProfile = useCallback(async (id: string) => {
    const cached = storage.get<AcProfile>(`profile.${id}`);
    if (cached) {
      setProfile(cached);
      return;
    }
    try {
      const p = (await api<AcProfile>("GET", `devices/${id}/profile`)) ?? {};
      storage.set(`profile.${id}`, p);
      setProfile(p);
    } catch {
      setProfile({});
    }
  }, []);

  const loadState = useCallback(async (id: string) => {
    const s = (await api<AcState>("GET", `devices/${id}/state`)) ?? {};
    const at = Date.now();
    if (inFlightRef.current > 0) return;
    storage.set(`state.${id}`, { s, at });
    if (idRef.current === id) {
      setState(s);
      setUpdatedAt(at);
    }
  }, []);

  const refresh = useCallback(async (): Promise<boolean> => {
    try {
      const id = await ensureDevice();
      await loadProfile(id);
      await loadState(id);
      return true;
    } catch (e) {
      onError(e);
      return false;
    }
  }, [ensureDevice, loadProfile, loadState, onError]);

  useEffect(() => {
    refresh();
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refresh]);

  const selectDevice = useCallback(
    (id: string) => {
      storage.set("current", id);
      idRef.current = id;
      setCurrentId(id);
      const cached = storage.get<CachedState>(`state.${id}`);
      setState(cached?.s ?? null);
      setUpdatedAt(cached?.at ?? null);
      setProfile(storage.get<AcProfile>(`profile.${id}`));
      setPendingTarget(null);
      refresh();
    },
    [refresh],
  );

  const send = useCallback(async (id: string, body: Command) => {
    for (let attempt = 0; ; attempt++) {
      const wait = lastSentRef.current + COMMAND_GAP_MS - Date.now();
      if (wait > 0) await sleep(wait);
      try {
        await api("POST", `devices/${id}/control`, { body });
        lastSentRef.current = Date.now();
        return;
      } catch (e) {
        lastSentRef.current = Date.now();
        const fatal = e instanceof UnauthorizedError || e instanceof NoLgAccountError;
        if (fatal || attempt >= RETRIES) throw e;
        await sleep(RETRY_DELAY_MS * (attempt + 1));
      }
    }
  }, []);

  const control = useCallback(
    async (body: Command, optimistic: (s: AcState) => void) => {
      const id = idRef.current;
      if (!id || !stateRef.current) return;
      const next = structuredClone(stateRef.current);
      optimistic(next);
      setState(next);
      inFlightRef.current++;
      clearTimeout(syncTimer.current);
      const task = queueRef.current.then(() => withHud(() => send(id, body)));
      queueRef.current = task.catch(() => undefined);
      try {
        await task;
      } catch (e) {
        onError(e);
      } finally {
        inFlightRef.current--;
        if (inFlightRef.current === 0) {
          syncTimer.current = setTimeout(() => loadState(id).catch(() => undefined), SYNC_DELAY_MS);
        }
      }
    },
    [loadState, onError, send],
  );

  const togglePower = useCallback(() => {
    const next = isOn(stateRef.current) ? "POWER_OFF" : "POWER_ON";
    control({ operation: { airConOperationMode: next } }, (s) => {
      s.operation = { ...s.operation, airConOperationMode: next };
    });
  }, [control]);

  const setMode = useCallback(
    (mode: string) => {
      control({ airConJobMode: { currentJobMode: mode } }, (s) => {
        s.airConJobMode = { ...s.airConJobMode, currentJobMode: mode };
      });
    },
    [control],
  );

  const setTarget = useCallback(
    (value: number) => {
      const range = tempRange(profile);
      const t = Math.min(range.max, Math.max(range.min, value));
      pendingRef.current = t;
      setPendingTarget(t);
      clearTimeout(tempTimer.current);
      tempTimer.current = setTimeout(async () => {
        await control(temperatureCommand(stateRef.current, t), (s) => {
          const block = Array.isArray(s.temperatureInUnits)
            ? (s.temperatureInUnits.find((x) => x.unit === "C") ?? s.temperatureInUnits[0])
            : (s.temperatureInUnits ?? s.temperature);
          if (block) block.targetTemperature = t;
        });
        pendingRef.current = null;
        setPendingTarget(null);
      }, 700);
    },
    [control, profile],
  );

  const stepTarget = useCallback(
    (dir: 1 | -1) => {
      const range = tempRange(profile);
      const base = pendingRef.current ?? tempBlock(stateRef.current)?.targetTemperature ?? range.min;
      setTarget(base + dir * range.step);
    },
    [profile, setTarget],
  );

  const setWind = useCallback(
    (next: string) => {
      const current = wind(stateRef.current, profile);
      if (!next || next === current) return;
      const key = windCommandKey(next, stateRef.current, profile);
      const value = windCommandValue(key, next);
      control({ airFlow: { [key]: value } }, (s) => {
        const airFlow = { ...s.airFlow, [key]: value };
        if (next !== "AUTO" && airFlow.windStrength === "AUTO" && key !== "windStrength") delete airFlow.windStrength;
        s.airFlow = airFlow;
      });
    },
    [control, profile],
  );

  const toggleSwing = useCallback(() => {
    const next = !swingOn(stateRef.current);
    control({ windDirection: { rotateUpDown: next } }, (s) => {
      s.windDirection = { ...s.windDirection, rotateUpDown: next };
    });
  }, [control]);

  return {
    devices,
    currentId,
    device: devices.find((d) => d.id === currentId) ?? null,
    state,
    profile,
    updatedAt,
    pendingTarget,
    refresh,
    selectDevice,
    togglePower,
    setMode,
    setTarget,
    stepTarget,
    setWind,
    toggleSwing,
  };
}

export type AirConditioner = ReturnType<typeof useAirConditioner>;
