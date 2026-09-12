import type { HTMLAttributes } from "react";
import { cn } from "../cn.ts";

export function Card({
  interactive = false,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-card border border-ink-700 bg-ink-900 shadow-card",
        interactive && "transition-colors hover:border-ink-500 hover:bg-ink-850",
        className
      )}
      {...props}
    />
  );
}
