import type { Hardware } from "@wavelabs/registry";

export const ENGINE_URL = import.meta.env.VITE_ENGINE_URL ?? (import.meta.env.DEV ? "" : "http://127.0.0.1:8471");
export const DEFAULT_TTS_MODEL = "kokoro";
export const DEFAULT_TTS_VOICE = "af_heart";

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

async function readError(res: Response, prefix: string): Promise<never> {
  const raw = await res.text();
  let detail = `HTTP ${res.status}`;
  if (raw) {
    try {
      const body = JSON.parse(raw) as { detail?: unknown };
      if (typeof body.detail === "string") {
        detail = body.detail;
      } else if (body.detail !== undefined) {
        detail = JSON.stringify(body.detail);
      } else {
        detail = raw;
      }
    } catch {
      detail = raw;
    }
  }
  throw new Error(`${prefix}: ${detail}`);
}

export type EngineModel = {
  id: string;
  task: string;
  status: string;
  implemented?: boolean;
  hf_repo?: string | null;
  downloaded?: boolean;
  loaded?: boolean;
};

export async function listEngineModels(): Promise<EngineModel[]> {
  const res = await fetch(`${ENGINE_URL}/v1/models`);
  if (!res.ok) await readError(res, "models failed");
  const body = (await res.json()) as { data: EngineModel[] };
  return body.data;
}

export async function downloadModel(adapterId: string): Promise<EngineModel> {
  const res = await fetch(`${ENGINE_URL}/v1/models/${adapterId}/download`, { method: "POST" });
  if (!res.ok) await readError(res, "download failed");
  return (await res.json()) as EngineModel;
}

export function isImplemented(id: string, models: EngineModel[]): boolean {
  const row = models.find((m) => m.id === id);
  if (row && typeof row.implemented === "boolean") {
    return row.implemented;
  }
  return id === "kokoro" || id === "faster-whisper" || id === "parler-tts";
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
      voice: input.voice ?? "af_heart",
      speed: input.speed ?? 1,
      response_format: "wav"
    })
  });
  if (!res.ok) await readError(res, "speech failed");
  return res.blob();
}

export async function transcribe(input: { model: string; file: File; language?: string }) {
  const form = new FormData();
  form.set("model", input.model);
  form.set("file", input.file);
  if (input.language) form.set("language", input.language);
  form.set("response_format", "verbose_json");
  const res = await fetch(`${ENGINE_URL}/v1/audio/transcriptions`, { method: "POST", body: form });
  if (!res.ok) await readError(res, "transcription failed");
  return (await res.json()) as {
    text: string;
    language?: string;
    segments?: { start: number; end: number; text: string }[];
  };
}

export type VoiceRecord = {
  id: string;
  kind: "preset" | "clone" | "design" | "mix";
  name: string;
  adapter: string;
  description: string | null;
  tags: string[];
  has_audio: boolean;
  created_at: string | null;
  formula?: string;
  speed?: number;
};

export async function listVoices(kind?: VoiceRecord["kind"]): Promise<VoiceRecord[]> {
  const query = kind ? `?kind=${kind}` : "";
  const res = await fetch(`${ENGINE_URL}/v1/voices${query}`);
  if (!res.ok) await readError(res, "voices failed");
  const body = (await res.json()) as { data: VoiceRecord[] };
  return body.data;
}

export async function cloneVoice(input: { name: string; file: File }): Promise<VoiceRecord> {
  const form = new FormData();
  form.set("name", input.name);
  form.set("file", input.file);
  const res = await fetch(`${ENGINE_URL}/v1/voices/clone`, { method: "POST", body: form });
  if (!res.ok) await readError(res, "clone failed");
  return (await res.json()) as VoiceRecord;
}

export async function mixVoice(input: {
  name: string;
  voices: string[];
  speed?: number;
}): Promise<VoiceRecord> {
  const res = await fetch(`${ENGINE_URL}/v1/voices/mix`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: input.name, voices: input.voices, speed: input.speed ?? 1 })
  });
  if (!res.ok) await readError(res, "mix failed");
  return (await res.json()) as VoiceRecord;
}

export async function designVoice(input: {
  name: string;
  description: string;
  script?: string;
}): Promise<VoiceRecord> {
  const res = await fetch(`${ENGINE_URL}/v1/voices/design`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: input.name,
      description: input.description,
      script: input.script
    })
  });
  if (!res.ok) await readError(res, "design failed");
  return (await res.json()) as VoiceRecord;
}

export async function deleteVoice(id: string): Promise<void> {
  const res = await fetch(`${ENGINE_URL}/v1/voices/${id}`, { method: "DELETE" });
  if (!res.ok) await readError(res, "delete voice failed");
}

export function voiceAudioUrl(id: string): string {
  return `${ENGINE_URL}/v1/voices/${id}/audio`;
}

export type BookRole = { voice: string; adapter: string };

export type BookChapter = {
  index: number;
  title: string;
  text: string;
  role: string;
  chars: number;
  has_audio: boolean;
};

export type BookRecord = {
  id: string;
  name: string;
  source?: string;
  status: string;
  roles: Record<string, BookRole>;
  chapters: BookChapter[];
  created_at: string | null;
};

export async function listBooks(): Promise<BookRecord[]> {
  const res = await fetch(`${ENGINE_URL}/v1/books`);
  if (!res.ok) await readError(res, "books failed");
  const body = (await res.json()) as { data: BookRecord[] };
  return body.data;
}

export async function importBook(input: { name: string; file: File }): Promise<BookRecord> {
  const form = new FormData();
  form.set("name", input.name);
  form.set("file", input.file);
  const res = await fetch(`${ENGINE_URL}/v1/books`, { method: "POST", body: form });
  if (!res.ok) await readError(res, "import book failed");
  return (await res.json()) as BookRecord;
}

export async function getBook(id: string): Promise<BookRecord> {
  const res = await fetch(`${ENGINE_URL}/v1/books/${id}`);
  if (!res.ok) await readError(res, "book failed");
  return (await res.json()) as BookRecord;
}

export async function castBook(id: string, roles: Record<string, BookRole>): Promise<BookRecord> {
  const res = await fetch(`${ENGINE_URL}/v1/books/${id}/cast`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ roles })
  });
  if (!res.ok) await readError(res, "cast failed");
  return (await res.json()) as BookRecord;
}

export async function renderBook(id: string, chapter?: number): Promise<BookRecord> {
  const query = chapter === undefined ? "" : `?chapter=${chapter}`;
  const res = await fetch(`${ENGINE_URL}/v1/books/${id}/render${query}`, { method: "POST" });
  if (!res.ok) await readError(res, "render failed");
  return (await res.json()) as BookRecord;
}

export async function deleteBook(id: string): Promise<void> {
  const res = await fetch(`${ENGINE_URL}/v1/books/${id}`, { method: "DELETE" });
  if (!res.ok) await readError(res, "delete book failed");
}

export function chapterAudioUrl(bookId: string, index: number): string {
  return `${ENGINE_URL}/v1/books/${bookId}/chapters/${index}/audio`;
}

// TODO: add SSE/WebSocket streaming for partial ASR results and TTS chunks.
// TODO: stream snapshot_download progress into ModelInstall.
