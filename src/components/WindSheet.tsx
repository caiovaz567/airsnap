import { useEffect, useRef, useState } from "react";
import { Block, Button, Sheet, Toggle } from "konsta/react";
import { Minus, Plus } from "lucide-react";
import { windLabel } from "../lib/ac.ts";
import { RoundButton } from "./ui.tsx";
import { WindDial } from "./WindDial.tsx";

const SEND_DELAY_MS = 600;

export function WindSheet({
  opened,
  levels,
  current,
  onChange,
  onClose,
}: {
  opened: boolean;
  levels: string[];
  current: string | null;
  onChange: (level: string) => void;
  onClose: () => void;
}) {
  const steps = levels.filter((l) => l !== "AUTO");
  const hasAuto = levels.includes("AUTO");
  const [selected, setSelected] = useState(current);
  const [lastStep, setLastStep] = useState(() => (current && current !== "AUTO" ? current : steps[0]));
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pending = useRef<string | null>(null);

  useEffect(() => {
    if (!opened) return;
    setSelected(current);
    if (current && current !== "AUTO") setLastStep(current);
  }, [opened, current]);

  const flush = () => {
    clearTimeout(timer.current);
    if (pending.current) onChange(pending.current);
    pending.current = null;
  };

  const choose = (level: string) => {
    setSelected(level);
    if (level !== "AUTO") setLastStep(level);
    pending.current = level === current ? null : level;
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, SEND_DELAY_MS);
  };

  const close = () => {
    flush();
    onClose();
  };

  const auto = selected === "AUTO";
  const index = Math.max(0, steps.indexOf(auto ? lastStep : (selected ?? steps[0])));

  return (
    <Sheet opened={opened} onBackdropClick={close} className="mx-auto max-w-lg pb-safe">
      <div className="px-6 pt-6 pb-2">
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-white/20" />
        <h2 className="text-xl font-bold">Velocidade da ventilação</h2>
      </div>

      <div className="px-6">
        <WindDial
          count={steps.length}
          index={index}
          disabled={auto}
          label={auto ? "Automático" : windLabel(steps[index], levels)}
          onChange={(i) => choose(steps[i])}
        />

        <div className="mt-2 flex items-center justify-between px-6">
          <RoundButton label="Menos vento" onClick={() => choose(steps[Math.max(0, index - 1)])}>
            <Minus size={20} />
          </RoundButton>
          <RoundButton label="Mais vento" onClick={() => choose(steps[Math.min(steps.length - 1, index + 1)])}>
            <Plus size={20} />
          </RoundButton>
        </div>

        {hasAuto && (
          <label className="mt-4 flex items-center justify-center gap-3 text-base">
            Automático
            <Toggle checked={auto} onChange={() => choose(auto ? lastStep : "AUTO")} />
          </label>
        )}
      </div>

      <Block className="!my-6">
        <Button large rounded tonal onClick={close}>
          Fechar
        </Button>
      </Block>
    </Sheet>
  );
}
