import type { ButtonHTMLAttributes } from "react";
import { cn } from "../cn.ts";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-signal-500 text-ink-950 hover:bg-signal-400 active:bg-signal-600 font-semibold",
  secondary:
    "bg-ink-800 text-ink-50 border border-ink-600 hover:border-ink-500 hover:bg-ink-700",
  ghost: "text-ink-300 hover:text-ink-50 hover:bg-ink-800",
  danger: "bg-danger-500/15 text-danger-400 border border-danger-500/40 hover:bg-danger-500/25"
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2"
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      className={cn(
        "vl-focus inline-flex items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
}
