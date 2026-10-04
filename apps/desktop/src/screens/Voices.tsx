import { Mic2, Play, Sparkles, Square, Trash2, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Badge, Button, Card, MonoLabel } from "@wavelabs/ui";
import {
  cloneVoice,
  deleteVoice,
  designVoice,
  listVoices,
  synthesize,
  voiceAudioUrl,
  type EngineState,
  type VoiceRecord
} from "../lib/engineClient.ts";
import { EmptyState, Panel } from "../components/Panel.tsx";
import { VoiceScope } from "../components/VoiceScope.tsx";

const PREVIEW_LINE = "This is a short preview of the selected voice.";

export function Voices({ engine }: { engine: EngineState }) {
  const online = engine.kind === "online";
  const [voices, setVoices] = useState<VoiceRecord[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clip, setClip] = useState<File | null>(null);
  const [clipName, setClipName] = useState("");
  const [designName, setDesignName] = useState("");
  const [designText, setDesignText] = useState("");
  const [playing, setPlaying] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const refresh = useCallback(async () => {
    if (!online) {
      setVoices([]);
      return;
    }
    try {
      setLoadError(null);
      setVoices(await listVoices());
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : String(e));
    }
  }, [online]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const presets = voices.filter((v) => v.kind === "preset");
  const library = voices.filter((v) => v.kind !== "preset");

  async function onClone() {
    if (!clip) return;
    setBusy(true);
    setError(null);
    try {
      await cloneVoice({ name: clipName.trim() || clip.name.replace(/\.[^.]+$/, ""), file: clip });
      setClip(null);
      setClipName("");
      if (fileRef.current) fileRef.current.value = "";
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function onDesign() {
    if (!designName.trim() || !designText.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await designVoice({ name: designName.trim(), description: designText.trim() });
      setDesignName("");
      setDesignText("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function play(voice: VoiceRecord) {
    const el = audioRef.current;
    if (!el) return;
    if (playing === voice.id) {
      el.pause();
      setPlaying(null);
      return;
    }
    try {
      setError(null);
      if (voice.kind === "clone" && voice.has_audio) {
        el.src = voiceAudioUrl(voice.id);
      } else if (voice.kind === "mix" || (voice.kind === "preset" && voice.adapter === "kokoro")) {
        const blob = await synthesize({
          model: "kokoro",
          text: PREVIEW_LINE,
          voice: voice.formula ?? voice.id,
          speed: voice.speed ?? 1
        });
        el.src = URL.createObjectURL(blob);
      } else if (voice.kind === "preset") {
        setError(
          `${voice.name} is an ${voice.adapter} preset. Preview only runs for Kokoro. Leah, Tara, and the other named presets are Orpheus IDs, not hexgrad/Kokoro-82M voices.`
        );
        return;
      } else {
        setError("Designed voices play from their probe clip. Open Voice Creation if this one has no audio yet.");
        return;
      }
      await el.play();
      setPlaying(voice.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function remove(id: string) {
    setBusy(true);
    setError(null);
    try {
      if (playing === id && audioRef.current) {
        audioRef.current.pause();
        setPlaying(null);
      }
      await deleteVoice(id);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <audio ref={audioRef} onEnded={() => setPlaying(null)} className="hidden" />
      <VoiceScope online={online} voices={voices} onSaved={refresh} onError={setError} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel label="clone">
          <div className="flex items-start gap-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-ink-800 text-signal-500">
              <Mic2 className="size-5" />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <div>
                <p className="text-[14px] font-medium">From a reference clip</p>
                <p className="mt-1 text-[12px] leading-relaxed text-ink-400">
                  Stored under ~/.wavelabs/voices. Cloning adapters are not implemented yet. Playback uses the clip
                  itself.
                </p>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="audio/*,video/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setClip(f);
                  if (f && !clipName) setClipName(f.name.replace(/\.[^.]+$/, ""));
                }}
              />
              <input
                value={clipName}
                onChange={(e) => setClipName(e.target.value)}
                placeholder="Voice name"
                className="vl-focus h-9 rounded-md border border-ink-700 bg-ink-950 px-3 text-[13px]"
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  type="button"
                  disabled={!online || busy}
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload className="size-3.5" />
                  {clip ? clip.name : "Add clip"}
                </Button>
                <Button size="sm" type="button" disabled={!online || busy || !clip} onClick={() => void onClone()}>
                  Save clip
                </Button>
              </div>
            </div>
          </div>
        </Panel>
        <Panel label="design">
          <div className="flex items-start gap-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-ink-800 text-signal-500">
              <Sparkles className="size-5" />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <div>
                <p className="text-[14px] font-medium">From a description</p>
                <p className="mt-1 text-[12px] leading-relaxed text-ink-400">
                  Saves a Parler prompt and synthesizes a probe clip. Prefer Voice Creation for the full flow.
                </p>
              </div>
              <input
                value={designName}
                onChange={(e) => setDesignName(e.target.value)}
                placeholder="Voice name"
                className="vl-focus h-9 rounded-md border border-ink-700 bg-ink-950 px-3 text-[13px]"
              />
              <textarea
                value={designText}
                onChange={(e) => setDesignText(e.target.value)}
                rows={3}
                placeholder="A calm woman in her forties, slight Irish accent, studio quality."
                className="vl-focus w-full resize-y rounded-md border border-ink-700 bg-ink-950 p-3 text-[13px] leading-relaxed"
              />
              <Button
                size="sm"
                type="button"
                disabled={!online || busy || !designName.trim() || !designText.trim()}
                onClick={() => void onDesign()}
              >
                Describe a voice
              </Button>
            </div>
          </div>
        </Panel>
      </div>

      {error && <p className="font-mono text-[12px] text-danger-400">{error}</p>}
      {loadError && <p className="font-mono text-[12px] text-danger-400">{loadError}</p>}
      {!online && (
        <p className="text-[12px] text-ink-400">Engine offline. Start wavelabs-engine serve to save and list voices.</p>
      )}

      <Panel label="library" action={<span className="font-mono text-[10px] text-ink-400">{presets.length} presets</span>}>
        {presets.length === 0 ? (
          <EmptyState title="No presets loaded" body="Presets appear when the engine answers GET /v1/voices." />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {presets.map((v) => (
              <VoiceCard key={v.id} voice={v} playing={playing === v.id} onPlay={() => void play(v)} />
            ))}
          </ul>
        )}
      </Panel>

      <Panel
        label="yours"
        action={<span className="font-mono text-[10px] text-ink-400">{library.length}</span>}
      >
        {library.length === 0 ? (
          <EmptyState
            title="Cloned and designed voices appear here"
            body="Stored under ~/.wavelabs/voices as voice.json plus optional reference audio."
          />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {library.map((v) => (
              <VoiceCard
                key={v.id}
                voice={v}
                playing={playing === v.id}
                onPlay={() => void play(v)}
                onDelete={v.kind === "preset" ? undefined : () => void remove(v.id)}
              />
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function VoiceCard({
  voice,
  playing,
  onPlay,
  onDelete
}: {
  voice: VoiceRecord;
  playing: boolean;
  onPlay: () => void;
  onDelete?: () => void;
}) {
  const canPlay = (voice.kind === "preset" && voice.adapter === "kokoro") || voice.kind === "mix" || voice.has_audio;
  return (
    <li>
      <Card className="flex flex-col gap-2 p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-[14px] font-medium">{voice.name}</p>
          <Badge tone={voice.kind === "preset" ? "signal" : "neutral"}>{voice.adapter}</Badge>
        </div>
        <MonoLabel>{voice.id}</MonoLabel>
        {voice.description && <p className="line-clamp-3 text-[12px] leading-relaxed text-ink-400">{voice.description}</p>}
        <div className="flex flex-wrap gap-1">
          {voice.tags.map((t) => (
            <span key={t} className="rounded bg-ink-800 px-1.5 py-0.5 font-mono text-[10px] text-ink-300">
              {t}
            </span>
          ))}
        </div>
        <div className="mt-1 flex items-center gap-1">
          <button
            type="button"
            onClick={onPlay}
            disabled={!canPlay}
            title={canPlay ? "Play" : "No audio yet"}
            className="vl-focus flex size-8 items-center justify-center rounded-md bg-ink-800 text-signal-500 hover:bg-ink-700 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={playing ? "Stop" : "Play"}
          >
            {playing ? <Square className="size-3.5" /> : <Play className="size-3.5" />}
          </button>
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="vl-focus flex size-8 items-center justify-center rounded-md text-ink-400 hover:bg-ink-800 hover:text-danger-400"
              aria-label="Delete"
            >
              <Trash2 className="size-3.5" />
            </button>
          )}
        </div>
      </Card>
    </li>
  );
}
