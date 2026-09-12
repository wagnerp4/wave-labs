import { cn } from "../cn.ts";

export function Wordmark({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg
        viewBox="0 0 32 32"
        className="size-6 shrink-0"
        aria-hidden="true"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="1.5" y="1.5" width="29" height="29" rx="8" className="stroke-ink-600" strokeWidth="1.5" />
        <path
          d="M6 16h3l2-6 3 12 3-16 3 14 2-8 2 4h2"
          className="stroke-signal-500"
          strokeWidth="2"
        />
      </svg>
      {!compact && (
        <span className="font-mono text-sm tracking-tight text-ink-50">
          voice<span className="text-signal-500">-</span>labs
        </span>
      )}
    </span>
  );
}
