import { List, ListItem, Navbar, Page } from "konsta/react";
import { Zap } from "lucide-react";
import { brl, timeLabel } from "../lib/format.ts";
import type { LayoutProps, Tab } from "./layout.ts";
import { AccountPanel } from "./AccountPanel.tsx";
import { ControlPanel } from "./ControlPanel.tsx";
import { EnergyPanel } from "./EnergyPanel.tsx";
import { TabBar } from "./TabBar.tsx";
import { DeviceSwitcher, ErrorBanner, RefreshButton } from "./ui.tsx";

const TITLES: Record<Tab, string> = { control: "", energy: "Energia", account: "Conta" };

export function MobileLayout({ ac, energy, price, onPriceChange, error, onDismissError, busy, onRefresh, account, tab, onTabChange }: LayoutProps) {
  const summary = energy.summary;

  return (
    <Page>
      <Navbar
        large
        transparent
        centerTitle={false}
        title={tab === "control" ? (ac.device?.name ?? "AirSnap") : TITLES[tab]}
        right={tab === "account" ? undefined : <RefreshButton busy={busy} onClick={onRefresh} />}
      />

      <div className="flex flex-col gap-4 pt-1 pb-36">
        {tab !== "account" && (
          <>
            <p className="-mt-2 px-4 text-sm text-white/70">{timeLabel(ac.updatedAt) || "Atualizando…"}</p>
            <DeviceSwitcher devices={ac.devices} currentId={ac.currentId} onSelect={ac.selectDevice} />
          </>
        )}
        {error && <ErrorBanner message={error} onClose={onDismissError} />}

        {tab === "control" && (
          <ControlPanel
            ac={ac}
            footer={
              <List strong inset className="!my-0">
                <ListItem
                  link
                  title="Gasto do ar este mês"
                  after={summary ? brl(summary.month * price) : "--"}
                  subtitle={summary ? `Hoje ${brl(summary.today * price)}` : undefined}
                  media={
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-amber-400/15 text-amber-500">
                      <Zap size={18} />
                    </span>
                  }
                  onClick={() => onTabChange("energy")}
                />
              </List>
            }
          />
        )}
        {tab === "energy" && <EnergyPanel energy={energy} price={price} onPriceChange={onPriceChange} />}
        {tab === "account" && <AccountPanel {...account} />}
      </div>

      <TabBar tab={tab} onChange={onTabChange} />
    </Page>
  );
}
