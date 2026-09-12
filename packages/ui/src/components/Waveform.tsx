import { cn } from "../cn.ts";

const HEIGHTS = [0.3, 0.55, 0.9, 0.6, 1, 0.45, 0.7, 0.35, 0.85, 0.5, 0.65, 0.4];

export function Waveform({
  bars = 12,
  live = false,
  className
}: {
  bars?: number;
  live?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex h-8 items-center gap-[3px]", className)} aria-hidden="true">
      {Array.from({ length: bars }).map((_, i) => {
        const h = HEIGHTS[i % HEIGHTS.length] ?? 0.5;
        return (
          <span
            key={i}
            className={cn("w-[3px] rounded-full bg-signal-500", live && "vl-bar")}
            style={{ height: `${Math.round(h * 100)}%`, animationDelay: `${(i % 6) * 0.12}s` }}
          />
        );
      })}
    </div>
  );
}
