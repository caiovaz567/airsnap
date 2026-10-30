import { useState, type ReactNode } from "react";
import { BlockFooter, List, ListItem, Segmented, SegmentedButton } from "konsta/react";
import { ChevronLeft, ChevronRight, Receipt } from "lucide-react";
import { brl, kwh } from "../lib/format.ts";
import type { Energy } from "../hooks/useEnergy.ts";
import type { Period } from "../lib/types.ts";
import { BarChart } from "./BarChart.tsx";
import { RoundButton, Section } from "./ui.tsx";

const PERIODS: [Period, string][] = [
  ["week", "Semana"],
  ["month", "Mês"],
  ["year", "Ano"],
];

function PriceInput({ price, onChange }: { price: number; onChange: (v: number) => void }) {
  const format = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
  const [text, setText] = useState(format(price));
  const commit = () => {
    const v = parseFloat(text.replace(/\./g, "").replace(",", "."));
    if (v > 0) {
      onChange(v);
      setText(format(v));
    } else {
      setText(format(price));
    }
  };
  return (
    <label className="flex items-center gap-1 text-current">
      <span className="text-white/70">R$</span>
      <input
        inputMode="decimal"
        aria-label="Preço do kWh em reais"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        className="w-20 rounded-lg bg-black/5 px-2 py-1.5 text-right tabular-nums outline-none focus:ring-2 focus:ring-primary dark:bg-white/10"
      />
    </label>
  );
}

function Stat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-sm text-white/70">{label}</span>
      <span className="text-2xl font-semibold tabular-nums">{value}</span>
      <span className="text-sm text-white/70 tabular-nums">{detail}</span>
    </div>
  );
}

export function EnergyPanel({
  energy,
  price,
  onPriceChange,
  tall,
  footer,
}: {
  energy: Energy;
  price: number;
  onPriceChange: (v: number) => void;
  tall?: boolean;
  footer?: ReactNode;
}) {
  const { summary, bars } = energy;
  const past = bars.filter((b) => !b.future);
  const total = past.reduce((a, b) => a + b.kwh, 0);
  const average = past.length ? total / past.length : 0;
  const clock = (ts: number) => new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="flex flex-col gap-6">
      <Section className="flex flex-col gap-1 !py-6">
        <span className="text-sm text-white/70">Gasto do ar em {summary?.monthName ?? "este mês"}</span>
        <span className="text-5xl font-light tracking-tight tabular-nums">{summary ? brl(summary.month * price) : "--"}</span>
        <span className="text-sm text-white/70 tabular-nums">
          {summary ? `${kwh(summary.month)}${summary.at ? ` · dados da LG às ${clock(summary.at)}` : ""}` : "Carregando…"}
        </span>
      </Section>

      <Section className="grid grid-cols-2 divide-x divide-black/10 dark:divide-white/10 [&>*:last-child]:pl-4">
        <Stat label="Hoje" value={summary ? brl(summary.today * price) : "--"} detail={summary ? kwh(summary.today) : ""} />
        <Stat
          label="Média por dia"
          value={summary ? brl(summary.average * price) : "--"}
          detail={summary ? kwh(summary.average) : ""}
        />
      </Section>

      <Section title="Histórico" className="flex flex-col gap-4">
        <Segmented rounded outline>
          {PERIODS.map(([id, text]) => (
            <SegmentedButton key={id} active={energy.period === id} onClick={() => energy.setPeriod(id)}>
              {text}
            </SegmentedButton>
          ))}
        </Segmented>

        <div className="grid grid-cols-[44px_1fr_44px] items-center">
          <RoundButton label="Período anterior" onClick={() => energy.move(-1)}>
            <ChevronLeft size={20} />
          </RoundButton>
          <span className="block text-center font-semibold first-letter:uppercase">{energy.title}</span>
          {energy.offset < 0 ? (
            <RoundButton label="Próximo período" onClick={() => energy.move(1)}>
              <ChevronRight size={20} />
            </RoundButton>
          ) : (
            <span />
          )}
        </div>

        <dl className="grid grid-cols-3 gap-2 text-center">
          <div>
            <dt className="text-sm text-white/70">Consumo</dt>
            <dd className="font-semibold tabular-nums">{kwh(total)}</dd>
          </div>
          <div>
            <dt className="text-sm text-white/70">Custo</dt>
            <dd className="font-semibold tabular-nums">{brl(total * price)}</dd>
          </div>
          <div>
            <dt className="text-sm text-white/70">{energy.period === "year" ? "Média/mês" : "Média/dia"}</dt>
            <dd className="font-semibold tabular-nums">{brl(average * price)}</dd>
          </div>
        </dl>

        <BarChart bars={bars} selected={energy.selected} onSelect={energy.setSelected} price={price} tall={tall} />
      </Section>

      <section>
        <List strong inset className="!my-0">
          <ListItem
            title="Preço do kWh"
            media={<Receipt size={22} className="text-primary" />}
            after={<PriceInput key={price} price={price} onChange={onPriceChange} />}
          />
        </List>
        <BlockFooter className="!mt-2">O valor é só do ar-condicionado. Pode ter uma pequena diferença do medidor da casa.</BlockFooter>
      </section>

      {footer}
    </div>
  );
}
