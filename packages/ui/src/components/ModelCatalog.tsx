import { useMemo, useState } from "react";
import {
  TASK_LABELS,
  adapters as allAdapters,
  searchAdapters,
  type Adapter,
  type Hardware,
  type Task
} from "@wavelabs/registry";
import { cn } from "../cn.ts";
import { Chip } from "./Chip.tsx";
import { ModelCard } from "./ModelCard.tsx";
import { MonoLabel } from "./MonoLabel.tsx";
import { SearchInput } from "./SearchInput.tsx";

type Filter = Task | "all";

const FILTERS: Filter[] = ["all", "tts", "asr", "vc", "enhance"];

export function ModelCatalog({
  detected = null,
  onSelect,
  selectedId,
  dense = false,
  className,
  columns = "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
}: {
  detected?: Hardware | null;
  onSelect?: (adapter: Adapter) => void;
  selectedId?: string;
  dense?: boolean;
  className?: string;
  columns?: string;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const results = useMemo(() => searchAdapters(query, filter), [query, filter]);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: allAdapters.length, tts: 0, asr: 0, vc: 0, enhance: 0 };
    for (const a of allAdapters) c[a.task] += 1;
    return c;
  }, []);

  return (
    <div className={cn("flex flex-col gap-5", className)}>
      <SearchInput
        placeholder="Try Whisper or Kokoro"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="max-w-sm"
        aria-label="Search models"
      />

      <div className="flex flex-wrap gap-2">
        {FILTERS.filter((f) => counts[f] > 0).map((f) => (
          <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>
            {f === "all" ? "All" : TASK_LABELS[f]}
            <span className="ml-1.5 font-mono text-[10px] opacity-60">{counts[f]}</span>
          </Chip>
        ))}
      </div>

      <MonoLabel>
        {results.length} {results.length === 1 ? "adapter" : "adapters"}
      </MonoLabel>

      {results.length === 0 ? (
        <p className="text-sm text-ink-400">Nothing matches “{query}”.</p>
      ) : (
        <ul className={cn("grid gap-3", columns)}>
          {results.map((a) => (
            <li key={a.id} className="flex">
              <ModelCard
                adapter={a}
                detected={detected}
                onSelect={onSelect}
                selected={selectedId === a.id}
                dense={dense}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
