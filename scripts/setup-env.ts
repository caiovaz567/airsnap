import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const ENV_FILE = ".env.local";
const KEYS = ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SECRET_KEY", "TOKEN_ENCRYPTION_KEY"];
const OBSOLETE = ["APP_PASSWORD", "APP_PASSWORD_HASH", "SESSION_SECRET"];

const env = new Map<string, string>();
if (existsSync(ENV_FILE)) {
  for (const line of readFileSync(ENV_FILE, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match) env.set(match[1], match[2]);
  }
}

OBSOLETE.forEach((key) => env.delete(key));
if (Buffer.from(env.get("TOKEN_ENCRYPTION_KEY") ?? "", "base64url").length !== 32) {
  env.set("TOKEN_ENCRYPTION_KEY", randomBytes(32).toString("base64url"));
}
KEYS.forEach((key) => {
  if (!env.has(key)) env.set(key, "");
});

const ordered = [...KEYS, ...[...env.keys()].filter((k) => !KEYS.includes(k))];
writeFileSync(ENV_FILE, `${ordered.map((k) => `${k}=${env.get(k)}`).join("\n")}\n`);

const missing = KEYS.filter((k) => !env.get(k));
console.log(`${ENV_FILE} pronto. TOKEN_ENCRYPTION_KEY criada.`);
if (missing.length) console.log(`Falta preencher: ${missing.join(", ")}`);
