import { createClient } from "@supabase/supabase-js";

export const supabaseConfigured = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || "http://localhost:54321",
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "missing",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce",
    },
  },
);

const AUTH_ERRORS: [RegExp, string][] = [
  [/invalid login credentials/i, "E-mail ou senha errados."],
  [/email not confirmed/i, "Confirme seu e-mail primeiro. Olhe sua caixa de entrada."],
  [/user already registered/i, "Esse e-mail já tem conta. Tente entrar."],
  [/password should be at least/i, "A senha precisa ter pelo menos 8 caracteres."],
  [/rate limit|too many/i, "Muitas tentativas. Espere um pouco e tente de novo."],
  [/same.*password|different from the old/i, "A senha nova precisa ser diferente da antiga."],
  [/weak|pwned|leaked/i, "Essa senha é fraca ou já vazou. Escolha outra."],
  [/invalid email|unable to validate email/i, "Esse e-mail não parece certo."],
  [/fetch|network/i, "Sem internet? Tente de novo."],
];

export function authMessage(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error ?? "");
  return AUTH_ERRORS.find(([re]) => re.test(text))?.[1] ?? "Algo deu errado. Tente de novo.";
}
