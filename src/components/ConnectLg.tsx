import { useState, type FormEvent, type ReactNode } from "react";
import { Block, Button, Page } from "konsta/react";
import { ExternalLink, Lock, TriangleAlert } from "lucide-react";
import { connectAccount } from "../lib/api.ts";
import { COUNTRIES } from "../lib/countries.ts";
import { SelectField, Spinner, TextAreaField } from "./ui.tsx";

const LG_TOKEN_URL = "https://connect-pat.lgthinq.com";

function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-white">{n}</span>
      <div className="pt-0.5">{children}</div>
    </li>
  );
}

export function ConnectLg({
  initialCountry,
  onConnected,
  onBack,
  onSignOut,
}: {
  initialCountry: string | null;
  onConnected: (country: string) => void;
  onBack?: () => void;
  onSignOut?: () => void;
}) {
  const [country, setCountry] = useState(initialCountry ?? "BR");
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token.trim() || sending) return;
    setSending(true);
    setError(null);
    try {
      await connectAccount(token.trim(), country);
      setToken("");
      onConnected(country);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Algo deu errado.");
    } finally {
      setSending(false);
    }
  };

  const secondary = onBack ? { label: "Voltar", onClick: onBack } : onSignOut ? { label: "Sair", onClick: onSignOut } : null;

  return (
    <Page>
      <div className="mx-auto flex min-h-full max-w-md flex-col justify-center py-10">
        <div className="mb-6 flex flex-col items-center gap-3 px-6 text-center">
          <img src="/logo.png" alt="AirSnap" className="h-20 w-20 drop-shadow-[0_8px_24px_rgba(56,189,248,0.35)]" />
          <h1 className="text-3xl font-bold">Conectar seu ar LG</h1>
          <p className="opacity-70">Pegue seu token na LG. Leva uns 2 minutos.</p>
        </div>

        <div className="mx-4 mb-6 flex gap-3 rounded-2xl bg-amber-400/15 p-4 text-sm text-amber-300">
          <TriangleAlert size={20} className="mt-0.5 shrink-0" />
          <p>
            <b>Só funciona com ar-condicionado LG ThinQ.</b> O seu ar precisa já estar funcionando no app LG ThinQ, com Wi-Fi.
          </p>
        </div>

        <Block strong inset className="!my-0">
          <ol className="flex flex-col gap-4 text-[15px]">
            <Step n={1}>
              <p>Abra o site de tokens da LG.</p>
              <a
                href={LG_TOKEN_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-2 rounded-full bg-primary/15 px-4 py-2 text-sm font-semibold text-primary"
              >
                Abrir connect-pat.lgthinq.com
                <ExternalLink size={14} />
              </a>
            </Step>
            <Step n={2}>Entre com a mesma conta que você usa no app LG ThinQ.</Step>
            <Step n={3}>
              Toque em <b>ADD NEW TOKEN</b>.
            </Step>
            <Step n={4}>
              Dê um nome (ex: <i>AirSnap</i>) e toque em <b>SELECT ALL</b>.
              <span className="mt-1 block text-sm text-white/70">
                A caixa <i>Device Energy Consumption Inquiry</i> libera a aba Energia.
              </span>
            </Step>
            <Step n={5}>
              Toque em <b>CREATE TOKEN</b> e copie o token.
            </Step>
            <Step n={6}>Cole o token aqui embaixo e escolha seu país.</Step>
          </ol>
        </Block>

        <form onSubmit={submit} className="mt-6">
          {error && (
            <p role="alert" className="mx-4 mb-4 rounded-2xl bg-red-500/15 px-4 py-3 text-sm text-red-400">
              {error}
            </p>
          )}
          <div className="flex flex-col gap-4 px-4">
            <SelectField label="País da sua conta LG" value={country} onChange={(e) => setCountry(e.target.value)}>
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </SelectField>
            <TextAreaField
              label="Token da LG"
              placeholder="Cole o token aqui"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
            <p className="flex gap-2 px-1 text-sm text-white/70">
              <Lock size={14} className="mt-0.5 shrink-0" />
              Seu token fica criptografado. Só o servidor do AirSnap usa, para falar com a LG. Você pode apagar quando quiser.
            </p>
          </div>

          <Block className="!my-5">
            <Button large rounded component="button" type="submit" disabled={sending || !token.trim()}>
              {sending ? <Spinner arc="current" className="h-5 w-5" /> : "Conectar meu ar"}
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
      </div>
    </Page>
  );
}
