export const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
export const MONTHS_LONG = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];
export const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export const brl = (v: number): string => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const kwh = (v: number): string =>
  `${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kWh`;

export const degrees = (v: number | undefined | null): string =>
  typeof v === "number" ? `${v.toLocaleString("pt-BR")}°` : "--";

export const pad = (n: number): string => String(n).padStart(2, "0");
export const ymd = (d: Date): string => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
export const ym = (d: Date): string => `${d.getFullYear()}${pad(d.getMonth() + 1)}`;
export const daysIn = (year: number, month: number): number => new Date(year, month + 1, 0).getDate();

export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function timeLabel(ts: number | null): string {
  if (!ts) return "";
  const time = new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `Atualizado às ${time}`;
}
