import type { HTMLAttributes } from "react";
import { cn } from "../cn.ts";

type Tone = "neutral" | "signal" | "phosphor" | "danger" | "info";

const tones: Record<Tone, string> = {
  neutral: "border-ink-600 text-ink-300",
  signal: "border-signal-600/60 text-signal-400",
  phosphor: "border-phosphor-500/50 text-phosphor-400",
  danger: "border-danger-500/50 text-danger-400",
  info: "border-info-400/50 text-info-400"
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-pill border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em]",
        tones[tone],
        className
      )}
      {...props}
    />
  );
}
