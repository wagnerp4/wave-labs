import { Download, ExternalLink } from "lucide-react";
import { useState } from "react";
import { Badge, Button, HardwareBadges, ModelCatalog, MonoLabel } from "@wavelabs/ui";
import { hfUrl, type Adapter, type Hardware } from "@wavelabs/registry";
import { Panel } from "../components/Panel.tsx";

export function Models({ detected }: { detected: Hardware | null }) {
  const [selected, setSelected] = useState<Adapter | null>(null);
  const url = selected ? hfUrl(selected) : null;
  const compatible = selected && detected ? selected.hardware.includes(detected) : null;

  return (
    <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-[1fr_340px]">
      <ModelCatalog
        detected={detected}
        onSelect={setSelected}
        selectedId={selected?.id}
        dense
        columns="grid-cols-1 md:grid-cols-2"
      />

      <div className="lg:sticky lg:top-0 lg:self-start">
        <Panel label="details">
          {!selected ? (
            <p className="text-[13px] text-ink-400">Select an adapter to see hardware fit, license and install options.</p>
          ) : (
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="text-lg font-medium">{selected.name}</h2>
                <MonoLabel>{selected.id}</MonoLabel>
              </div>
              <p className="text-[13px] leading-relaxed text-ink-300">{selected.description}</p>

              <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-[12px]">
                <dt className="text-ink-400">Runtime</dt>
                <dd className="font-mono">{selected.runtime}</dd>
                <dt className="text-ink-400">Parameters</dt>
                <dd className="font-mono">{selected.params ?? "—"}</dd>
                <dt className="text-ink-400">License</dt>
                <dd className="font-mono">{selected.license}</dd>
                <dt className="text-ink-400">Languages</dt>
                <dd className="font-mono">
                  {selected.languages === "multilingual" ? "multilingual" : selected.languages.join(", ")}
                </dd>
                <dt className="text-ink-400">Status</dt>
                <dd>
                  <Badge tone={selected.status === "planned" ? "neutral" : "signal"}>{selected.status}</Badge>
                </dd>
              </dl>

              <div>
                <MonoLabel>hardware</MonoLabel>
                <HardwareBadges supported={selected.hardware} detected={detected} className="mt-1.5" />
                <p className="mt-1.5 text-[12px] text-ink-400">
                  {detected === null
                    ? "Start the engine to check compatibility with this machine."
                    : compatible
                      ? `Runs on the detected ${detected.toUpperCase()} device.`
                      : `Does not list ${detected.toUpperCase()}. Expect CPU fallback or failure.`}
                </p>
              </div>

              {selected.features.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selected.features.map((f) => (
                    <span key={f} className="rounded bg-ink-800 px-1.5 py-0.5 font-mono text-[10px] text-ink-300">
                      {f}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex flex-col gap-2 border-t border-ink-800 pt-4">
                <Button disabled={selected.status === "planned" || !selected.hf_repo} title="Download is not wired to the engine yet">
                  <Download className="size-4" /> Install weights
                </Button>
                {url && (
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="vl-focus inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-ink-600 text-[13px] text-ink-200 hover:border-ink-400"
                  >
                    Model card <ExternalLink className="size-3.5" />
                  </a>
                )}
              </div>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
