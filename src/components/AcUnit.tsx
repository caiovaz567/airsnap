import { useId, type CSSProperties } from "react";
import { cx } from "../lib/cx.ts";

const MODE_COLORS: Record<string, string> = {
  COOL: "#38bdf8",
  HEAT: "#fb923c",
  FAN: "#e2e8f0",
  AIR_DRY: "#67e8f9",
  AUTO: "#a78bfa",
  AIR_CLEAN: "#86efac",
  ENERGY_SAVING: "#86efac",
};

const SNOW_MODES = ["COOL", "AIR_DRY", "AUTO"];

const FLAKES = [
  { x: 44, size: 5, dx: -14, delay: 0 },
  { x: 76, size: 7, dx: -6, delay: -1.1 },
  { x: 100, size: 4.5, dx: 4, delay: -2.3 },
  { x: 124, size: 6.5, dx: -4, delay: -0.6 },
  { x: 150, size: 5, dx: 8, delay: -1.7 },
  { x: 178, size: 6, dx: 14, delay: -2.8 },
  { x: 62, size: 4, dx: 6, delay: -3.4 },
  { x: 164, size: 4, dx: -8, delay: -0.3 },
];

function snowflakePath(r: number): string {
  const parts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    const tip = [Math.cos(a) * r, Math.sin(a) * r];
    parts.push(`M 0 0 L ${tip[0].toFixed(2)} ${tip[1].toFixed(2)}`);
    const bx = Math.cos(a) * r * 0.55;
    const by = Math.sin(a) * r * 0.55;
    for (const side of [-1, 1]) {
      const b = a + (side * Math.PI) / 4;
      parts.push(`M ${bx.toFixed(2)} ${by.toFixed(2)} L ${(bx + Math.cos(b) * r * 0.38).toFixed(2)} ${(by + Math.sin(b) * r * 0.38).toFixed(2)}`);
    }
  }
  return parts.join(" ");
}

export function AcUnit({ on, mode, intensity }: { on: boolean; mode: string | null; intensity: number }) {
  const id = useId();
  const color = MODE_COLORS[mode ?? ""] ?? "#38bdf8";
  const snow = SNOW_MODES.includes(mode ?? "COOL");
  const level = Math.min(1, Math.max(0.15, intensity));
  const fall = 5.2 - level * 2.4;

  return (
    <div className="relative mb-1 w-full max-w-[260px]" aria-hidden="true">
      <svg viewBox="0 0 224 150" className="w-full overflow-visible">
        <defs>
          <linearGradient id={`${id}-body`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#e2e8f0" />
          </linearGradient>
          <linearGradient id={`${id}-mist`} gradientUnits="userSpaceOnUse" x1="0" y1="50" x2="0" y2="150">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
          <filter id={`${id}-shadow`} x="-20%" y="-200%" width="140%" height="500%">
            <feGaussianBlur stdDeviation="4" />
          </filter>
          <filter id={`${id}-soft`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="10" />
          </filter>
        </defs>

        <g className={cx("transition-opacity duration-700", on ? "opacity-100" : "opacity-0")}>
          <path
            d="M 36 52 C 30 84, 4 108, -8 150 L 232 150 C 220 108, 194 84, 188 52 Z"
            fill={`url(#${id}-mist)`}
            filter={`url(#${id}-soft)`}
            className="air-breathe"
          />
          {FLAKES.map(({ x, size, dx, delay }) => (
            <g key={`${x}-${size}`} transform={`translate(${x} 58)`}>
              <g
                className="air-flake"
                style={
                  {
                    "--fall": `${(fall * (0.85 + size / 20)).toFixed(2)}s`,
                    "--dx": `${dx}px`,
                    animationDelay: `${delay}s`,
                  } as CSSProperties
                }
              >
                {snow ? (
                  <path d={snowflakePath(size)} stroke="#ffffff" strokeOpacity={0.9} strokeWidth={1.1} strokeLinecap="round" fill="none" />
                ) : (
                  <circle r={size / 3} fill={color} fillOpacity={0.8} />
                )}
              </g>
            </g>
          ))}
        </g>

        <ellipse cx="112" cy="58" rx="92" ry="5" fill="#000000" fillOpacity={0.45} filter={`url(#${id}-shadow)`} />
        <rect
          x="8"
          y="6"
          width="208"
          height="52"
          rx="16"
          fill={`url(#${id}-body)`}
          className={cx("transition-opacity duration-500", on ? "opacity-100" : "opacity-60")}
        />
        <rect x="8" y="6" width="208" height="52" rx="16" fill="none" stroke="rgb(255 255 255 / 0.6)" strokeWidth={1} />
        <rect x="24" y="44" width="176" height="5" rx="2.5" fill="#94a3b8" />
        <rect
          x="26"
          y="46"
          width="172"
          height="4"
          rx="2"
          fill="#e2e8f0"
          className="ac-flap"
          style={{ transformOrigin: "112px 48px", transform: on ? "rotateX(55deg)" : "none" }}
        />
        <circle cx="194" cy="22" r="3" fill={on ? color : "#94a3b8"} className={cx(on && "ac-led")} />
      </svg>
    </div>
  );
}
