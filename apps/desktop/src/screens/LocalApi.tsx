import { Badge, MonoLabel } from "@voicelabs/ui";
import { ENGINE_URL, type EngineState } from "../lib/engineClient.ts";
import { Panel } from "../components/Panel.tsx";

const ENDPOINTS = [
  { method: "GET", path: "/health", body: "Engine version, detected hardware, loaded adapters." },
  { method: "GET", path: "/v1/models", body: "Catalog with install state per adapter." },
  { method: "POST", path: "/v1/audio/speech", body: "OpenAI-compatible TTS. Returns wav, mp3 or pcm." },
  { method: "POST", path: "/v1/audio/transcriptions", body: "OpenAI-compatible ASR. multipart/form-data." },
  { method: "POST", path: "/v1/models/{id}/download", body: "Pull weights from Hugging Face into the local cache." }
];

const SNIPPET = `from openai import OpenAI

client = OpenAI(base_url="${ENGINE_URL}/v1", api_key="local")

speech = client.audio.speech.create(
    model="kokoro",
    voice="af_heart",
    input="Hello from voice-labs.",
)
speech.write_to_file("hello.wav")`;

export function LocalApi({ engine }: { engine: EngineState }) {
  return (
    <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-2">
      <Panel
        label="server"
        action={<Badge tone={engine.kind === "online" ? "phosphor" : "neutral"}>{engine.kind}</Badge>}
      >
        <p className="font-mono text-[14px] text-ink-50">{ENGINE_URL}</p>
        <p className="text-[12px] leading-relaxed text-ink-400">
          Bound to loopback only. No authentication by default. Anything on this machine that speaks the OpenAI audio
          API can use it.
        </p>
        <ul className="mt-2 flex flex-col divide-y divide-ink-800">
          {ENDPOINTS.map((e) => (
            <li key={e.path} className="grid grid-cols-[3.5rem_1fr] gap-3 py-2.5">
              <span className="font-mono text-[11px] text-signal-400">{e.method}</span>
              <div>
                <p className="font-mono text-[12px] text-ink-100">{e.path}</p>
                <p className="text-[12px] text-ink-400">{e.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel label="quickstart">
        <MonoLabel>python</MonoLabel>
        <pre className="overflow-x-auto rounded-lg bg-ink-950 p-4 font-mono text-[12px] leading-relaxed text-ink-200">
          <code>{SNIPPET}</code>
        </pre>
      </Panel>
    </div>
  );
}
