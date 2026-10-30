import {
  useId,
  useState,
  type CSSProperties,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { Block, BlockTitle } from "konsta/react";
import { ChevronDown, Eye, EyeOff, RefreshCw } from "lucide-react";
import { cx } from "../lib/cx.ts";
import type { Device } from "../lib/types.ts";

export function Section({
  title,
  children,
  className,
  disabled,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <section className={cx("transition-opacity", disabled && "pointer-events-none opacity-40")}>
      {title && <BlockTitle className="!mt-0 !mb-2">{title}</BlockTitle>}
      <Block strong inset className={cx("!my-0", className)}>
        {children}
      </Block>
    </section>
  );
}

const FIELD =
  "w-full rounded-xl border border-white/15 bg-white/[0.07] px-4 text-base text-white outline-none transition placeholder:text-white/45 focus:border-primary focus:bg-white/10 focus:ring-2 focus:ring-primary/40";

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="px-1 text-sm font-medium text-white/80">
      {children}
    </label>
  );
}

export function SelectField({
  label,
  className,
  children,
  ...select
}: { label: string } & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return (
    <div className={cx("flex flex-col gap-1.5", className)}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="relative">
        <select {...select} id={id} className={cx(FIELD, "h-12 appearance-none pr-12")}>
          {children}
        </select>
        <ChevronDown size={18} className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-white/50" />
      </div>
    </div>
  );
}

export function TextAreaField({
  label,
  className,
  ...textarea
}: { label: string } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <div className={cx("flex flex-col gap-1.5", className)}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <textarea {...textarea} id={id} className={cx(FIELD, "h-28 resize-none py-3 font-mono text-sm break-all")} />
    </div>
  );
}

export function Slider({
  value,
  min,
  max,
  step,
  label,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  label: string;
  onChange: (value: number) => void;
}) {
  const ratio = max > min ? (value - min) / (max - min) : 0;
  return (
    <input
      type="range"
      aria-label={label}
      className="airsnap-range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{ "--fill": `calc(${ratio} * (100% - 38px) + 19px)` } as CSSProperties}
    />
  );
}

export function TextField({
  label,
  className,
  type,
  ...input
}: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";

  return (
    <div className={cx("flex flex-col gap-1.5", className)}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="relative">
        <input {...input} id={id} type={isPassword && visible ? "text" : type} className={cx(FIELD, "h-12", isPassword && "pr-12")} />
        {isPassword && (
          <button
            type="button"
            aria-label={visible ? "Esconder senha" : "Mostrar senha"}
            aria-pressed={visible}
            onClick={() => setVisible((v) => !v)}
            className="absolute inset-y-0 right-0 grid w-12 place-items-center text-white/50 transition hover:text-white active:opacity-60"
          >
            {visible ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        )}
      </div>
    </div>
  );
}

export function RoundButton({
  label,
  onClick,
  children,
  size = "md",
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  size?: "sm" | "md";
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cx(
        "grid shrink-0 place-items-center rounded-full bg-black/5 text-current transition active:scale-95 active:opacity-70 dark:bg-white/10",
        size === "md" ? "h-11 w-11" : "h-8 w-8",
      )}
    >
      {children}
    </button>
  );
}

export function Spinner({ className, arc = "primary" }: { className?: string; arc?: "primary" | "current" }) {
  return (
    <svg viewBox="0 0 24 24" className={cx("animate-spin", className ?? "h-10 w-10")} aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeOpacity={0.2} strokeWidth={2.5} />
      <path
        d="M22 12a10 10 0 0 0-10-10"
        fill="none"
        stroke={arc === "primary" ? "var(--color-primary)" : "currentColor"}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
    </svg>
  );
}

export function RefreshButton({ busy, onClick }: { busy: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label="Atualizar"
      onClick={onClick}
      disabled={busy}
      className="grid h-11 w-11 place-items-center rounded-full bg-black/5 text-primary transition active:scale-95 active:opacity-60 disabled:opacity-60 dark:bg-white/10"
    >
      <RefreshCw size={18} />
    </button>
  );
}

export function ErrorBanner({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div role="alert" className="mx-4 flex items-start justify-between gap-3 rounded-2xl bg-red-500/15 px-4 py-3 text-sm text-red-400">
      <span>{message}</span>
      <button type="button" onClick={onClose} className="font-semibold">
        OK
      </button>
    </div>
  );
}

export function DeviceSwitcher({
  devices,
  currentId,
  onSelect,
}: {
  devices: Device[];
  currentId: string | null;
  onSelect: (id: string) => void;
}) {
  if (devices.length < 2) return null;
  return (
    <div className="flex gap-2 overflow-x-auto px-4">
      {devices.map((d) => (
        <button
          key={d.id}
          type="button"
          onClick={() => onSelect(d.id)}
          className={cx(
            "shrink-0 rounded-full px-4 py-2 text-sm font-medium transition",
            d.id === currentId ? "bg-primary text-white" : "bg-black/5 dark:bg-white/10",
          )}
        >
          {d.name}
        </button>
      ))}
    </div>
  );
}
