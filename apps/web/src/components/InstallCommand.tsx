import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Chip, cn } from "@voicelabs/ui";

type Os = "linux" | "macos" | "windows" | "docker";

const COMMANDS: Record<Os, string> = {
  linux: "curl -fsSL https://voice-labs.sh/install | sh",
  macos: "curl -fsSL https://voice-labs.sh/install | sh",
  windows: "irm https://voice-labs.sh/install.ps1 | iex",
  docker: "docker run -p 8471:8471 ghcr.io/wagnerp4/voice-labs-engine"
};

const LABELS: Record<Os, string> = {
  linux: "Linux",
  macos: "macOS",
  windows: "Windows",
  docker: "Docker"
};

export function InstallCommand({ className }: { className?: string }) {
  const [os, setOs] = useState<Os>("linux");
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(COMMANDS[os]);
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
      <div className="flex items-center gap-2 rounded-lg border border-ink-700 bg-ink-900 pl-4 pr-2 font-mono text-[13px]">
        <span className="select-none text-signal-500">$</span>
        <code className="flex-1 overflow-x-auto whitespace-nowrap py-3 text-ink-100">
          {COMMANDS[os]}
        </code>
        <button
          type="button"
          onClick={copy}
          className="vl-focus inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs text-ink-300 hover:bg-ink-800 hover:text-ink-50"
          aria-label="Copy install command"
        >
          {copied ? <Check className="size-3.5 text-phosphor-400" /> : <Copy className="size-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <p className="font-mono text-[11px] text-ink-400">
        Installer endpoints are placeholders until the first release is cut.
      </p>
    </div>
  );
}
