import { ExternalLink } from "lucide-react";
import { Badge, cn } from "@wavelabs/ui";
import { adapterLinkLabel, adapterUrl, type Adapter } from "@wavelabs/registry";

export function EnginePick({
  adapter,
  active,
  implemented,
  onSelect
}: {
  adapter: Adapter;
  active: boolean;
  implemented: boolean;
  onSelect: () => void;
}) {
  const url = adapterUrl(adapter);
  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-md",
        active ? "bg-ink-800 text-ink-50" : "text-ink-300 hover:bg-ink-850"
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        className="vl-focus min-w-0 flex-1 truncate rounded-md px-2.5 py-2 text-left text-[13px]"
      >
        {adapter.name}
      </button>
      {implemented ? (
        <Badge tone="signal" className="mr-2 shrink-0">
          {adapter.status}
        </Badge>
      ) : url ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          title={url}
          className="vl-focus mr-2 inline-flex max-w-[9.5rem] shrink-0 items-center gap-1 truncate font-mono text-[10px] text-ink-400 hover:text-signal-400"
        >
          <span className="truncate">{adapterLinkLabel(adapter)}</span>
          <ExternalLink className="size-3 shrink-0" />
        </a>
      ) : (
        <span className="mr-2 font-mono text-[10px] text-ink-500">no card</span>
      )}
    </div>
  );
}
