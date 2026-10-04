import { FileAudio, Upload } from "lucide-react";
import { useEffect, useMemo, useState, type DragEvent } from "react";
import { Button, cn } from "@wavelabs/ui";
import { adaptersByTask } from "@wavelabs/registry";
import {
  isImplemented,
  listEngineModels,
  transcribe,
  type EngineModel,
  type EngineState
} from "../lib/engineClient.ts";
import { EmptyState, Panel } from "../components/Panel.tsx";
import { EnginePick } from "../components/EnginePick.tsx";
import { ModelInstall } from "../components/ModelInstall.tsx";

type Segment = { start: number; end: number; text: string };

function fmt(s: number): string {
  const m = Math.floor(s / 60);
  const r = (s % 60).toFixed(1).padStart(4, "0");
  return `${String(m).padStart(2, "0")}:${r}`;
}

export function Transcribe({ engine }: { engine: EngineState }) {
  const asr = useMemo(() => adaptersByTask("asr").filter((a) => a.connection === "local"), []);
  const [models, setModels] = useState<EngineModel[]>([]);
  const [adapterId, setAdapterId] = useState("faster-whisper");
  const [file, setFile] = useState<File | null>(null);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ text: string; segments: Segment[] } | null>(null);

  const adapter = asr.find((a) => a.id === adapterId);
  const online = engine.kind === "online";
  const ready = adapter ? isImplemented(adapter.id, models) : false;
  const canRun = online && file && adapter && ready && !busy;

  useEffect(() => {
    if (!online) {
      setModels([]);
      return;
    }
    void listEngineModels()
      .then(setModels)
      .catch(() => setModels([]));
  }, [online]);

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  }

  async function run() {
    if (!file || !adapter) return;
    setBusy(true);
    setError(null);
    try {
      const res = await transcribe({ model: adapter.id, file });
      setResult({ text: res.text, segments: res.segments ?? [] });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-[1fr_320px]">
      <div className="flex flex-col gap-4">
        <Panel label="input">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={onDrop}
            className={cn(
              "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-6 py-12 text-center transition-colors",
              drag ? "border-signal-500 bg-signal-500/5" : "border-ink-700"
            )}
          >
            <span className="flex size-12 items-center justify-center rounded-full bg-ink-800 text-signal-500">
              {file ? <FileAudio className="size-5" /> : <Upload className="size-5" />}
            </span>
            {file ? (
              <div>
                <p className="text-[14px]">{file.name}</p>
                <p className="font-mono text-[11px] text-ink-400">{(file.size / 1e6).toFixed(1)} MB</p>
              </div>
            ) : (
              <div>
                <p className="text-[14px]">Drop audio or video here</p>
                <p className="text-[12px] text-ink-400">wav, mp3, flac, m4a, mp4, mkv</p>
              </div>
            )}
            <label className="vl-focus cursor-pointer rounded-md border border-ink-600 px-3 py-1.5 text-[12px] text-ink-200 hover:border-ink-400">
              Choose file
              <input
                type="file"
                accept="audio/*,video/*"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-[12px] text-ink-400">
              {!online
                ? "Engine offline."
                : !ready
                  ? "Listed in the catalog. This engine build has no factory."
                  : "Ready."}
            </p>
            <Button onClick={run} disabled={!canRun}>
              {busy ? "Transcribing" : "Transcribe"}
            </Button>
          </div>
          {error && <p className="font-mono text-[12px] text-danger-400">{error}</p>}
        </Panel>

        <Panel label="transcript">
          {!result ? (
            <EmptyState title="No transcript yet" body="Segments with timestamps appear here. Export to SRT, VTT or JSON." />
          ) : result.segments.length > 0 ? (
            <ol className="flex flex-col divide-y divide-ink-800">
              {result.segments.map((s, i) => (
                <li key={i} className="grid grid-cols-[6rem_1fr] gap-3 py-2 text-[13px]">
                  <span className="font-mono text-[11px] text-ink-400">
                    {fmt(s.start)} → {fmt(s.end)}
                  </span>
                  <span>{s.text}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-[14px] leading-relaxed">{result.text}</p>
          )}
        </Panel>
      </div>

      <Panel label="engine" action={<span className="font-mono text-[10px] text-ink-400">{asr.length}</span>}>
        <div className="-mr-2 flex max-h-72 flex-col gap-1 overflow-y-auto pr-2">
          {asr.map((a) => (
            <EnginePick
              key={a.id}
              adapter={a}
              active={a.id === adapterId}
              implemented={isImplemented(a.id, models)}
              onSelect={() => setAdapterId(a.id)}
            />
          ))}
        </div>
        {adapter && <p className="border-t border-ink-800 pt-3 text-[12px] leading-relaxed text-ink-300">{adapter.description}</p>}
        {adapter && (
          <ModelInstall
            adapterId={adapter.id}
            online={online}
            models={models}
            hfRepo={adapter.hf_repo}
            onRefresh={() => {
              void listEngineModels()
                .then(setModels)
                .catch(() => setModels([]));
            }}
          />
        )}
      </Panel>
    </div>
  );
}
