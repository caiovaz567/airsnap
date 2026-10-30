import { useId, useRef, type KeyboardEvent, type PointerEvent } from "react";
import { cx } from "../lib/cx.ts";

const SIZE = 300;
const PAD = 16;
const HEIGHT = 272;
const CENTER = 150;
const RADIUS = 104;
const STROKE = 50;
const START = 135;
const SWEEP = 270;

function point(deg: number, radius = RADIUS) {
  const rad = (deg * Math.PI) / 180;
  return { x: CENTER + radius * Math.cos(rad), y: CENTER + radius * Math.sin(rad) };
}

function arc(from: number, to: number) {
  const a = point(from);
  const b = point(to);
  const large = to - from > 180 ? 1 : 0;
  return `M ${a.x} ${a.y} A ${RADIUS} ${RADIUS} 0 ${large} 1 ${b.x} ${b.y}`;
}

export function WindDial({
  count,
  index,
  disabled,
  label,
  onChange,
}: {
  count: number;
  index: number;
  disabled?: boolean;
  label: string;
  onChange: (index: number) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const gradientId = useId();
  const step = count > 1 ? SWEEP / (count - 1) : 0;
  const angleOf = (i: number) => START + i * step;
  const startKnob = point(START);
  const fill = count > 1 ? (index / (count - 1)) * 100 : 0;

  const pick = (e: PointerEvent<SVGSVGElement>) => {
    const box = svgRef.current?.getBoundingClientRect();
    if (!box) return;
    const x = ((e.clientX - box.left) / box.width) * (SIZE + PAD * 2) - PAD - CENTER;
    const y = ((e.clientY - box.top) / box.height) * (HEIGHT + PAD) - PAD - CENTER;
    const deg = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
    let rel = (deg - START + 360) % 360;
    if (rel > SWEEP) rel = rel > SWEEP + (360 - SWEEP) / 2 ? 0 : SWEEP;
    const next = step ? Math.round(rel / step) : 0;
    if (next !== index) onChange(next);
  };

  const onKeyDown = (e: KeyboardEvent<SVGSVGElement>) => {
    if (e.key === "ArrowRight" || e.key === "ArrowUp") onChange(Math.min(count - 1, index + 1));
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") onChange(Math.max(0, index - 1));
    else return;
    e.preventDefault();
  };

  return (
    <div className="relative mx-auto w-full max-w-[300px] pt-2">
      <svg
        ref={svgRef}
        viewBox={`${-PAD} ${-PAD} ${SIZE + PAD * 2} ${HEIGHT + PAD}`}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label="Velocidade da ventilação"
        aria-valuemin={1}
        aria-valuemax={count}
        aria-valuenow={index + 1}
        aria-valuetext={label}
        aria-disabled={disabled}
        onKeyDown={onKeyDown}
        onPointerDown={(e) => {
          if (disabled) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          pick(e);
        }}
        onPointerMove={(e) => {
          if (!disabled && e.currentTarget.hasPointerCapture(e.pointerId)) pick(e);
        }}
        className={cx(
          "w-full touch-none select-none outline-none transition-opacity focus-visible:drop-shadow-[0_0_8px_var(--color-primary)]",
          disabled ? "opacity-40" : "cursor-pointer",
        )}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="var(--color-primary)" />
          </linearGradient>
        </defs>
        <path d={arc(START, START + SWEEP)} fill="none" stroke="rgb(255 255 255 / 0.12)" strokeWidth={STROKE} strokeLinecap="round" />
        <path
          d={arc(START, START + SWEEP)}
          fill="none"
          pathLength={100}
          stroke={`url(#${gradientId})`}
          strokeWidth={STROKE + 1}
          strokeLinecap="round"
          strokeDasharray={`${fill} 200`}
          className="transition-[stroke-dasharray] duration-300 ease-out"
        />
        {Array.from({ length: count }, (_, i) => {
          const dot = point(angleOf(i));
          const text = point(angleOf(i), RADIUS + STROKE / 2 + 18);
          return (
            <g key={i}>
              <circle cx={dot.x} cy={dot.y} r={3} fill={i <= index ? "rgb(255 255 255 / 0.9)" : "rgb(255 255 255 / 0.35)"} />
              <text
                x={text.x}
                y={text.y}
                textAnchor="middle"
                dominantBaseline="central"
                className={cx("text-[15px] font-semibold", i === index ? "fill-white" : "fill-white/60")}
              >
                {i + 1}
              </text>
            </g>
          );
        })}
        <g
          className="transition-transform duration-300 ease-out"
          style={{ transform: `rotate(${index * step}deg)`, transformOrigin: `${CENTER}px ${CENTER}px` }}
        >
          <circle
            cx={startKnob.x}
            cy={startKnob.y}
            r={STROKE / 2 - 4}
            fill="white"
            className="drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]"
          />
        </g>
      </svg>
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <span className="text-3xl font-light">{label}</span>
      </div>
    </div>
  );
}
