import { BookOpen, FileText, Upload } from "lucide-react";
import { Button } from "@wavelabs/ui";
import { EmptyState, Panel } from "../components/Panel.tsx";

export function Audiobooks() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel label="script">
          <div className="flex items-start gap-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-ink-800 text-signal-500">
              <FileText className="size-5" />
            </span>
            <div className="flex-1">
              <p className="text-[14px] font-medium">Import a manuscript</p>
              <p className="mt-1 text-[12px] leading-relaxed text-ink-400">
                Plain text, markdown or EPUB. Chapters become a queue of studio jobs.
              </p>
              <Button size="sm" variant="secondary" className="mt-3" disabled title="Manuscript import is not wired yet">
                <Upload className="size-3.5" /> Add file
              </Button>
            </div>
          </div>
        </Panel>
        <Panel label="cast">
          <div className="flex items-start gap-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-ink-800 text-signal-500">
              <BookOpen className="size-5" />
            </span>
            <div className="flex-1">
              <p className="text-[14px] font-medium">Assign voices to roles</p>
              <p className="mt-1 text-[12px] leading-relaxed text-ink-400">
                Narrator plus named speakers. Each role maps to a local voice or a cloned reference.
              </p>
              <Button size="sm" variant="secondary" className="mt-3" disabled title="Casting board is not wired yet">
                Open casting
              </Button>
            </div>
          </div>
        </Panel>
      </div>

      <Panel label="projects">
        <EmptyState
          title="No audiobooks yet"
          body="Rendered books will list here with chapter progress, assigned voices and export targets (WAV, M4B)."
        />
      </Panel>
    </div>
  );
}
