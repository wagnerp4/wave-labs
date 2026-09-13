import type { HTMLAttributes, ReactNode } from "react";
import { Card, MonoLabel, cn } from "@wavelabs/ui";

export function Panel({
  label,
  action,
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { label: string; action?: ReactNode }) {
  return (
    <Card className={cn("flex flex-col gap-3 p-5", className)} {...props}>
      <div className="flex items-center justify-between">
        <MonoLabel>{label}</MonoLabel>
        {action}
      </div>
      {children}
    </Card>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-ink-700 px-6 py-10 text-center">
      <p className="text-sm text-ink-100">{title}</p>
      <p className="mt-1 max-w-sm text-[12px] leading-relaxed text-ink-400">{body}</p>
    </div>
  );
}
