import { useCallback, useState } from "react";
import { storage } from "../lib/storage.ts";

const DEFAULT_PRICE = 1.15;

export function usePrice(): [number, (value: number) => void] {
  const [price, setPriceState] = useState(() => storage.get<number>("price") ?? DEFAULT_PRICE);
  const setPrice = useCallback((value: number) => {
    storage.set("price", value);
    setPriceState(value);
  }, []);
  return [price, setPrice];
}
