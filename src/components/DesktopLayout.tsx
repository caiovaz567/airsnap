import { Page } from "konsta/react";
import { AirVent, ArrowLeft, CircleUser, Zap } from "lucide-react";
import { cx } from "../lib/cx.ts";
import { timeLabel } from "../lib/format.ts";
import type { LayoutProps } from "./layout.ts";
import { AccountPanel } from "./AccountPanel.tsx";
import { ControlPanel } from "./ControlPanel.tsx";
import { EnergyPanel } from "./EnergyPanel.tsx";
import { DeviceSwitcher, ErrorBanner, RefreshButton } from "./ui.tsx";

function ColumnTitle({ icon: Icon, children }: { icon: typeof Zap; children: string }) {
  return (
    <h2 className="mb-3 flex items-center gap-2 px-4 text-lg font-semibold">
      <Icon size={20} className="text-primary" />
      {children}
    </h2>
  );
}

export function DesktopLayout({ ac, energy, price, onPriceChange, error, onDismissError, busy, onRefresh, account, tab, onTabChange }: LayoutProps) {
  const showAccount = tab === "account";

  return (
    <Page>
      <header className="sticky top-0 z-30 border-b border-black/10 bg-white/70 backdrop-blur-xl dark:border-white/10 dark:bg-black/70">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-3">
          <img src="/logo.png" alt="AirSnap" className="h-10 w-10" />
          <div className="min-w-0">
            <h1 className="text-lg leading-tight font-semibold">AirSnap</h1>
            <p className="truncate text-sm text-white/70">
              {ac.device?.name ?? "Ar-condicionado"}
              {ac.updatedAt ? ` · ${timeLabel(ac.updatedAt)}` : ""}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {!showAccount && <DeviceSwitcher devices={ac.devices} currentId={ac.currentId} onSelect={ac.selectDevice} />}
            {!showAccount && <RefreshButton busy={busy} onClick={onRefresh} />}
            <button
              type="button"
              onClick={() => onTabChange(showAccount ? "control" : "account")}
              className={cx(
                "flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium transition active:opacity-60",
                showAccount ? "bg-primary text-white" : "bg-black/5 dark:bg-white/10",
              )}
            >
              {showAccount ? <ArrowLeft size={16} /> : <CircleUser size={16} />}
              {showAccount ? "Voltar ao painel" : account.email}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex min-h-[calc(100dvh-4.25rem)] max-w-6xl flex-col justify-center px-2 py-8">
        {error && (
          <div className="mb-6">
            <ErrorBanner message={error} onClose={onDismissError} />
          </div>
        )}
        {showAccount ? (
          <section className="mx-auto max-w-xl">
            <ColumnTitle icon={CircleUser}>Conta</ColumnTitle>
            <AccountPanel {...account} />
          </section>
        ) : (
          <div className="grid grid-cols-[400px_minmax(0,1fr)] items-start gap-6">
            <section>
              <ColumnTitle icon={AirVent}>Controle</ColumnTitle>
              <ControlPanel ac={ac} />
            </section>
            <section>
              <ColumnTitle icon={Zap}>Energia</ColumnTitle>
              <EnergyPanel energy={energy} price={price} onPriceChange={onPriceChange} tall />
            </section>
          </div>
        )}
      </main>
    </Page>
  );
}
