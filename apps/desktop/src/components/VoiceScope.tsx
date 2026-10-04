import { Play, Square } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { Button, MonoLabel } from "@wavelabs/ui";
import {
  DEFAULT_TTS_MODEL,
  DEFAULT_TTS_VOICE,
  mixVoice,
  synthesize,
  voiceAudioUrl,
  type VoiceRecord
} from "../lib/engineClient.ts";
import { Panel } from "./Panel.tsx";

const PREVIEW_LINE = "This is a short preview of the selected voice.";
const MIN_SPEED = 0.5;
const MAX_SPEED = 2;
const BINS = 240;

function canPlot(voice: VoiceRecord): boolean {
  if (voice.kind === "preset" && voice.adapter === "kokoro") return true;
  if (voice.kind === "mix" && voice.adapter === "kokoro") return true;
  return voice.has_audio;
}

function kokoroFormula(primary: VoiceRecord, blendId: string): string {
  if (primary.kind === "mix" && primary.formula) return primary.formula;
  if (primary.kind === "preset" && blendId && blendId !== primary.id) {
    return `${primary.id},${blendId}`;
  }
  if (primary.kind === "preset") return primary.id;
  return primary.formula || primary.id;
}

function placeholderPeaks(bins: number): Float32Array {
  const out = new Float32Array(bins);
  for (let i = 0; i < bins; i += 1) {
    const t = i / bins;
    const env = Math.sin(Math.PI * t) ** 0.6;
    const grain = 0.35 + 0.65 * Math.abs(Math.sin(i / 6.5) * Math.sin(i / 19));
    out[i] = env * grain;
  }
  return out;
}

function normalizePeaks(peaks: Float32Array): Float32Array {
  let max = 0;
  for (let i = 0; i < peaks.length; i += 1) {
    if (peaks[i] > max) max = peaks[i];
  }
  if (max <= 1e-6) return peaks;
  const out = new Float32Array(peaks.length);
  for (let i = 0; i < peaks.length; i += 1) {
    out[i] = peaks[i] / max;
  }
  return out;
}

function peaksFromPcm(samples: Float32Array, bins: number): Float32Array {
  const out = new Float32Array(bins);
  const step = Math.max(1, Math.floor(samples.length / bins));
  for (let i = 0; i < bins; i += 1) {
    let peak = 0;
    const start = i * step;
    const end = Math.min(samples.length, start + step);
    for (let j = start; j < end; j += 1) {
      const v = Math.abs(samples[j] ?? 0);
      if (v > peak) peak = v;
    }
    out[i] = peak;
  }
  return normalizePeaks(out);
}

function peaksFromWavBytes(bytes: ArrayBuffer, bins: number): Float32Array | null {
  const view = new DataView(bytes);
  if (view.byteLength < 44) return null;
  const tag = (offset: number) =>
    String.fromCharCode(view.getUint8(offset), view.getUint8(offset + 1), view.getUint8(offset + 2), view.getUint8(offset + 3));
  if (tag(0) !== "RIFF" || tag(8) !== "WAVE") return null;
  let offset = 12;
  let channels = 1;
  let bits = 16;
  let dataOffset = -1;
  let dataBytes = 0;
  let fmt = 1;
  while (offset + 8 <= view.byteLength) {
    const id = tag(offset);
    const size = view.getUint32(offset + 4, true);
    const start = offset + 8;
    if (id === "fmt ") {
      fmt = view.getUint16(start, true);
      channels = view.getUint16(start + 2, true);
      bits = view.getUint16(start + 14, true);
    } else if (id === "data") {
      dataOffset = start;
      dataBytes = size;
      break;
    }
    offset = start + size + (size % 2);
  }
  if (dataOffset < 0) return null;
  const samples = new Float32Array(Math.floor(dataBytes / Math.max(1, bits / 8) / channels));
  let si = 0;
  if (fmt === 3 && bits === 32) {
    for (let i = dataOffset; i + 4 <= dataOffset + dataBytes && si < samples.length; i += 4 * channels) {
      samples[si] = view.getFloat32(i, true);
      si += 1;
    }
  } else if (bits === 16) {
    for (let i = dataOffset; i + 2 <= dataOffset + dataBytes && si < samples.length; i += 2 * channels) {
      samples[si] = view.getInt16(i, true) / 32768;
      si += 1;
    }
  } else {
    return null;
  }
  return peaksFromPcm(samples.subarray(0, si), bins);
}

async function peaksFromBlob(blob: Blob, bins: number): Promise<Float32Array> {
  const bytes = await blob.arrayBuffer();
  const fromWav = peaksFromWavBytes(bytes.slice(0), bins);
  if (fromWav) return fromWav;
  const ctx = new AudioContext();
  try {
    const buffer = await ctx.decodeAudioData(bytes.slice(0));
    return peaksFromPcm(buffer.getChannelData(0), bins);
  } finally {
    await ctx.close();
  }
}

function paintScope(
  canvas: HTMLCanvasElement,
  data: Float32Array,
  speed: number,
  progress: number,
  ghost: boolean
) {
  const dpr = window.devicePixelRatio || 1;
  const cssW = Math.max(1, canvas.clientWidth);
  const cssH = Math.max(1, canvas.clientHeight);
  canvas.width = Math.floor(cssW * dpr);
  canvas.height = Math.floor(cssH * dpr);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = "#0c0e12";
  ctx.fillRect(0, 0, cssW, cssH);
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 1;
  for (let x = 0; x < cssW; x += 24) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, cssH);
    ctx.stroke();
  }
  for (let y = 0; y < cssH; y += 28) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(cssW, y + 0.5);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(242,179,76,0.18)";
  ctx.beginPath();
  ctx.moveTo(0, cssH / 2);
  ctx.lineTo(cssW, cssH / 2);
  ctx.stroke();

  const visual = Math.min(MAX_SPEED, Math.max(MIN_SPEED, 1 / speed));
  const waveW = cssW * visual;
  const offset = (cssW - waveW) / 2;
  const mid = cssH / 2;
  const barW = waveW / data.length;
  const grad = ctx.createLinearGradient(offset, 0, offset + waveW, 0);
  grad.addColorStop(0, "#a8711c");
  grad.addColorStop(0.5, "#f2b34c");
  grad.addColorStop(1, "#ffd98a");
  ctx.globalAlpha = ghost ? 0.28 : 1;
  ctx.fillStyle = grad;
  for (let i = 0; i < data.length; i += 1) {
    const amp = Math.max(1.5, (data[i] ?? 0) * (cssH * 0.42));
    const x = offset + i * barW;
    ctx.fillRect(x, mid - amp, Math.max(1.2, barW - 0.35), amp * 2);
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = "rgba(242,179,76,0.85)";
  ctx.fillRect(offset + waveW * progress, 8, 1.5, cssH - 16);
  ctx.fillStyle = "#f2b34c";
  ctx.fillRect(offset - 4, 12, 4, cssH - 24);
  ctx.fillRect(offset + waveW, 12, 4, cssH - 24);
}

export function VoiceScope({
  online,
  voices,
  onSaved,
  onError
}: {
  online: boolean;
  voices: VoiceRecord[];
  onSaved: () => Promise<void> | void;
  onError: (message: string | null) => void;
}) {
  const plottable = voices.filter(canPlot);
  const kokoroPresets = voices.filter((v) => v.kind === "preset" && v.adapter === "kokoro");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const dragRef = useRef<"left" | "right" | null>(null);
  const [selectedId, setSelectedId] = useState(DEFAULT_TTS_VOICE);
  const [blendId, setBlendId] = useState("");
  const [speed, setSpeed] = useState(1);
  const [mixName, setMixName] = useState("");
  const [peaks, setPeaks] = useState<Float32Array>(() => placeholderPeaks(BINS));
  const [live, setLive] = useState(false);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const [chartError, setChartError] = useState<string | null>(null);

  const selected = plottable.find((v) => v.id === selectedId) ?? plottable.find((v) => v.id === DEFAULT_TTS_VOICE) ?? plottable[0];
  const synthVoice = selected ? kokoroFormula(selected, blendId) : DEFAULT_TTS_VOICE;
  const usesEngine = Boolean(
    selected && (selected.adapter === "kokoro" || selected.kind === "preset" || selected.kind === "mix") && selected.kind !== "clone"
  );

  useEffect(() => {
    if (!online || !selected) {
      setLive(false);
      setPeaks(placeholderPeaks(BINS));
      return;
    }
    let cancelled = false;
    const handle = window.setTimeout(() => {
      void (async () => {
        setLoading(true);
        setChartError(null);
        onError(null);
        try {
          let blob: Blob;
          if (selected.kind === "clone" && selected.has_audio) {
            const res = await fetch(voiceAudioUrl(selected.id));
            if (!res.ok) throw new Error("reference audio failed");
            blob = await res.blob();
          } else {
            blob = await synthesize({
              model: DEFAULT_TTS_MODEL,
              text: PREVIEW_LINE,
              voice: synthVoice,
              speed: 1
            });
          }
          if (cancelled) return;
          const nextPeaks = await peaksFromBlob(blob, BINS);
          if (cancelled) return;
          const url = URL.createObjectURL(blob);
          setObjectUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return url;
          });
          setPeaks(nextPeaks);
          setLive(true);
        } catch (e) {
          if (!cancelled) {
            setLive(false);
            setPeaks(placeholderPeaks(BINS));
            const message = e instanceof Error ? e.message : String(e);
            setChartError(message);
            onError(message);
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [online, selected?.id, selected?.kind, selected?.has_audio, synthVoice]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    paintScope(canvas, peaks, speed, progress, !live);
  }, [peaks, speed, progress, live]);

  useEffect(() => {
    draw();
    const canvas = canvasRef.current;
    const observer = canvas ? new ResizeObserver(() => draw()) : null;
    if (canvas && observer) observer.observe(canvas);
    window.addEventListener("resize", draw);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", draw);
    };
  }, [draw]);

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      if (!dragRef.current || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const t = (event.clientX - rect.left) / Math.max(1, rect.width);
      const next = MAX_SPEED - t * (MAX_SPEED - MIN_SPEED);
      setSpeed(Math.min(MAX_SPEED, Math.max(MIN_SPEED, next)));
    };
    const onUp = () => {
      dragRef.current = null;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  function onCanvasPointerDown(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const visual = Math.min(MAX_SPEED, Math.max(MIN_SPEED, 1 / speed));
    const waveW = rect.width * visual;
    const offset = (rect.width - waveW) / 2;
    if (Math.abs(x - offset) < 10) {
      dragRef.current = "left";
      return;
    }
    if (Math.abs(x - (offset + waveW)) < 10) {
      dragRef.current = "right";
      return;
    }
    const el = audioRef.current;
    if (!el || !el.duration) return;
    const inner = (x - offset) / waveW;
    el.currentTime = Math.min(1, Math.max(0, inner)) * el.duration;
  }

  async function togglePlay() {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
      return;
    }
    try {
      setChartError(null);
      let url = objectUrl;
      if (usesEngine && selected) {
        const blob = await synthesize({
          model: DEFAULT_TTS_MODEL,
          text: PREVIEW_LINE,
          voice: synthVoice,
          speed
        });
        if (url) URL.revokeObjectURL(url);
        url = URL.createObjectURL(blob);
        setObjectUrl(url);
        setPeaks(await peaksFromBlob(blob, BINS));
        setLive(true);
      }
      if (!url) return;
      el.src = url;
      el.playbackRate = usesEngine ? 1 : speed;
      await el.play();
      setPlaying(true);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setChartError(message);
      onError(message);
    }
  }

  async function onSaveMix() {
    if (!selected || selected.kind === "clone") return;
    const parts = synthVoice.split(",").map((p) => p.trim()).filter(Boolean);
    setSaving(true);
    onError(null);
    try {
      await mixVoice({
        name: mixName.trim() || `${selected.name} mix`,
        voices: parts,
        speed
      });
      setMixName("");
      await onSaved();
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  const status = !online
    ? "offline"
    : loading
      ? "rendering"
      : chartError
        ? "error"
        : live
          ? selected?.id
          : "idle";

  return (
    <Panel label="scope" action={<span className="font-mono text-[10px] text-ink-400">{status}</span>}>
      <audio
        ref={audioRef}
        onEnded={() => {
          setPlaying(false);
          setProgress(0);
        }}
        onTimeUpdate={(e) => {
          const el = e.currentTarget;
          if (el.duration) setProgress(el.currentTime / el.duration);
        }}
        className="hidden"
      />
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-[11px] text-ink-400">
          Voice
          <select
            className="vl-focus h-9 rounded-md border border-ink-700 bg-ink-950 px-2 text-[13px] text-ink-50"
            value={selected?.id ?? ""}
            disabled={!online || plottable.length === 0}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            {plottable.length === 0 ? (
              <option value="">no voices</option>
            ) : (
              plottable.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} · {v.id}
                </option>
              ))
            )}
          </select>
        </label>
        <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-[11px] text-ink-400">
          Blend
          <select
            className="vl-focus h-9 rounded-md border border-ink-700 bg-ink-950 px-2 text-[13px] text-ink-50"
            value={blendId}
            disabled={!online || !selected || selected.kind === "clone"}
            onChange={(e) => setBlendId(e.target.value)}
          >
            <option value="">none</option>
            {kokoroPresets
              .filter((v) => v.id !== selected?.id)
              .map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
          </select>
        </label>
        <label className="flex min-w-[12rem] flex-[1.2] flex-col gap-1 text-[11px] text-ink-400">
          Stretch {speed.toFixed(2)}×
          <input
            type="range"
            min={MIN_SPEED}
            max={MAX_SPEED}
            step={0.05}
            value={speed}
            disabled={!online}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="vl-focus h-9 accent-signal-500"
          />
        </label>
        <Button type="button" size="sm" disabled={!online || (loading && !objectUrl)} onClick={() => void togglePlay()}>
          {playing ? <Square className="size-3.5" /> : <Play className="size-3.5" />}
          {playing ? "Stop" : "Play"}
        </Button>
      </div>
      <div className="relative overflow-hidden rounded-lg border border-ink-700 bg-ink-950">
        <canvas
          ref={canvasRef}
          className="block h-[220px] w-full cursor-ew-resize"
          onPointerDown={onCanvasPointerDown}
        />
        {(!live || loading || chartError) && (
          <p className="pointer-events-none absolute bottom-3 left-3 right-3 font-mono text-[10px] leading-relaxed text-ink-300">
            {!online
              ? "engine offline"
              : chartError
                ? chartError
                : loading
                  ? "placeholder trace. waiting on Kokoro (first run downloads hexgrad/Kokoro-82M)."
                  : "waiting"}
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <MonoLabel>kokoro mix</MonoLabel>
        <input
          value={mixName}
          onChange={(e) => setMixName(e.target.value)}
          placeholder="Name this mix"
          disabled={!online || !selected || selected.kind === "clone"}
          className="vl-focus h-9 min-w-[12rem] flex-1 rounded-md border border-ink-700 bg-ink-950 px-3 text-[13px]"
        />
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={!online || saving || !selected || selected.kind === "clone"}
          onClick={() => void onSaveMix()}
        >
          Save as new voice
        </Button>
        <p className="w-full text-[11px] leading-relaxed text-ink-400">
          Drag the gold edges or the slider to stretch (slower) and squeeze (faster). Blend averages two Kokoro packs.
          Text-to-speaker design is not available until a Parler adapter is wired.
        </p>
      </div>
    </Panel>
  );
}

// TODO: draw a spectrogram layer behind the amplitude plot.
// TODO: persist in-progress mix state across tab switches.
