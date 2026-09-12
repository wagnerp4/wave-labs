import { cn } from "../cn.ts";

type State = "online" | "offline" | "busy" | "error";

const colors: Record<State, string> = {
  online: "bg-phosphor-400",
  offline: "bg-ink-500",
  busy: "bg-signal-500 vl-pulse",
  error: "bg-danger-400"
};

export function StatusDot({ state, className }: { state: State; className?: string }) {
  return (
    <span
      className={cn("inline-block size-2 rounded-full", colors[state], className)}
      aria-label={state}
    />
  );
}
