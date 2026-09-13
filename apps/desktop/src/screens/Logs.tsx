import { Button } from "@wavelabs/ui";
import { EmptyState, Panel } from "../components/Panel.tsx";

export function Logs() {
  return (
    <div className="mx-auto max-w-6xl">
      <Panel
        label="engine log"
        action={
          <Button size="sm" variant="ghost" disabled title="Log streaming is not wired yet">
            Clear
          </Button>
        }
      >
        <EmptyState
          title="No log output"
          body="When the app spawns the engine sidecar, stdout and stderr stream here with timestamps and level filters."
        />
      </Panel>
    </div>
  );
}
