import { Search } from "lucide-react";
import type { InputHTMLAttributes } from "react";
import { cn } from "../cn.ts";

export function SearchInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label
      className={cn(
        "flex h-10 items-center gap-2 rounded-lg border border-ink-700 bg-ink-900 px-3 text-sm text-ink-50 transition-colors focus-within:border-signal-500/70",
        className
      )}
    >
      <Search className="size-4 shrink-0 text-ink-400" aria-hidden="true" />
      <input
        type="search"
        className="w-full bg-transparent placeholder:text-ink-400 focus:outline-none"
        {...props}
      />
    </label>
  );
}
