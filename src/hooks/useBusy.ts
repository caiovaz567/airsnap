import { useEffect, useState } from "react";
import { onBusyChange } from "../lib/api.ts";

export function useBusy(): boolean {
  const [busy, setBusy] = useState(false);
  useEffect(() => onBusyChange(setBusy), []);
  return busy;
}
