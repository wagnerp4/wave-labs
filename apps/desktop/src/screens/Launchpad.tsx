import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { Badge, Button, Card, MonoLabel, Waveform } from "@wavelabs/ui";
import { registry } from "@wavelabs/registry";
import type { EngineState } from "../lib/engineClient.ts";
import { isTauri, startEngine } from "../lib/tauri.ts";
import { NAV, type Screen } from "../lib/navigation.ts";

const QUICK: { id: Screen; title: string; body: string }[] = [
  { id: "studio", title: "Generate speech", body: "Script in, WAV out. Compare engines." },
  { id: "transcribe", title: "Transcribe audio", body: "Drop files, get timestamped text." },
  { id: "voices", title: "Clone or design a voice", body: "Reference clip or text description." },
  { id: "audiobooks", title: "Produce an audiobook", body: "Manuscript in, chaptered audio out." }
];

export function Launchpad({
  onNavigate,
  engine
}: {
  onNavigate: (s: Screen) => void;
  engine: EngineState;
}) {
  const experimental = registry.adapters.filter((a) => a.status !== "planned");
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  async function onStartEngine() {
    setStarting(true);
    setStartError(null);
    try {
      await startEngine();
    } catch (e) {
      setStartError(e instanceof Error ? e.message : String(e));
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <section className="relative overflow-hidden rounded-card border border-ink-700 bg-ink-900 p-7">
        <div className="vl-grid-bg pointer-events-none absolute inset-0" />
        <div className="relative flex items-start justify-between gap-6">
          <div>
            <MonoLabel className="text-signal-500">welcome</MonoLabel>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">What do you want to make?</h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-300">
              Everything runs on this machine. Start the engine from the sidebar if it shows offline, or pick a
              workflow below.
            </p>
          </div>
          <Waveform live={engine.kind === "online"} bars={16} className="h-10" />
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        {QUICK.map((q) => {
          const Icon = NAV.find((n) => n.id === q.id)?.icon;
          return (
            <Card
              key={q.id}
              interactive
              role="button"
              tabIndex={0}
              onClick={() => onNavigate(q.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") onNavigate(q.id);
              }}
              className="vl-focus flex items-center gap-4 p-5"
            >
              {Icon && (
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-ink-800 text-signal-500">
                  <Icon className="size-5" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-medium">{q.title}</p>
                <p className="text-[12px] text-ink-400">{q.body}</p>
              </div>
              <ArrowRight className="size-4 text-ink-500" />
            </Card>
          );
        })}
      </section>

      <section className="grid gap-3 lg:grid-cols-[2fr_1fr]">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <MonoLabel>engine status</MonoLabel>
            <Badge tone={engine.kind === "online" ? "phosphor" : "neutral"}>{engine.kind}</Badge>
          </div>
          {engine.kind === "online" ? (
            <dl className="mt-3 grid grid-cols-3 gap-3 text-[13px]">
              <div>
                <dt className="text-ink-400">Version</dt>
                <dd className="font-mono">{engine.health.version}</dd>
              </div>
              <div>
                <dt className="text-ink-400">Hardware</dt>
                <dd className="font-mono uppercase">{engine.health.hardware.detected}</dd>
              </div>
              <div>
                <dt className="text-ink-400">Loaded</dt>
                <dd className="font-mono">{engine.health.loaded.length || "none"}</dd>
              </div>
            </dl>
          ) : (
            <div className="mt-3 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-4">
                <p className="text-[13px] text-ink-300">
                  No engine on <span className="font-mono">127.0.0.1:8471</span>. Run{" "}
                  <span className="font-mono text-ink-100">wavelabs-engine serve</span> or let the app spawn it.
                </p>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={!isTauri() || starting}
                  title={isTauri() ? "Spawn wavelabs-engine via uv" : "Open the desktop executable to spawn the engine"}
                  onClick={() => void onStartEngine()}
                >
                  {starting ? "Starting" : "Start engine"}
                </Button>
              </div>
              {startError && <p className="font-mono text-[11px] text-danger-400">{startError}</p>}
            </div>
          )}
        </Card>
        <Card className="p-5">
          <MonoLabel>catalog</MonoLabel>
          <p className="mt-2 text-3xl font-semibold tabular-nums">{registry.adapters.length}</p>
          <p className="text-[12px] text-ink-400">
            adapters · {experimental.length} implemented · updated {registry.updated}
          </p>
        </Card>
      </section>
    </div>
  );
}
