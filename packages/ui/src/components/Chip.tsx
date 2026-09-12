import type { ButtonHTMLAttributes } from "react";
import { cn } from "../cn.ts";

export function Chip({
  active = false,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "vl-focus inline-flex h-8 items-center rounded-pill border px-3.5 text-xs transition-colors",
        active
          ? "border-ink-50 bg-ink-50 text-ink-950"
          : "border-ink-600 text-ink-300 hover:border-ink-400 hover:text-ink-50",
        className
      )}
      {...props}
    />
  );
}
