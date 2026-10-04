import raw from "../adapters.json";
import { RegistrySchema, type Adapter, type Registry, type Task } from "./schema.ts";

export * from "./schema.ts";

export const registry: Registry = RegistrySchema.parse(raw);

export const adapters: Adapter[] = registry.adapters;

export const TASK_LABELS: Record<Task, string> = {
  tts: "Speech generation",
  asr: "Transcription",
  vc: "Voice conversion",
  enhance: "Enhancement"
};

export const TASK_BADGES: Record<Task, string> = {
  tts: "TTS",
  asr: "ASR",
  vc: "VC",
  enhance: "ENH"
};

export function adaptersByTask(task: Task | "all"): Adapter[] {
  if (task === "all") return adapters;
  return adapters.filter((a) => a.task === task);
}

export function findAdapter(id: string): Adapter | undefined {
  return adapters.find((a) => a.id === id);
}

export function searchAdapters(query: string, task: Task | "all" = "all"): Adapter[] {
  const q = query.trim().toLowerCase();
  const pool = adaptersByTask(task);
  if (!q) return pool;
  return pool.filter((a) => {
    const haystack = [a.id, a.name, a.hf_repo ?? "", a.runtime, a.description, ...a.features]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function hfUrl(adapter: Adapter): string | null {
  return adapter.hf_repo ? `https://huggingface.co/${adapter.hf_repo}` : null;
}

export function adapterUrl(adapter: Adapter): string | null {
  return hfUrl(adapter) ?? adapter.homepage;
}

export function adapterLinkLabel(adapter: Adapter): string {
  if (adapter.hf_repo) {
    const name = adapter.hf_repo.split("/").pop();
    return name || adapter.hf_repo;
  }
  if (adapter.homepage) {
    try {
      return new URL(adapter.homepage).hostname.replace(/^www\./, "");
    } catch {
      return "docs";
    }
  }
  return "docs";
}
