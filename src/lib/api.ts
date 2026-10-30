import { supabase } from "./supabase.ts";

export class UnauthorizedError extends Error {}
export class NoLgAccountError extends Error {}

interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
  code?: string | null;
}

const listeners = new Set<(busy: boolean) => void>();
let pending = 0;

function notify() {
  listeners.forEach((fn) => fn(pending > 0));
}

export function onBusyChange(fn: (busy: boolean) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export async function api<T>(
  method: "GET" | "POST",
  route: string,
  options: { query?: Record<string, string>; body?: unknown } = {},
): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new UnauthorizedError("Sua sessão expirou. Entre de novo.");

  const params = new URLSearchParams({ route, ...options.query });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  pending++;
  notify();
  try {
    let response: Response;
    try {
      response = await fetch(`/api/lg?${params}`, {
        method,
        headers: { authorization: `Bearer ${token}`, "x-airsnap": "1", "content-type": "application/json" },
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });
    } catch (e) {
      const aborted = e instanceof Error && e.name === "AbortError";
      throw new Error(aborted ? "Demorou demais. Tente de novo." : "Sem internet?");
    }
    const json = (await response
      .json()
      .catch(() => ({ ok: false, error: "Resposta estranha do servidor." }))) as ApiResponse<T>;
    if (response.status === 401) throw new UnauthorizedError(json.error || "Sua sessão expirou. Entre de novo.");
    if (json.code === "NO_LG_ACCOUNT") throw new NoLgAccountError(json.error || "Conecte sua conta LG ThinQ.");
    if (!json.ok) throw new Error(json.error || "Algo deu errado.");
    return json.data as T;
  } finally {
    clearTimeout(timer);
    pending--;
    notify();
  }
}

export interface AccountStatus {
  connected: boolean;
  country: string | null;
}

export const getAccount = () => api<AccountStatus>("GET", "account");
export const connectAccount = (token: string, country: string) =>
  api<AccountStatus & { airConditioners: number }>("POST", "account/connect", { body: { token, country } });
export const disconnectAccount = () => api<AccountStatus>("POST", "account/disconnect");
export const deleteAccount = () => api<{ deleted: boolean }>("POST", "account/delete");
