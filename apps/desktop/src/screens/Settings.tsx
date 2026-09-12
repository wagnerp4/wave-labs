import type { ReactNode } from "react";
import { ENGINE_URL } from "../lib/engineClient.ts";
import { Panel } from "../components/Panel.tsx";

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="grid items-center gap-3 py-3 sm:grid-cols-[220px_1fr]">
      <div>
        <p className="text-[13px] text-ink-50">{label}</p>
        {hint && <p className="text-[12px] text-ink-400">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

const inputCls =
  "vl-focus h-9 w-full rounded-md border border-ink-700 bg-ink-950 px-3 font-mono text-[13px] text-ink-100 disabled:opacity-60";

export function Settings() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <Panel label="engine">
        <div className="divide-y divide-ink-800">
          <Row label="Local API URL" hint="Where the app looks for the engine.">
            <input className={inputCls} defaultValue={ENGINE_URL} disabled />
          </Row>
          <Row label="Spawn engine on launch" hint="Start the bundled sidecar automatically.">
            <input type="checkbox" className="size-4 accent-signal-500" defaultChecked disabled />
          </Row>
          <Row label="Preferred device" hint="Override automatic hardware detection.">
            <select className={inputCls} defaultValue="auto" disabled>
              <option value="auto">auto</option>
              <option value="cuda">cuda</option>
              <option value="rocm">rocm</option>
              <option value="mps">mps</option>
              <option value="cpu">cpu</option>
            </select>
          </Row>
        </div>
      </Panel>

      <Panel label="storage">
        <div className="divide-y divide-ink-800">
          <Row label="Model cache" hint="Hugging Face weights. Shared with other HF tooling if you point it at HF_HOME.">
            <input className={inputCls} defaultValue="~/.voicelabs/models" disabled />
          </Row>
          <Row label="Outputs" hint="Rendered audio and transcripts.">
            <input className={inputCls} defaultValue="~/.voicelabs/outputs" disabled />
          </Row>
        </div>
      </Panel>

      <p className="font-mono text-[11px] text-ink-400">
        Settings persistence is not implemented yet. Values shown are the engine defaults.
      </p>
    </div>
  );
}
