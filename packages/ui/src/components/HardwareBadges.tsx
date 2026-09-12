import type { Hardware } from "@voicelabs/registry";
import { cn } from "../cn.ts";

const ALL: Hardware[] = ["cuda", "rocm", "mps", "cpu"];

export function HardwareBadges({
  supported,
  detected,
  className
}: {
  supported: Hardware[];
  detected?: Hardware | null;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-1", className)} aria-label="hardware support">
      {ALL.map((hw) => {
        const ok = supported.includes(hw);
        const isDetected = detected === hw;
        return (
          <span
            key={hw}
            title={ok ? `${hw} supported` : `${hw} not supported`}
            className={cn(
              "rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider",
              ok ? "bg-ink-700 text-ink-200" : "text-ink-600 line-through",
              ok && isDetected && "bg-phosphor-500/15 text-phosphor-400"
            )}
          >
            {hw}
          </span>
        );
      })}
    </div>
  );
}
