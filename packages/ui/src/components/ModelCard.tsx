import { ExternalLink } from "lucide-react";
import { TASK_BADGES, hfUrl, type Adapter, type Hardware } from "@wavelabs/registry";
import { cn } from "../cn.ts";
import { Badge } from "./Badge.tsx";
import { Card } from "./Card.tsx";
import { HardwareBadges } from "./HardwareBadges.tsx";

const statusTone = {
  available: "phosphor",
  experimental: "signal",
  planned: "neutral"
} as const;

export function ModelCard({
  adapter,
  detected,
  onSelect,
  selected = false,
  dense = false
}: {
  adapter: Adapter;
  detected?: Hardware | null;
  onSelect?: (adapter: Adapter) => void;
  selected?: boolean;
  dense?: boolean;
}) {
  const url = hfUrl(adapter);
  const clickable = Boolean(onSelect);

  return (
    <Card
      interactive={clickable}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={onSelect ? () => onSelect(adapter) : undefined}
      onKeyDown={
        onSelect
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(adapter);
              }
            }
          : undefined
      }
      className={cn(
        "vl-focus flex w-full min-w-0 flex-col gap-3 p-4",
        selected && "border-signal-500/70 vl-glow",
        dense && "gap-2 p-3"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-medium text-ink-50">{adapter.name}</h3>
          <p className="mt-0.5 truncate font-mono text-[11px] text-ink-400">{adapter.id}</p>
        </div>
        <Badge tone={adapter.task === "tts" ? "signal" : adapter.task === "asr" ? "info" : "neutral"}>
          {TASK_BADGES[adapter.task]}
        </Badge>
      </div>

      {!dense && <p className="text-[13px] leading-relaxed text-ink-300">{adapter.description}</p>}

      <div className="mt-auto flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2 text-[11px]">
          <span className="text-ink-400">
            Connection: <span className="text-ink-100">{adapter.connection}</span>
          </span>
          <Badge tone={statusTone[adapter.status]}>{adapter.status}</Badge>
        </div>
        <div className="flex items-center justify-between gap-2">
          <HardwareBadges supported={adapter.hardware} detected={detected ?? null} className="shrink-0" />
          <span className="min-w-0 truncate font-mono text-[10px] text-ink-400" title={adapter.license}>
            {adapter.params ?? "—"} · {adapter.license}
          </span>
        </div>
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 truncate font-mono text-[11px] text-ink-300 hover:text-signal-400"
          >
            <span className="truncate">hf.co/{adapter.hf_repo}</span>
            <ExternalLink className="size-3 shrink-0" aria-hidden="true" />
          </a>
        )}
      </div>
    </Card>
  );
}
