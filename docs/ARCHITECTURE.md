# Architecture

voice-labs is a monorepo with three deliverables that share one model catalog and one design system.

```
voice-labs/
├─ apps/
│  ├─ web/        Astro 5 static site: landing, models catalog, docs, download
│  └─ desktop/    Tauri 2 shell + Vite/React frontend, talks to the engine over HTTP
├─ packages/
│  ├─ registry/   adapters.json + zod schema + query helpers (single source of truth)
│  └─ ui/         design tokens (Tailwind v4 @theme) + React components
├─ engine/        Python: FastAPI local API, adapter protocol, Hugging Face downloads
└─ .github/       ci, desktop release matrix, GitHub Pages deploy
```

## Data flow

```
                     packages/registry/adapters.json
                       │              │              │
             ┌─────────┘              │              └──────────┐
             ▼                        ▼                         ▼
     apps/web (build time)   apps/desktop (bundled)    engine (runtime, pydantic)
     static catalog page     Models / Studio screens    /v1/models, adapter pool
                                       │                         ▲
                                       │  fetch 127.0.0.1:8471   │
                                       └─────────────────────────┘
```

The desktop frontend never imports Python. It polls `GET /health` and calls the OpenAI-compatible endpoints. That keeps the UI usable against a remote engine (Docker, another machine) with a single URL change.

## Registry

`adapters.json` describes each adapter: id, task (`tts`, `asr`, `vc`, `enhance`), connection, implementation status, runtime family, supported hardware, Hugging Face repo, license, size, languages and features. `pnpm registry:validate` enforces the schema and unique ids in CI. The engine loads the same file through pydantic, so a catalog change is one commit that updates the site, the app and the API together.

Status semantics:

- `planned`: listed, no engine factory yet. The UI shows it but disables generation.
- `experimental`: factory exists, not yet exercised across hardware.
- `available`: factory exists and has been run on cpu and at least one accelerator.

## Engine

- `config.py`: pydantic-settings, `VOICELABS_*` env vars, `~/.voicelabs` data dir.
- `registry.py`: loads `adapters.json` from `VOICELABS_REGISTRY`, the packaged copy, or the repo path.
- `hardware.py`: detects cuda, rocm, mps or cpu. Torch is optional.
- `hub.py`: `snapshot_download` into the app cache.
- `adapters/base.py`: `TTSAdapter` and `ASRAdapter` protocols plus `Audio`, `Transcript` dataclasses.
- `adapters/__init__.py`: `FACTORIES` map and a lazy `AdapterPool`.
- `api.py`: `/health`, `/v1/models`, `/v1/audio/speech`, `/v1/audio/transcriptions`.

Adding an adapter: implement the protocol in `adapters/<id>.py`, register it in `FACTORIES`, add its optional dependency group in `pyproject.toml`, and flip its status in `adapters.json`.

## Desktop

Tauri 2 gives native installers for `.deb`, `.rpm`, `.AppImage`, `.msi`, `.exe` and `.dmg` from one Rust shell. The Rust side is deliberately thin: one `app_info` command today, with TODOs for spawning the engine as a sidecar and streaming its logs. The frontend is plain React with local state. No router: screens are switched by a `Screen` union in `App.tsx`.

## Web

Astro renders static HTML and hydrates only the interactive islands (`ModelCatalog`, `InstallCommand`). The site reads the registry at build time, so counts and the catalog page are always in sync with the app.

## Theme

Tokens live in `packages/ui/src/theme.css` as Tailwind v4 `@theme` variables:

- `ink-*`: graphite neutrals from `#07080a` to a warm off-white `#f1efe9`.
- `signal-*`: amber accent for primary actions, TTS badges and selection.
- `phosphor-*`: green for live and online states.
- `danger-*`, `info-*`: errors and ASR badges.
- Fonts: Inter Variable for UI, JetBrains Mono for ids, labels and metadata.

Both apps import this file and add `@source` for the shared component directory so Tailwind sees the classes used inside `packages/ui`.

## Open items

- Sidecar bundling of the Python engine per platform.
- Voice listing, model download progress and log streaming endpoints.
- Persisted settings in the desktop app.
- Diarization task for the dubbing workflow.
- License field verification against each model card before the first release.
