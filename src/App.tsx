import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { App as KonstaApp, Block, Page } from "konsta/react";
import type { AccountActions } from "./components/AccountPanel.tsx";
import { AuthScreen, type AuthMode } from "./components/AuthScreen.tsx";
import { ConnectLg } from "./components/ConnectLg.tsx";
import { DesktopLayout } from "./components/DesktopLayout.tsx";
import { Hud } from "./components/Hud.tsx";
import { MobileLayout } from "./components/MobileLayout.tsx";
import { Welcome } from "./components/Welcome.tsx";
import { Spinner } from "./components/ui.tsx";
import type { LayoutProps, Tab } from "./components/layout.ts";
import { useAirConditioner } from "./hooks/useAirConditioner.ts";
import { useAuth } from "./hooks/useAuth.ts";
import { useBusy } from "./hooks/useBusy.ts";
import { useEnergy } from "./hooks/useEnergy.ts";
import { useMediaQuery } from "./hooks/useMediaQuery.ts";
import { usePrice } from "./hooks/usePrice.ts";
import { NoLgAccountError, UnauthorizedError, getAccount } from "./lib/api.ts";
import { withHud } from "./lib/hud.ts";
import { setStorageScope, storage } from "./lib/storage.ts";
import { supabase, supabaseConfigured } from "./lib/supabase.ts";

function Splash() {
  return (
    <Page className="flex items-center justify-center">
      <Spinner />
    </Page>
  );
}

function NotConfigured() {
  return (
    <Page className="flex items-center justify-center">
      <Block strong inset className="max-w-md text-center">
        Falta configurar o Supabase: preencha VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY.
      </Block>
    </Page>
  );
}

function Dashboard({
  account,
  onNeedConnect,
}: {
  account: AccountActions;
  onNeedConnect: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [tab, setTabState] = useState<Tab>(() => storage.get<Tab>("tab") ?? "control");
  const desktop = useMediaQuery("(min-width: 1024px)");
  const busy = useBusy();
  const [price, setPrice] = usePrice();
  const { onSignOut } = account;

  const handleError = useCallback(
    (e: unknown) => {
      if (e instanceof UnauthorizedError) onSignOut();
      else if (e instanceof NoLgAccountError) onNeedConnect();
      else setError(e instanceof Error ? e.message : "Algo deu errado.");
    },
    [onSignOut, onNeedConnect],
  );

  const ac = useAirConditioner(handleError);
  const energy = useEnergy(ac.currentId, (desktop && tab !== "account") || tab === "energy", handleError);

  const setTab = useCallback((t: Tab) => {
    storage.set("tab", t);
    setTabState(t);
    setError(null);
  }, []);

  const refresh = useCallback(() => {
    setError(null);
    withHud(
      async () => {
        const results = await Promise.all([
          ac.refresh(),
          desktop || tab === "energy" ? energy.refresh(true) : Promise.resolve(true),
        ]);
        if (!results.every(Boolean)) throw new Error("refresh");
      },
      { loading: "Atualizando…", success: "Atualizado!" },
    ).catch(() => undefined);
  }, [ac, energy, desktop, tab]);

  const props: LayoutProps = {
    ac,
    energy,
    price,
    onPriceChange: setPrice,
    error,
    onDismissError: () => setError(null),
    busy,
    onRefresh: refresh,
    account,
    tab,
    onTabChange: setTab,
  };

  return desktop ? <DesktopLayout {...props} /> : <MobileLayout {...props} />;
}

type View = "loading" | "connect" | "reconnect" | "dashboard" | "error";

function SignedIn({ session }: { session: Session }) {
  setStorageScope(session.user.id);

  const [view, setView] = useState<View>(() => (storage.get<boolean>("lgConnected") ? "dashboard" : "loading"));
  const [country, setCountry] = useState<string | null>(() => storage.get<string>("lgCountry"));

  const signOut = useCallback(() => {
    storage.clearAll();
    setStorageScope(null);
    supabase.auth.signOut();
  }, []);

  const markConnected = useCallback((connected: boolean, nextCountry: string | null) => {
    storage.set("lgConnected", connected);
    storage.set("lgCountry", nextCountry);
    setCountry(nextCountry);
  }, []);

  const checkAccount = useCallback(() => {
    getAccount()
      .then((status) => {
        markConnected(status.connected, status.country);
        setView((v) => (status.connected ? (v === "reconnect" ? v : "dashboard") : "connect"));
      })
      .catch((e) => {
        if (e instanceof UnauthorizedError) signOut();
        else setView((v) => (v === "loading" ? "error" : v));
      });
  }, [markConnected, signOut]);

  useEffect(() => {
    checkAccount();
  }, [checkAccount]);

  const needConnect = useCallback(() => {
    markConnected(false, country);
    setView("connect");
  }, [country, markConnected]);

  if (view === "loading") return <Splash />;
  if (view === "error") {
    return (
      <Page className="flex items-center justify-center">
        <Block strong inset className="flex max-w-md flex-col items-center gap-3 text-center">
          <p>Não consegui falar com o servidor.</p>
          <button type="button" className="font-semibold text-primary" onClick={() => (setView("loading"), checkAccount())}>
            Tentar de novo
          </button>
        </Block>
      </Page>
    );
  }
  if (view === "connect" || view === "reconnect") {
    return (
      <ConnectLg
        initialCountry={country}
        onConnected={(c) => {
          markConnected(true, c);
          storage.set("tab", "control");
          setView("dashboard");
        }}
        onBack={view === "reconnect" ? () => setView("dashboard") : undefined}
        onSignOut={view === "connect" ? signOut : undefined}
      />
    );
  }

  return (
    <Dashboard
      account={{
        email: session.user.email ?? "",
        country,
        onReconnect: () => setView(storage.get<boolean>("lgConnected") ? "reconnect" : "connect"),
        onSignOut: signOut,
      }}
      onNeedConnect={needConnect}
    />
  );
}

function SignedOut() {
  const [mode, setMode] = useState<AuthMode | "welcome">("signin");
  if (mode === "welcome") return <Welcome onSignUp={() => setMode("signup")} onSignIn={() => setMode("signin")} />;
  return (
    <AuthScreen mode={mode} onModeChange={setMode} onCreateAccount={() => setMode("welcome")} />
  );
}

export default function App() {
  const { session, recovery, endRecovery } = useAuth();

  let content;
  if (!supabaseConfigured) content = <NotConfigured />;
  else if (session === undefined) content = <Splash />;
  else if (recovery) content = <AuthScreen mode="reset" onModeChange={() => endRecovery()} onDone={endRecovery} />;
  else if (!session) content = <SignedOut />;
  else content = <SignedIn key={session.user.id} session={session} />;

  return (
    <KonstaApp theme="ios" dark safeAreas>
      {content}
      <Hud />
    </KonstaApp>
  );
}
