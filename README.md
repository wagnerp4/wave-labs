# wave-labs

Local-first speech lab. Text to speech, transcription, voice cloning and voice design on top of Hugging Face models. Website, GitHub, desktop executables for Linux / macOS / Windows, and an OpenAI-compatible local API. AGPL-3.0.

Status: structure, stack and UI scaffold. Two adapters have engine implementations (`kokoro`, `faster-whisper`), the rest of the catalog is listed as planned.

Live site: [wagnerp4.github.io/wave-labs](https://wagnerp4.github.io/wave-labs/)

## Layout

| Path | What | Stack |
| --- | --- | --- |
| `apps/web` | Website: landing, models catalog, docs, download | Astro 5, React islands, Tailwind v4 |
| `apps/desktop` | Desktop app | Tauri 2, Vite, React 19, Tailwind v4 |
| `packages/registry` | Model catalog (`adapters.json`) + schema | TypeScript, zod |
| `packages/ui` | Design tokens and shared components | React, Tailwind v4 |
| `engine` | Local speech engine and HTTP API | Python 3.12, FastAPI, huggingface_hub, uv |

See `docs/ARCHITECTURE.md` for how the pieces fit.

## Prerequisites

- Node 20+ and pnpm 9 (`corepack enable` or `npm i -g pnpm`)
- uv (Python is managed by uv, 3.12 pinned in `engine/.python-version`)
- For native desktop builds: Rust stable plus the Tauri 2 system dependencies for your OS. On Debian/Ubuntu: `libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf pkg-config libssl-dev`

## Develop

PowerShell:

```powershell
pnpm install
pnpm registry:validate
pnpm dev:web            # http://localhost:4321
pnpm dev:desktop        # frontend only, http://localhost:1420
pnpm dev:desktop:tauri  # native window, needs Rust

pnpm engine:sync
pnpm engine:serve       # http://127.0.0.1:8471
pnpm build:desktop:tauri  # native installers (needs Rust + OS WebView deps)
```

bash:

```bash
pnpm install && pnpm registry:validate
pnpm dev:web
pnpm engine:sync && pnpm engine:serve
```

Optional engine extras:

```powershell
uv sync --directory engine --extra kokoro --extra whisper
```

## Engine API

```
GET  /health
GET  /v1/models
POST /v1/audio/speech            {"model":"kokoro","input":"...","voice":"af_heart"}
POST /v1/audio/transcriptions    multipart: model, file, language?, response_format?
```

Any OpenAI SDK works with `base_url="http://127.0.0.1:8471/v1"` and a dummy key.

## Build

```powershell
pnpm build                 # web + desktop frontend
pnpm build:desktop:tauri   # native installers into apps/desktop/src-tauri/target
```

Releases are produced by `.github/workflows/release-desktop.yml` on `v*` tags for Linux (`.deb`, `.rpm`, `.AppImage`), Windows (`.msi`, `.exe`) and macOS (`.dmg`, arm64 and x86_64).

## Notes

- The repo lives on an NTFS mount when opened from WSL. `node_modules` installed from WSL contain Linux binaries. Reinstall from PowerShell if you switch sides.
- Catalog licenses are copied from model cards at the time of writing and need verification before a release.
