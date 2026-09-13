import { MonoLabel, StatusDot, Wordmark, cn } from "@wavelabs/ui";
import type { EngineState } from "../lib/engineClient.ts";
import { NAV, type Screen } from "../lib/navigation.ts";

export function Sidebar({
  active,
  onNavigate,
  engine
}: {
  active: Screen;
  onNavigate: (s: Screen) => void;
  engine: EngineState;
}) {
  const groups = [
    { id: "create", label: "create" },
    { id: "manage", label: "manage" }
  ] as const;

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-ink-800 bg-ink-900">
      <div className="flex h-14 items-center px-4">
        <Wordmark />
      </div>

      <nav className="flex flex-1 flex-col gap-5 px-3 py-2">
        {groups.map((g) => (
          <div key={g.id} className="flex flex-col gap-0.5">
            <MonoLabel className="px-2 pb-1.5">{g.label}</MonoLabel>
            {NAV.filter((n) => n.group === g.id).map((item) => {
              const Icon = item.icon;
              const isActive = item.id === active;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "vl-focus flex h-9 items-center gap-2.5 rounded-md px-2 text-[13px] transition-colors",
                    isActive
                      ? "bg-ink-800 text-ink-50"
                      : "text-ink-300 hover:bg-ink-850 hover:text-ink-50"
                  )}
                >
                  <Icon className={cn("size-4", isActive ? "text-signal-500" : "text-ink-400")} />
                  {item.label}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-ink-800 p-3">
        <div className="flex items-center gap-2 rounded-md bg-ink-850 px-2.5 py-2">
          <StatusDot state={engine.kind === "online" ? "online" : engine.kind === "error" ? "error" : "offline"} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] text-ink-100">
              Engine {engine.kind === "online" ? `v${engine.health.version}` : engine.kind}
            </p>
            <p className="truncate font-mono text-[10px] text-ink-400">
              {engine.kind === "online" ? engine.health.hardware.detected.toUpperCase() : "127.0.0.1:8471"}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
