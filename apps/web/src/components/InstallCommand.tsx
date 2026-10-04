import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Chip, cn } from "@wavelabs/ui";

type Os = "unix" | "windows";

const CLONE = "git clone https://github.com/wagnerp4/wave-labs && cd wave-labs/engine";
const SERVE = "uv sync && uv run wavelabs-engine serve";

const COMMANDS: Record<Os, string[]> = {
  unix: ["curl -LsSf https://astral.sh/uv/install.sh | sh", CLONE, SERVE],
  windows: ['powershell -c "irm https://astral.sh/uv/install.ps1 | iex"', CLONE, SERVE]
};

const LABELS: Record<Os, string> = {
  unix: "Linux · macOS",
  windows: "Windows"
};

export function InstallCommand({ className }: { className?: string }) {
  const [os, setOs] = useState<Os>("unix");
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(COMMANDS[os].join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(COMMANDS) as Os[]).map((k) => (
          <Chip key={k} active={os === k} onClick={() => setOs(k)}>
            {LABELS[k]}
          </Chip>
        ))}
      </div>
      <div className="flex items-start gap-2 rounded-lg border border-ink-700 bg-ink-900 pl-4 pr-2 font-mono text-[13px]">
        <div className="flex-1 overflow-x-auto py-3">
          {COMMANDS[os].map((line) => (
            <div key={line} className="whitespace-nowrap leading-relaxed">
              <span className="select-none text-signal-500">$ </span>
              <code className="text-ink-100">{line}</code>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={copy}
          className="vl-focus mt-2 inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-xs text-ink-300 hover:bg-ink-800 hover:text-ink-50"
          aria-label="Copy engine setup commands"
        >
          {copied ? <Check className="size-3.5 text-phosphor-400" /> : <Copy className="size-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <p className="font-mono text-[11px] text-ink-400">
        Starts the engine on 127.0.0.1:8471. First run downloads torch and model weights.
      </p>
    </div>
  );
}
