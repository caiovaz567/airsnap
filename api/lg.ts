import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const API_KEY = "v6GFvkweNo7DK7yD3ylIZ9w52aKBU0eJ7wLXkSR3";
const LG_TIMEOUT_MS = 10000;
const ACCOUNT_CACHE_MS = 60000;
const CONNECT_LIMIT = 5;
const CONNECT_WINDOW_MS = 10 * 60000;

const REGIONS: Record<string, string[]> = {
  kic: "AU BD CN HK ID IN JP KH KR LA LK MM MY NP NZ PH SG TH TW VN".split(" "),
  aic: "AG AR AW BB BO BR BS BZ CA CL CO CR CU DM DO EC GD GT GY HN HT JM KN LC MX NI PA PE PR PY SR SV TT US UY VC VE".split(" "),
  eic: "AE AF AL AM AO AT AZ BA BE BF BG BH BJ BY CD CF CG CH CI CM CV CY CZ DE DJ DK DZ EE EG ES ET FI FR GA GB GE GH GM GN GQ GR HR HU IE IL IQ IR IS IT JO KE KG KW KZ LB LR LT LU LV LY MA MD ME MK ML MR MT MU MW NE NG NL NO OM PK PL PS PT QA RO RS RU RW SA SD SE SI SK SL SN SO ST SY TD TG TN TR TZ UA UG UZ XK YE ZA ZM".split(" "),
};

const ERRORS: Record<string, string> = {
  "1103": "Token da LG inválido. Gere um novo token e conecte de novo.",
  "1218": "Token da LG expirado. Gere um novo token e conecte de novo.",
  "1222": "O aparelho está desconectado da internet.",
  "2201": "O aparelho está ocupado agora. Tente de novo.",
  "2207": "O aparelho está desligado ou não aceita esse comando agora.",
};

interface Config {
  supabaseUrl: string;
  secretKey: string;
  encryptionKey: Buffer;
}

interface LgAccount {
  token: string;
  country: string;
}

interface LgPayload {
  response?: unknown;
  error?: { code?: string; message?: string };
}

interface LgResult {
  ok: boolean;
  status: number;
  data: unknown;
  code?: string;
  message?: string;
}

let admin: SupabaseClient | null = null;
const accountCache = new Map<string, { account: LgAccount | null; at: number }>();
const connectAttempts = new Map<string, number[]>();

export async function GET(request: Request): Promise<Response> {
  return handle(request);
}

export async function POST(request: Request): Promise<Response> {
  return handle(request);
}

async function handle(request: Request): Promise<Response> {
  const config = readConfig();
  if (!config) return fail(500, "O servidor ainda não foi configurado.");
  if (request.headers.get("x-airsnap") !== "1") return fail(403, "Pedido bloqueado.");

  const userId = await authenticate(request, config);
  if (!userId) return fail(401, "Sua sessão expirou. Entre de novo.");

  const query = new URL(request.url).searchParams;
  const route = query.get("route") || "";
  const method = request.method;

  if (method === "GET" && route === "account") return accountStatus(userId, config);
  if (method === "POST" && route === "account/connect") return connectAccount(request, userId, config);
  if (method === "POST" && route === "account/disconnect") return disconnectAccount(userId, config);
  if (method === "POST" && route === "account/delete") return deleteAccount(userId, config);

  let account: LgAccount | null;
  try {
    account = await loadAccount(userId, config);
  } catch {
    return fail(500, "Não consegui ler sua conta. Tente de novo.");
  }
  if (!account) return fail(409, "Conecte sua conta LG ThinQ primeiro.", "NO_LG_ACCOUNT");

  let m: RegExpMatchArray | null;
  if (method === "GET" && route === "devices") {
    return relay(await callLg(account, userId, "GET", "devices"));
  }
  if (method === "GET" && (m = route.match(/^devices\/([A-Za-z0-9_-]+)\/(state|profile)$/))) {
    return relay(await callLg(account, userId, "GET", `devices/${m[1]}/${m[2]}`));
  }
  if (method === "GET" && (m = route.match(/^devices\/([A-Za-z0-9_-]+)\/energy-profile$/))) {
    return relay(await callLg(account, userId, "GET", `devices/energy/${m[1]}/profile`));
  }
  if (method === "GET" && (m = route.match(/^devices\/([A-Za-z0-9_-]+)\/energy-usage$/))) {
    const property = query.get("property") || "";
    const period = query.get("period") || "";
    const startDate = query.get("startDate") || "";
    const endDate = query.get("endDate") || "";
    if (
      !/^[A-Za-z0-9_]+$/.test(property) ||
      !/^(DAILY|MONTHLY)$/.test(period) ||
      !/^\d{6}(\d{2})?$/.test(startDate) ||
      !/^\d{6}(\d{2})?$/.test(endDate)
    ) {
      return fail(400, "Pedido de energia inválido.");
    }
    const qs = new URLSearchParams({ property, period, startDate, endDate });
    return relay(await callLg(account, userId, "GET", `devices/energy/${m[1]}/usage?${qs}`));
  }
  if (method === "POST" && (m = route.match(/^devices\/([A-Za-z0-9_-]+)\/control$/))) {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return fail(400, "Comando inválido.");
    }
    return relay(await callLg(account, userId, "POST", `devices/${m[1]}/control`, body));
  }
  return fail(404, "Rota desconhecida.");
}

function readConfig(): Config | null {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  const keyText = process.env.TOKEN_ENCRYPTION_KEY;
  if (!supabaseUrl || !secretKey || !keyText) return null;
  const encryptionKey = Buffer.from(keyText, "base64url");
  if (encryptionKey.length !== 32) return null;
  return { supabaseUrl, secretKey, encryptionKey };
}

function supabase(config: Config): SupabaseClient {
  admin ??= createClient(config.supabaseUrl, config.secretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return admin;
}

async function authenticate(request: Request, config: Config): Promise<string | null> {
  const header = request.headers.get("authorization") ?? "";
  if (!header.startsWith("Bearer ")) return null;
  const { data, error } = await supabase(config).auth.getClaims(header.slice(7));
  const sub = data?.claims?.sub;
  return !error && typeof sub === "string" ? sub : null;
}

function encrypt(plain: string, config: Config, userId: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", config.encryptionKey, iv);
  cipher.setAAD(Buffer.from(userId));
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return ["v1", iv, cipher.getAuthTag(), encrypted].map((p) => (typeof p === "string" ? p : p.toString("base64url"))).join(".");
}

function decrypt(stored: string, config: Config, userId: string): string {
  const [version, iv, tag, encrypted] = stored.split(".");
  if (version !== "v1" || !iv || !tag || !encrypted) throw new Error("Formato desconhecido");
  const decipher = createDecipheriv("aes-256-gcm", config.encryptionKey, Buffer.from(iv, "base64url"));
  decipher.setAAD(Buffer.from(userId));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encrypted, "base64url")), decipher.final()]).toString("utf8");
}

async function loadAccount(userId: string, config: Config): Promise<LgAccount | null> {
  const cached = accountCache.get(userId);
  if (cached && Date.now() - cached.at < ACCOUNT_CACHE_MS) return cached.account;
  const { data, error } = await supabase(config)
    .from("thinq_accounts")
    .select("token_encrypted, country")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const account = data ? { token: decrypt(data.token_encrypted as string, config, userId), country: data.country as string } : null;
  accountCache.set(userId, { account, at: Date.now() });
  return account;
}

async function accountStatus(userId: string, config: Config): Promise<Response> {
  try {
    const account = await loadAccount(userId, config);
    return ok({ connected: !!account, country: account?.country ?? null });
  } catch {
    return fail(500, "Não consegui ler sua conta. Tente de novo.");
  }
}

async function connectAccount(request: Request, userId: string, config: Config): Promise<Response> {
  const now = Date.now();
  const recent = (connectAttempts.get(userId) ?? []).filter((t) => now - t < CONNECT_WINDOW_MS);
  if (recent.length >= CONNECT_LIMIT) return fail(429, "Muitas tentativas. Espere alguns minutos.");
  connectAttempts.set(userId, [...recent, now]);

  let token = "";
  let country = "";
  try {
    const body = (await request.json()) as { token?: unknown; country?: unknown };
    token = typeof body.token === "string" ? body.token.trim() : "";
    country = typeof body.country === "string" ? body.country.trim().toUpperCase() : "";
  } catch {
    return fail(400, "Dados inválidos.");
  }
  if (!regionFor(country)) return fail(400, "País não suportado pela LG ThinQ.");
  if (!/^[A-Za-z0-9._~+/=-]{20,1024}$/.test(token)) return fail(400, "Esse token não parece certo. Copie de novo.");

  const account = { token, country };
  const result = await callLg(account, userId, "GET", "devices");
  if (!result.ok) {
    const invalid = result.status === 401 || result.code === "1103" || result.code === "1218";
    return fail(400, invalid ? "A LG não aceitou esse token. Gere outro e cole de novo." : (result.message ?? "Não consegui falar com a LG."));
  }
  const devices = Array.isArray(result.data) ? (result.data as { deviceInfo?: { deviceType?: string } }[]) : [];
  const acs = devices.filter((d) => /AIR_CONDITIONER/.test(d.deviceInfo?.deviceType ?? "")).length;
  if (!acs) return fail(400, "Essa conta LG não tem nenhum ar-condicionado. O AirSnap só funciona com ar-condicionado LG ThinQ.");

  const { error } = await supabase(config)
    .from("thinq_accounts")
    .upsert({ user_id: userId, token_encrypted: encrypt(token, config, userId), country, updated_at: new Date().toISOString() });
  if (error) return fail(500, "Não consegui salvar. Tente de novo.");
  accountCache.set(userId, { account, at: Date.now() });
  return ok({ connected: true, country, airConditioners: acs });
}

async function disconnectAccount(userId: string, config: Config): Promise<Response> {
  const { error } = await supabase(config).from("thinq_accounts").delete().eq("user_id", userId);
  if (error) return fail(500, "Não consegui desconectar. Tente de novo.");
  accountCache.set(userId, { account: null, at: Date.now() });
  return ok({ connected: false });
}

async function deleteAccount(userId: string, config: Config): Promise<Response> {
  const db = supabase(config);
  const removed = await db.from("thinq_accounts").delete().eq("user_id", userId);
  if (removed.error) return fail(500, "Não consegui apagar sua conta. Tente de novo.");
  const { error } = await db.auth.admin.deleteUser(userId);
  if (error) return fail(500, "Não consegui apagar sua conta. Tente de novo.");
  accountCache.delete(userId);
  return ok({ deleted: true });
}

function regionFor(country: string): string | null {
  for (const [region, list] of Object.entries(REGIONS)) if (list.includes(country)) return region;
  return null;
}

async function callLg(account: LgAccount, userId: string, method: "GET" | "POST", endpoint: string, body?: unknown): Promise<LgResult> {
  const region = regionFor(account.country) ?? "aic";
  const headers: Record<string, string> = {
    Authorization: `Bearer ${account.token}`,
    "x-country": account.country,
    "x-message-id": randomBytes(16).toString("base64url"),
    "x-client-id": `thinq-open-${createHash("sha256").update(userId).digest("hex").slice(0, 32)}`,
    "x-api-key": API_KEY,
    "x-service-phase": "OP",
    "Content-Type": "application/json",
  };
  if (method === "POST") headers["x-conditional-control"] = "true";

  let res: Response;
  try {
    res = await fetch(`https://api-${region}.lgthinq.com/${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(LG_TIMEOUT_MS),
    });
  } catch (e) {
    const name = e instanceof Error ? e.name : "";
    const timedOut = name === "TimeoutError" || name === "AbortError";
    return { ok: false, status: 504, data: null, message: timedOut ? "A LG demorou demais para responder." : "Não consegui falar com a LG." };
  }

  let payload: LgPayload | null = null;
  try {
    payload = (await res.json()) as LgPayload;
  } catch {
    payload = null;
  }
  if (!res.ok) {
    const err = payload?.error ?? {};
    const known = err.code ? ERRORS[err.code] : undefined;
    const busy = /fail device control|busy/i.test(err.message ?? "") ? "O ar ainda está processando o último comando. Tente de novo em alguns segundos." : undefined;
    return { ok: false, status: res.status, data: null, code: err.code, message: known || busy || err.message || "A LG recusou o pedido." };
  }
  return { ok: true, status: res.status, data: payload?.response ?? null };
}

function relay(result: LgResult): Response {
  if (result.ok) return ok(result.data);
  const status = result.status === 401 || result.status === 403 ? 502 : result.status;
  return fail(status, result.message ?? "A LG recusou o pedido.", result.code);
}

function ok(data: unknown): Response {
  return Response.json({ ok: true, data });
}

function fail(status: number, message: string, code?: string): Response {
  return Response.json({ ok: false, error: message, code: code || null }, { status });
}
