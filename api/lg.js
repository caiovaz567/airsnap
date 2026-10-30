const API_KEY = "v6GFvkweNo7DK7yD3ylIZ9w52aKBU0eJ7wLXkSR3";
const LG_TIMEOUT_MS = 10000;

const ERRORS = {
  1103: "Token da LG inválido. Gere um novo token pessoal.",
  1218: "Token da LG expirado. Gere um novo token pessoal.",
  1222: "O aparelho está desconectado da internet.",
  2201: "O aparelho está ocupado agora. Tente de novo.",
  2207: "O aparelho está desligado ou não aceita esse comando agora.",
};

export async function GET(request) {
  return handle(request);
}

export async function POST(request) {
  return handle(request);
}

async function handle(request) {
  const { THINQ_PAT, APP_PASSWORD } = process.env;
  if (!THINQ_PAT || !APP_PASSWORD) {
    return fail(500, "O servidor ainda não tem THINQ_PAT e APP_PASSWORD configurados.");
  }
  if (!safeEqual(request.headers.get("x-app-password") || "", APP_PASSWORD)) {
    return fail(401, "Senha errada.");
  }

  const query = new URL(request.url).searchParams;
  const route = query.get("route") || "";
  const method = request.method;
  let m;

  if (method === "GET" && route === "devices") {
    return callLg("GET", "devices");
  }
  if (method === "GET" && (m = route.match(/^devices\/([A-Za-z0-9_-]+)\/(state|profile)$/))) {
    return callLg("GET", `devices/${m[1]}/${m[2]}`);
  }
  if (method === "GET" && (m = route.match(/^devices\/([A-Za-z0-9_-]+)\/energy-profile$/))) {
    return callLg("GET", `devices/energy/${m[1]}/profile`);
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
    return callLg("GET", `devices/energy/${m[1]}/usage?${qs}`);
  }
  if (method === "POST" && (m = route.match(/^devices\/([A-Za-z0-9_-]+)\/control$/))) {
    let body;
    try {
      body = await request.json();
    } catch {
      return fail(400, "Comando inválido.");
    }
    return callLg("POST", `devices/${m[1]}/control`, body);
  }
  return fail(404, "Rota desconhecida.");
}

async function callLg(method, endpoint, body) {
  const pat = process.env.THINQ_PAT;
  const region = (process.env.THINQ_REGION || "aic").toLowerCase();
  const headers = {
    Authorization: `Bearer ${pat}`,
    "x-country": process.env.THINQ_COUNTRY || "BR",
    "x-message-id": messageId(),
    "x-client-id": await clientId(pat),
    "x-api-key": API_KEY,
    "x-service-phase": "OP",
    "Content-Type": "application/json",
  };
  if (method === "POST") headers["x-conditional-control"] = "true";

  let res;
  try {
    res = await fetch(`https://api-${region}.lgthinq.com/${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(LG_TIMEOUT_MS),
    });
  } catch (e) {
    const timedOut = e && (e.name === "TimeoutError" || e.name === "AbortError");
    return fail(504, timedOut ? "A LG demorou demais para responder." : "Não consegui falar com a LG.");
  }

  let payload = null;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }
  if (!res.ok) {
    const err = (payload && payload.error) || {};
    return fail(res.status, ERRORS[err.code] || err.message || "A LG recusou o pedido.", err.code);
  }
  return Response.json({ ok: true, data: payload ? payload.response ?? null : null });
}

function fail(status, message, code) {
  return Response.json({ ok: false, error: message, code: code || null }, { status });
}

function messageId() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Buffer.from(bytes).toString("base64url");
}

async function clientId(pat) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(pat));
  return `thinq-open-${Buffer.from(hash).toString("hex").slice(0, 32)}`;
}

function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
