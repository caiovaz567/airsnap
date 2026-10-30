import { useState, type FormEvent } from "react";
import { Block, Button, Page } from "konsta/react";
import { MailCheck } from "lucide-react";
import { authMessage, supabase } from "../lib/supabase.ts";
import { Spinner, TextField } from "./ui.tsx";

export type AuthMode = "signin" | "signup" | "forgot" | "reset";

const TITLES: Record<AuthMode, string> = {
  signin: "Entrar",
  signup: "Criar conta",
  forgot: "Enviar link",
  reset: "Salvar senha",
};

const HEADINGS: Record<AuthMode, { title: string; text: string }> = {
  signin: { title: "AirSnap", text: "Entre para controlar seu ar-condicionado LG." },
  signup: { title: "Criar conta", text: "Leva menos de um minuto." },
  forgot: { title: "Esqueci a senha", text: "Mandamos um link pro seu e-mail para criar uma senha nova." },
  reset: { title: "Nova senha", text: "Escolha uma senha nova para sua conta." },
};

export function AuthScreen({
  mode,
  onModeChange,
  onDone,
  onCreateAccount,
}: {
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
  onDone?: () => void;
  onCreateAccount?: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const needsConfirm = mode === "signup" || mode === "reset";
  const needsPassword = mode !== "forgot";
  const needsEmail = mode !== "reset";

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (needsPassword && password.length < 8) return setError("A senha precisa ter pelo menos 8 caracteres.");
    if (needsConfirm && password !== confirm) return setError("As senhas não são iguais.");
    setSending(true);
    try {
      const redirectTo = window.location.origin;
      if (mode === "signin") {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
      } else if (mode === "signup") {
        const { data, error: err } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo } });
        if (err) throw err;
        if (!data.session) setSent(`Enviamos um link para ${email}. Abra o e-mail e confirme sua conta.`);
      } else if (mode === "forgot") {
        const { error: err } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
        if (err) throw err;
        setSent(`Se ${email} tiver conta, enviamos um link para criar uma senha nova.`);
      } else {
        const { error: err } = await supabase.auth.updateUser({ password });
        if (err) throw err;
        onDone?.();
      }
    } catch (err) {
      setError(authMessage(err));
    } finally {
      setSending(false);
    }
  };

  const switchTo = (next: AuthMode) => {
    setError(null);
    setSent(null);
    setPassword("");
    setConfirm("");
    onModeChange(next);
  };

  const secondary =
    mode === "signin"
      ? { label: "Criar conta", onClick: onCreateAccount ?? (() => switchTo("signup")) }
      : mode === "signup"
        ? { label: "Já tenho conta", onClick: () => switchTo("signin") }
        : mode === "forgot"
          ? { label: "Voltar para entrar", onClick: () => switchTo("signin") }
          : null;

  return (
    <Page>
      <div className="mx-auto flex min-h-full max-w-md flex-col justify-center py-10">
        <div className="mb-8 flex flex-col items-center gap-3 px-6 text-center">
          <img src="/logo.png" alt="AirSnap" className="h-28 w-28 drop-shadow-[0_8px_24px_rgba(56,189,248,0.35)]" />
          <h1 className="text-4xl font-bold">{HEADINGS[mode].title}</h1>
          <p className="opacity-70">{HEADINGS[mode].text}</p>
        </div>
        {sent ? (
          <div className="flex flex-col items-center gap-4 px-4 text-center">
            <MailCheck size={44} className="text-primary" />
            <p>{sent}</p>
            <p className="text-sm text-white/70">Não chegou? Olhe a pasta de spam.</p>
            <Block className="!my-2 w-full">
              <Button large rounded onClick={() => switchTo("signin")}>
                Voltar para entrar
              </Button>
            </Block>
          </div>
        ) : (
          <form onSubmit={submit}>
            {error && (
              <p role="alert" className="mx-4 mb-4 rounded-2xl bg-red-500/15 px-4 py-3 text-sm text-red-400">
                {error}
              </p>
            )}
            <div className="flex flex-col gap-4 px-4">
              {needsEmail && (
                <TextField
                  label="E-mail"
                  type="email"
                  placeholder="voce@email.com"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              )}
              {needsPassword && (
                <TextField
                  label={mode === "reset" ? "Senha nova" : "Senha"}
                  type="password"
                  placeholder={mode === "signin" ? "Sua senha" : "Pelo menos 8 caracteres"}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              )}
              {mode === "signin" && (
                <button
                  type="button"
                  onClick={() => switchTo("forgot")}
                  className="-mt-2 self-end px-1 py-1 text-sm font-medium text-primary active:opacity-60"
                >
                  Esqueci a senha
                </button>
              )}
              {needsConfirm && (
                <TextField
                  label="Repita a senha"
                  type="password"
                  placeholder="Digite a senha de novo"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              )}
            </div>

            <Block className="!my-5">
              <Button large rounded component="button" type="submit" disabled={sending}>
                {sending ? <Spinner arc="current" className="h-5 w-5" /> : TITLES[mode]}
              </Button>
            </Block>

            {secondary && (
              <>
                <div className="flex items-center gap-3 px-4 text-sm text-white/60">
                  <span className="h-px flex-1 bg-white/15" />
                  ou
                  <span className="h-px flex-1 bg-white/15" />
                </div>
                <Block className="!my-5">
                  <Button large rounded outline component="button" type="button" onClick={secondary.onClick}>
                    {secondary.label}
                  </Button>
                </Block>
              </>
            )}
          </form>
        )}
      </div>
    </Page>
  );
}
