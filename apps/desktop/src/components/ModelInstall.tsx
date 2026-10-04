import { Download } from "lucide-react";
import { useState } from "react";
import { Button } from "@wavelabs/ui";
import { downloadModel, type EngineModel } from "../lib/engineClient.ts";

export function ModelInstall({
  adapterId,
  online,
  models,
  onRefresh,
  hfRepo
}: {
  adapterId: string;
  online: boolean;
  models: EngineModel[];
  onRefresh: () => void;
  hfRepo?: string | null;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const row = models.find((m) => m.id === adapterId);
  const downloaded = Boolean(row?.downloaded);
  const repo = hfRepo || row?.hf_repo || null;
  const card = repo ? `https://huggingface.co/${repo}` : null;

  async function run() {
    setBusy(true);
    setError(null);
    try {
      await downloadModel(adapterId);
      onRefresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (!online && !downloaded) {
    return (
      <div className="flex flex-col gap-1 text-[11px] leading-relaxed text-ink-400">
        <p>Engine offline. Serve must be up, then reload this page.</p>
        {card ? (
          <a href={card} target="_blank" rel="noreferrer" className="font-mono text-ink-300 hover:text-signal-400">
            {repo}
          </a>
        ) : (
          <p>No Hugging Face repo on this adapter.</p>
        )}
        <p className="font-mono text-ink-500">~/.wavelabs/models</p>
      </div>
    );
  }

  if (!repo && !downloaded) {
    return <p className="text-[11px] text-ink-400">No Hugging Face repo to pull.</p>;
  }

  return (
    <div className="flex flex-col gap-1">
      <Button
        type="button"
        size="sm"
        variant={downloaded ? "secondary" : "primary"}
        disabled={!online || busy || downloaded}
        onClick={() => void run()}
      >
        <Download className="size-3.5" />
        {busy ? "Downloading" : downloaded ? "Weights on disk" : "Install weights"}
      </Button>
      {error && <p className="font-mono text-[11px] text-danger-400">{error}</p>}
    </div>
  );
}

// TODO: show byte progress once the engine streams snapshot_download hooks.
