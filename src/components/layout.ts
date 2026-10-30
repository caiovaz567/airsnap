import type { AirConditioner } from "../hooks/useAirConditioner.ts";
import type { Energy } from "../hooks/useEnergy.ts";
import type { AccountActions } from "./AccountPanel.tsx";

export type Tab = "control" | "energy" | "account";

export interface LayoutProps {
  ac: AirConditioner;
  energy: Energy;
  price: number;
  onPriceChange: (v: number) => void;
  error: string | null;
  onDismissError: () => void;
  busy: boolean;
  onRefresh: () => void;
  account: AccountActions;
  tab: Tab;
  onTabChange: (tab: Tab) => void;
}
