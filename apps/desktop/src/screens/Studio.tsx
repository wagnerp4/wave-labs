import { Download, Play, Square } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Badge, Button, HardwareBadges, MonoLabel, Waveform, cn } from "@voicelabs/ui";
import { adaptersByTask, type Adapter, type Hardware } from "@voicelabs/registry";
import { synthesize, type EngineState } from "../lib/engineClient.ts";
import { EmptyState, Panel } from "../components/Panel.tsx";

type Take = { id: string; adapter: string; text: string; url: string; createdAt: number };

const SAMPLE =
  "The lab is quiet at this hour. Only the fans, and a voice that is not quite anyone's, reading back what I typed.";

export function Studio({ engine, detected }: { engine: EngineState; detected: Hardware | null }) {
  const tts = useMemo(() => adaptersByTask("tts").filter((a) => a.connection === "local"), []);
  const [adapterId, setAdapterId] = useState<string>(tts.find((a) => a.status !== "planned")?.id ?? tts[0]?.id ?? "");
  const [text, setText] = useState(SAMPLE);
  const [speed, setSpeed] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [takes, setTakes] = useState<Take[]>([]);
  const [playing, setPlaying] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const adapter: Adapter | undefined = tts.find((a) => a.id === adapterId);
  const online = engine.kind === "online";
  const canRun = online && adapter && adapter.status !== "planned" && text.trim().length > 0 && !busy;

  async function run() {
    if (!adapter) return;
    setBusy(true);
    setError(null);
    try {
      const blob = await synthesize({ model: adapter.id, text, speed });
      const url = URL.createObjectURL(blob);
      setTakes((t) => [{ id: crypto.randomUUID(), adapter: adapter.id, text, url, createdAt: Date.now() }, ...t]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function toggle(take: Take) {
    const el = audioRef.current;
    if (!el) return;
    if (playing === take.id) {
      el.pause();
      setPlaying(null);
      return;
    }
    el.src = take.url;
    void el.play();
    setPlaying(take.id);
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-[1fr_320px]">
      <div className="flex flex-col gap-4">
        <Panel
          label="script"
          action={<span className="font-mono text-[10px] text-ink-400">{text.length} chars</span>}
        >
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={9}
            spellCheck={false}
            className="vl-focus w-full resize-y rounded-lg border border-ink-700 bg-ink-950 p-4 text-[15px] leading-relaxed text-ink-50 placeholder:text-ink-500"
            placeholder="Type or paste a script"
          />
          <div className="flex items-center justify-between">
            <p className="text-[12px] text-ink-400">
              {!online
                ? "Engine offline. Generation is disabled until the local API responds."
                : adapter?.status === "planned"
                  ? "This adapter is in the catalog but not implemented yet."
                  : "Ready."}
            </p>
            <Button onClick={run} disabled={!canRun}>
              {busy ? <Waveform live bars={5} className="h-4" /> : <Play className="size-4" />}
              {busy ? "Rendering" : "Generate"}
            </Button>
          </div>
          {error && <p className="font-mono text-[12px] text-danger-400">{error}</p>}
        </Panel>

        <Panel label="takes" action={<span className="font-mono text-[10px] text-ink-400">{takes.length}</span>}>
          <audio ref={audioRef} onEnded={() => setPlaying(null)} className="hidden" />
          {takes.length === 0 ? (
            <EmptyState
              title="No takes yet"
              body="Rendered audio shows up here. Each take keeps the script and adapter it was made with."
            />
          ) : (
            <ul className="flex flex-col divide-y divide-ink-800">
              {takes.map((t) => (
                <li key={t.id} className="flex items-center gap-3 py-3">
                  <button
                    type="button"
                    onClick={() => toggle(t)}
                    className="vl-focus flex size-9 shrink-0 items-center justify-center rounded-md bg-ink-800 text-signal-500 hover:bg-ink-700"
                    aria-label={playing === t.id ? "Stop" : "Play"}
                  >
                    {playing === t.id ? <Square className="size-4" /> : <Play className="size-4" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px]">{t.text}</p>
                    <p className="font-mono text-[10px] text-ink-400">
                      {t.adapter} · {new Date(t.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                  <a
                    href={t.url}
                    download={`voice-labs-${t.adapter}-${t.createdAt}.wav`}
                    className="vl-focus rounded-md p-2 text-ink-400 hover:bg-ink-800 hover:text-ink-50"
                    aria-label="Download"
                  >
                    <Download className="size-4" />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="flex flex-col gap-4">
        <Panel label="engine" action={<span className="font-mono text-[10px] text-ink-400">{tts.length}</span>}>
          <div className="-mr-2 flex max-h-72 flex-col gap-1 overflow-y-auto pr-2">
            {tts.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setAdapterId(a.id)}
                className={cn(
                  "vl-focus flex items-center justify-between rounded-md px-2.5 py-2 text-left text-[13px] transition-colors",
                  a.id === adapterId ? "bg-ink-800 text-ink-50" : "text-ink-300 hover:bg-ink-850"
                )}
              >
                <span className="truncate">{a.name}</span>
                <Badge tone={a.status === "planned" ? "neutral" : "signal"} className="ml-2 shrink-0">
                  {a.status === "planned" ? "soon" : a.status}
                </Badge>
              </button>
            ))}
          </div>
          {adapter && (
            <div className="mt-2 flex flex-col gap-2 border-t border-ink-800 pt-3">
              <p className="text-[12px] leading-relaxed text-ink-300">{adapter.description}</p>
              <HardwareBadges supported={adapter.hardware} detected={detected} />
            </div>
          )}
        </Panel>

        <Panel label="voice">
          <select
            className="vl-focus h-9 rounded-md border border-ink-700 bg-ink-950 px-2 text-[13px]"
            defaultValue="default"
            disabled
            title="Voice listing per adapter is not implemented yet"
          >
            <option value="default">default</option>
          </select>
          <label className="flex flex-col gap-1.5 text-[12px] text-ink-300">
            <span className="flex justify-between">
              <span>Speed</span>
              <span className="font-mono text-ink-100">{speed.toFixed(2)}×</span>
            </span>
            <input
              type="range"
              min={0.5}
              max={2}
              step={0.05}
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="accent-signal-500"
            />
          </label>
          <MonoLabel className="mt-1">
            {adapter?.languages === "multilingual" ? "multilingual" : adapter?.languages.join(" · ")}
          </MonoLabel>
        </Panel>
      </div>
    </div>
  );
}
