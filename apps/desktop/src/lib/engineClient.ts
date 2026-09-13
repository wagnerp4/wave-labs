import type { Hardware } from "@wavelabs/registry";

export const ENGINE_URL = import.meta.env.VITE_ENGINE_URL ?? "http://127.0.0.1:8471";

export type EngineHealth = {
  status: "ok";
  version: string;
  hardware: { detected: Hardware; devices: string[] };
  loaded: string[];
};

export type EngineState =
  | { kind: "offline" }
  | { kind: "online"; health: EngineHealth }
  | { kind: "error"; message: string };

export async function fetchHealth(signal?: AbortSignal): Promise<EngineState> {
  try {
    const res = await fetch(`${ENGINE_URL}/health`, { signal });
    if (!res.ok) return { kind: "error", message: `HTTP ${res.status}` };
    const health = (await res.json()) as EngineHealth;
    return { kind: "online", health };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") return { kind: "offline" };
    return { kind: "offline" };
  }
}

export async function synthesize(input: {
  model: string;
  text: string;
  voice?: string;
  speed?: number;
}): Promise<Blob> {
  const res = await fetch(`${ENGINE_URL}/v1/audio/speech`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: input.model,
      input: input.text,
      voice: input.voice ?? "default",
      speed: input.speed ?? 1,
      response_format: "wav"
    })
  });
  if (!res.ok) throw new Error(`speech failed: HTTP ${res.status}`);
  return res.blob();
}

export async function transcribe(input: { model: string; file: File; language?: string }) {
  const form = new FormData();
  form.set("model", input.model);
  form.set("file", input.file);
  if (input.language) form.set("language", input.language);
  form.set("response_format", "verbose_json");
  const res = await fetch(`${ENGINE_URL}/v1/audio/transcriptions`, { method: "POST", body: form });
  if (!res.ok) throw new Error(`transcription failed: HTTP ${res.status}`);
  return (await res.json()) as {
    text: string;
    language?: string;
    segments?: { start: number; end: number; text: string }[];
  };
}

// TODO: add SSE/WebSocket streaming for partial ASR results and TTS chunks.
// TODO: add model download progress endpoint (GET /v1/models/{id}/download) and hook into the Models screen.
