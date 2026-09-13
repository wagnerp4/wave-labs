import { Mic2, Sparkles, Upload } from "lucide-react";
import { Badge, Button, Card, MonoLabel } from "@wavelabs/ui";
import { EmptyState, Panel } from "../components/Panel.tsx";

const PRESETS = [
  { id: "af_heart", name: "Heart", adapter: "kokoro", tags: ["en-us", "female", "warm"] },
  { id: "am_michael", name: "Michael", adapter: "kokoro", tags: ["en-us", "male", "neutral"] },
  { id: "bf_emma", name: "Emma", adapter: "kokoro", tags: ["en-gb", "female", "clear"] },
  { id: "bm_george", name: "George", adapter: "kokoro", tags: ["en-gb", "male", "low"] }
];

export function Voices() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel label="clone">
          <div className="flex items-start gap-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-ink-800 text-signal-500">
              <Mic2 className="size-5" />
            </span>
            <div className="flex-1">
              <p className="text-[14px] font-medium">From a reference clip</p>
              <p className="mt-1 text-[12px] leading-relaxed text-ink-400">
                Three to ten seconds of clean speech. The enhancer can denoise it first.
              </p>
              <Button size="sm" variant="secondary" className="mt-3" disabled title="Cloning pipeline is not wired yet">
                <Upload className="size-3.5" /> Add clip
              </Button>
            </div>
          </div>
        </Panel>
        <Panel label="design">
          <div className="flex items-start gap-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-ink-800 text-signal-500">
              <Sparkles className="size-5" />
            </span>
            <div className="flex-1">
              <p className="text-[14px] font-medium">From a description</p>
              <p className="mt-1 text-[12px] leading-relaxed text-ink-400">
                “A calm woman in her forties, slight Irish accent, studio quality.” Uses Parler-TTS style prompting.
              </p>
              <Button size="sm" variant="secondary" className="mt-3" disabled title="Voice design is not wired yet">
                Describe a voice
              </Button>
            </div>
          </div>
        </Panel>
      </div>

      <Panel label="library" action={<span className="font-mono text-[10px] text-ink-400">{PRESETS.length} presets</span>}>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PRESETS.map((v) => (
            <li key={v.id}>
              <Card interactive className="flex flex-col gap-2 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[14px] font-medium">{v.name}</p>
                  <Badge tone="signal">{v.adapter}</Badge>
                </div>
                <MonoLabel>{v.id}</MonoLabel>
                <div className="flex flex-wrap gap-1">
                  {v.tags.map((t) => (
                    <span key={t} className="rounded bg-ink-800 px-1.5 py-0.5 font-mono text-[10px] text-ink-300">
                      {t}
                    </span>
                  ))}
                </div>
              </Card>
            </li>
          ))}
        </ul>
        <EmptyState title="Cloned and designed voices appear here" body="Stored locally under the app data directory as reference audio plus adapter-specific embeddings." />
      </Panel>
    </div>
  );
}
