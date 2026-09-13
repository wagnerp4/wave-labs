import { Badge } from "@wavelabs/ui";
import type { EngineState } from "../lib/engineClient.ts";
import { NAV, type Screen } from "../lib/navigation.ts";

export function TopBar({ screen, engine }: { screen: Screen; engine: EngineState }) {
  const item = NAV.find((n) => n.id === screen);
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-ink-800 px-8">
      <h1 className="text-[15px] font-medium text-ink-50">{item?.label}</h1>
      <div className="flex items-center gap-2">
        {engine.kind === "online" ? (
          <>
            <Badge tone="phosphor">{engine.health.hardware.detected}</Badge>
            <Badge>{engine.health.loaded.length} loaded</Badge>
          </>
        ) : (
          <Badge>engine offline</Badge>
        )}
      </div>
    </header>
  );
}
