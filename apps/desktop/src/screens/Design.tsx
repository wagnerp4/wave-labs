import { Play, Square } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button, MonoLabel } from "@wavelabs/ui";
import {
  designVoice,
  listEngineModels,
  listVoices,
  voiceAudioUrl,
  type EngineModel,
  type EngineState,
  type VoiceRecord
} from "../lib/engineClient.ts";
import { ModelInstall } from "../components/ModelInstall.tsx";
import { EmptyState, Panel } from "../components/Panel.tsx";

const PROBE = "The leaves move though the air is still. Listen for a moment.";

const PRESETS = [
  {
    name: "Ghost hall",
    text: "A very thin, cold, breathy female speaker with a distant whispery delivery, slightly unstable pitch, slow speaking rate, recorded in a large empty stone hall with natural reverb, very clear but not bright, no background noise."
  },
  {
    name: "Warm studio",
    text: "A warm, slightly low-pitched female speaker with a calm, close-mic delivery, moderate pace, recorded in a dry professional studio, very high quality, no noise."
  },
  {
    name: "Old radio",
    text: "An older male speaker with a gravelly, slightly nasal voice, measured pace, as if heard through a 1940s radio, mild band-limited tone, studio narration."
  },
  {
    name: "Quiet child",
    text: "A young child's voice, high pitch, soft and careful, slightly slow, recorded in a quiet room with a close microphone, clean, no effects."
  }
];

export function Design({ engine }: { engine: EngineState }) {
  const online = engine.kind === "online";
  const [models, setModels] = useState<EngineModel[]>([]);
  const [library, setLibrary] = useState<VoiceRecord[]>([]);
  const [name, setName] = useState("Ghost hall");
  const [description, setDescription] = useState(PRESETS[0].text);
  const [script, setScript] = useState(PROBE);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const refreshModels = useCallback(() => {
    if (!online) {
      setModels([]);
      return;
    }
    void listEngineModels()
      .then(setModels)
      .catch(() => setModels([]));
  }, [online]);

  const refreshLibrary = useCallback(async () => {
    if (!online) {
      setLibrary([]);
      return;
    }
    try {
      const all = await listVoices();
      setLibrary(all.filter((v) => v.kind === "design"));
    } catch {
      setLibrary([]);
    }
  }, [online]);

  useEffect(() => {
    refreshModels();
  }, [refreshModels]);

  useEffect(() => {
    void refreshLibrary();
  }, [refreshLibrary]);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      await designVoice({ name: name.trim() || "Untitled design", description: description.trim(), script: script.trim() });
      await refreshLibrary();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function play(voice: VoiceRecord) {
    const el = audioRef.current;
    if (!el || !voice.has_audio) return;
    if (playing === voice.id) {
      el.pause();
      setPlaying(null);
      return;
    }
    el.src = voiceAudioUrl(voice.id);
    void el.play();
    setPlaying(voice.id);
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-[1fr_320px]">
      <audio ref={audioRef} onEnded={() => setPlaying(null)} className="hidden" />
      <div className="flex flex-col gap-4">
        <Panel label="description">
          <p className="text-[12px] leading-relaxed text-ink-400">
            Parler-TTS Mini v1 was trained on about 45 thousand hours of described English speech, not 45 thousand
            clips. That covers ordinary speakers well. A ghost-like voice is mostly out of distribution. Prompt for
            breath, distance, hall reverb, and slow rate rather than the word supernatural.
          </p>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Voice name"
            className="vl-focus h-9 rounded-md border border-ink-700 bg-ink-950 px-3 text-[13px]"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={7}
            spellCheck={false}
            className="vl-focus w-full resize-y rounded-lg border border-ink-700 bg-ink-950 p-4 text-[14px] leading-relaxed text-ink-50"
          />
          <label className="flex flex-col gap-1 text-[11px] text-ink-400">
            Probe line
            <input
              value={script}
              onChange={(e) => setScript(e.target.value)}
              className="vl-focus h-9 rounded-md border border-ink-700 bg-ink-950 px-3 text-[13px] text-ink-50"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => {
                  setName(p.name);
                  setDescription(p.text);
                }}
                className="vl-focus rounded-md border border-ink-700 px-2 py-1 font-mono text-[10px] text-ink-300 hover:border-signal-500 hover:text-ink-50"
              >
                {p.name}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between">
            <p className="text-[12px] text-ink-400">
              {!online
                ? "Engine offline."
                : busy
                  ? "First Parler pass downloads Mini v1 into ~/.wavelabs/models."
                  : "Creates a library voice from the description. No Kokoro pack is used."}
            </p>
            <Button onClick={() => void run()} disabled={!online || busy || description.trim().length < 3}>
              {busy ? "Designing" : "Generate voice"}
            </Button>
          </div>
          {error && <p className="font-mono text-[12px] text-danger-400">{error}</p>}
        </Panel>

        <Panel label="designed" action={<span className="font-mono text-[10px] text-ink-400">{library.length}</span>}>
          {library.length === 0 ? (
            <EmptyState
              title="No designed voices yet"
              body="Generate from a description. The probe wav is stored next to the prompt."
            />
          ) : (
            <ul className="flex flex-col divide-y divide-ink-800">
              {library.map((v) => (
                <li key={v.id} className="flex items-start gap-3 py-3">
                  <button
                    type="button"
                    disabled={!v.has_audio}
                    onClick={() => play(v)}
                    className="vl-focus flex size-9 shrink-0 items-center justify-center rounded-md bg-ink-800 text-signal-500 disabled:opacity-40"
                    aria-label={playing === v.id ? "Stop" : "Play"}
                  >
                    {playing === v.id ? <Square className="size-4" /> : <Play className="size-4" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium">{v.name}</p>
                    <MonoLabel>{v.id}</MonoLabel>
                    {v.description && (
                      <p className="mt-1 line-clamp-3 text-[12px] leading-relaxed text-ink-400">{v.description}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel label="parler-tts mini v1">
        <p className="text-[12px] leading-relaxed text-ink-300">
          Description-conditioned TTS. Each generate samples a speaker from the prompt. Save the result and reuse it
          in Studio with model parler-tts so later lines keep that prompt.
        </p>
        <p className="text-[11px] leading-relaxed text-ink-400">
          Card:{" "}
          <a
            href="https://huggingface.co/parler-tts/parler-tts-mini-v1"
            target="_blank"
            rel="noreferrer"
            className="font-mono text-ink-200 hover:text-signal-400"
          >
            parler-tts/parler-tts-mini-v1
          </a>
          . Snapshot path: ~/.wavelabs/models
        </p>
        <ModelInstall
          adapterId="parler-tts"
          online={online}
          models={models}
          hfRepo="parler-tts/parler-tts-mini-v1"
          onRefresh={refreshModels}
        />
      </Panel>
    </div>
  );
}
