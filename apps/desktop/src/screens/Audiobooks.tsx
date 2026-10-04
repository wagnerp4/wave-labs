import { BookOpen, FileText, Play, Square, Trash2, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Badge, Button, Card, MonoLabel } from "@wavelabs/ui";
import {
  castBook,
  chapterAudioUrl,
  deleteBook,
  importBook,
  listBooks,
  listVoices,
  renderBook,
  type BookRecord,
  type EngineState,
  type VoiceRecord
} from "../lib/engineClient.ts";
import { EmptyState, Panel } from "../components/Panel.tsx";

export function Audiobooks({ engine }: { engine: EngineState }) {
  const online = engine.kind === "online";
  const [books, setBooks] = useState<BookRecord[]>([]);
  const [voices, setVoices] = useState<VoiceRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [castOpen, setCastOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const refresh = useCallback(async () => {
    if (!online) {
      setBooks([]);
      setVoices([]);
      return;
    }
    const [nextBooks, nextVoices] = await Promise.all([listBooks(), listVoices("preset")]);
    setBooks(nextBooks);
    setVoices(nextVoices);
  }, [online]);

  useEffect(() => {
    void refresh().catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [refresh]);

  const selected = books.find((b) => b.id === selectedId) ?? books[0] ?? null;

  useEffect(() => {
    if (selected && selectedId !== selected.id) setSelectedId(selected.id);
  }, [selected, selectedId]);

  async function onImport() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const book = await importBook({ name: name.trim() || file.name.replace(/\.[^.]+$/, ""), file });
      setFile(null);
      setName("");
      if (fileRef.current) fileRef.current.value = "";
      await refresh();
      setSelectedId(book.id);
      setCastOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function onCast(role: string, voice: string) {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      const adapter = voices.find((v) => v.id === voice)?.adapter ?? "kokoro";
      const next = await castBook(selected.id, { [role]: { voice, adapter } });
      setBooks((rows) => rows.map((b) => (b.id === next.id ? next : b)));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function onRender(chapter?: number) {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      const next = await renderBook(selected.id, chapter);
      setBooks((rows) => rows.map((b) => (b.id === next.id ? next : b)));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string) {
    setBusy(true);
    setError(null);
    try {
      await deleteBook(id);
      if (selectedId === id) setSelectedId(null);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function playChapter(index: number) {
    const el = audioRef.current;
    if (!el || !selected) return;
    const key = `${selected.id}:${index}`;
    if (playing === key) {
      el.pause();
      setPlaying(null);
      return;
    }
    el.src = chapterAudioUrl(selected.id, index);
    void el.play();
    setPlaying(key);
  }

  const done = selected ? selected.chapters.filter((c) => c.has_audio).length : 0;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <audio ref={audioRef} onEnded={() => setPlaying(null)} className="hidden" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel label="script">
          <div className="flex items-start gap-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-ink-800 text-signal-500">
              <FileText className="size-5" />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <div>
                <p className="text-[14px] font-medium">Import a manuscript</p>
                <p className="mt-1 text-[12px] leading-relaxed text-ink-400">
                  .txt, .md or .epub. Headings or Chapter N lines become jobs. Stored under ~/.wavelabs/books.
                </p>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".txt,.md,.markdown,.epub,text/plain,text/markdown,application/epub+zip"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setFile(f);
                  if (f && !name) setName(f.name.replace(/\.[^.]+$/, ""));
                }}
              />
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Book title"
                className="vl-focus h-9 rounded-md border border-ink-700 bg-ink-950 px-3 text-[13px]"
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  type="button"
                  disabled={!online || busy}
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload className="size-3.5" />
                  {file ? file.name : "Add file"}
                </Button>
                <Button size="sm" type="button" disabled={!online || busy || !file} onClick={() => void onImport()}>
                  Import
                </Button>
              </div>
            </div>
          </div>
        </Panel>
        <Panel label="cast">
          <div className="flex items-start gap-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-ink-800 text-signal-500">
              <BookOpen className="size-5" />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <div>
                <p className="text-[14px] font-medium">Assign voices to roles</p>
                <p className="mt-1 text-[12px] leading-relaxed text-ink-400">
                  Defaults to Kokoro Heart as narrator. ALL CAPS dialogue tags become extra roles.
                </p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                type="button"
                disabled={!online || !selected}
                onClick={() => setCastOpen((v) => !v)}
              >
                {castOpen ? "Hide casting" : "Open casting"}
              </Button>
              {castOpen && selected && (
                <ul className="flex flex-col gap-2">
                  {Object.entries(selected.roles).map(([role, cast]) => (
                    <li key={role} className="flex items-center justify-between gap-3">
                      <span className="truncate text-[13px] capitalize">{role}</span>
                      <select
                        className="vl-focus h-8 min-w-0 flex-1 rounded-md border border-ink-700 bg-ink-950 px-2 text-[12px]"
                        value={cast.voice}
                        disabled={busy || voices.length === 0}
                        onChange={(e) => void onCast(role, e.target.value)}
                      >
                        {voices.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name}
                          </option>
                        ))}
                      </select>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Panel>
      </div>

      {error && <p className="font-mono text-[12px] text-danger-400">{error}</p>}
      {!online && <p className="text-[12px] text-ink-400">Engine offline. Start serve to import and render books.</p>}

      <Panel label="projects" action={<span className="font-mono text-[10px] text-ink-400">{books.length}</span>}>
        {books.length === 0 ? (
          <EmptyState
            title="No audiobooks yet"
            body="Import a manuscript to split chapters, assign Kokoro voices, then render WAV per chapter."
          />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {books.map((book) => (
              <li key={book.id}>
                <Card
                  interactive
                  className={`flex flex-col gap-2 p-4 ${selected?.id === book.id ? "border-signal-500/40" : ""}`}
                  onClick={() => {
                    setSelectedId(book.id);
                    setCastOpen(true);
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[14px] font-medium">{book.name}</p>
                    <Badge tone={book.status === "ready" ? "phosphor" : "neutral"}>{book.status}</Badge>
                  </div>
                  <MonoLabel>
                    {book.chapters.length} chapters · {book.chapters.filter((c) => c.has_audio).length} rendered
                  </MonoLabel>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {selected && (
        <Panel
          label="chapters"
          action={
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-ink-400">
                {done}/{selected.chapters.length}
              </span>
              <Button size="sm" disabled={!online || busy} onClick={() => void onRender()}>
                {busy ? "Rendering" : "Render book"}
              </Button>
              <button
                type="button"
                onClick={() => void onDelete(selected.id)}
                className="vl-focus flex size-8 items-center justify-center rounded-md text-ink-400 hover:bg-ink-800 hover:text-danger-400"
                aria-label="Delete book"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          }
        >
          <ol className="flex flex-col divide-y divide-ink-800">
            {selected.chapters.map((chapter) => {
              const key = `${selected.id}:${chapter.index}`;
              return (
                <li key={chapter.index} className="flex items-start gap-3 py-3">
                  <button
                    type="button"
                    disabled={!chapter.has_audio}
                    onClick={() => playChapter(chapter.index)}
                    className="vl-focus mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-ink-800 text-signal-500 hover:bg-ink-700 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label={playing === key ? "Stop" : "Play"}
                  >
                    {playing === key ? <Square className="size-3.5" /> : <Play className="size-3.5" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium">{chapter.title}</p>
                    <p className="font-mono text-[10px] text-ink-400">
                      {chapter.chars} chars · {chapter.role}
                      {chapter.has_audio ? " · wav" : ""}
                    </p>
                    <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-ink-400">{chapter.text}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={!online || busy}
                    onClick={() => void onRender(chapter.index)}
                  >
                    Render
                  </Button>
                </li>
              );
            })}
          </ol>
        </Panel>
      )}
    </div>
  );
}
