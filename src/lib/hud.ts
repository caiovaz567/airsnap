export type HudPhase = "loading" | "success" | "error";

export type HudState = { phase: "hidden" } | { phase: HudPhase; label: string; id: number };

export interface HudLabels {
  loading: string;
  success: string;
  error: string;
}

const DEFAULT_LABELS: HudLabels = { loading: "Enviando…", success: "Pronto!", error: "Não deu certo" };
const SUCCESS_MS = 1000;
const ERROR_MS = 1600;

const listeners = new Set<(state: HudState) => void>();
let current: HudState = { phase: "hidden" };
let sequence = 0;
let hideTimer: ReturnType<typeof setTimeout> | undefined;

function emit(state: HudState) {
  current = state;
  listeners.forEach((fn) => fn(state));
}

export function subscribeHud(fn: (state: HudState) => void): () => void {
  listeners.add(fn);
  fn(current);
  return () => {
    listeners.delete(fn);
  };
}

function finish(id: number, phase: "success" | "error", label: string) {
  if (id !== sequence) return;
  emit({ phase, label, id });
  hideTimer = setTimeout(() => emit({ phase: "hidden" }), phase === "success" ? SUCCESS_MS : ERROR_MS);
}

export async function withHud<T>(task: () => Promise<T>, labels: Partial<HudLabels> = {}): Promise<T> {
  const text = { ...DEFAULT_LABELS, ...labels };
  const id = ++sequence;
  clearTimeout(hideTimer);
  emit({ phase: "loading", label: text.loading, id });
  try {
    const result = await task();
    finish(id, "success", text.success);
    return result;
  } catch (e) {
    finish(id, "error", text.error);
    throw e;
  }
}
