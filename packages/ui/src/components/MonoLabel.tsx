import type { HTMLAttributes } from "react";
import { cn } from "../cn.ts";

export function MonoLabel({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn("font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400", className)}
      {...props}
    />
  );
}
