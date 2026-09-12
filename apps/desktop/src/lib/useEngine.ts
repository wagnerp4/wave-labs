import { useEffect, useState } from "react";
import { fetchHealth, type EngineState } from "./engineClient.ts";

export function useEngine(pollMs = 4000): EngineState {
  const [state, setState] = useState<EngineState>({ kind: "offline" });

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function tick() {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1500);
      const next = await fetchHealth(controller.signal);
      clearTimeout(timeout);
      if (!cancelled) {
        setState(next);
        timer = setTimeout(tick, pollMs);
      }
    }

    void tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [pollMs]);

  return state;
}
