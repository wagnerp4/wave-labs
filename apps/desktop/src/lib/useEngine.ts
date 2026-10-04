import { useEffect, useState } from "react";
import { fetchHealth, type EngineState } from "./engineClient.ts";

export function useEngine(pollMs = 12000): EngineState {
  const [state, setState] = useState<EngineState>({ kind: "offline" });

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    let misses = 0;

    async function tick() {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const next = await fetchHealth(controller.signal);
      clearTimeout(timeout);
      if (cancelled) return;
      if (next.kind === "offline") {
        misses += 1;
        setState((prev) => (prev.kind === "online" && misses < 3 ? prev : next));
      } else {
        misses = 0;
        setState(next);
      }
      timer = setTimeout(tick, pollMs);
    }

    void tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [pollMs]);

  return state;
}
