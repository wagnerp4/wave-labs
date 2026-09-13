# Implementation map

Source: `docs/TLT.md`. License: AGPL-3.0. Competitors in scope: ElevenLabs, VoiceStudio.

## Application surfaces

| Surface | Status |
| --- | --- |
| Website (Astro) | shipped, GitHub Pages |
| GitHub repo | shipped |
| Desktop executable (Tauri: Linux AppImage/deb/rpm, Windows msi/nsis, macOS dmg) | in progress |
| Local engine API | shipped (HF adapters only) |
| MCP server | not started |
| Cloud storage | not started |

## Library

- [x] Hugging Face backend (`library/backends/huggingface.py`)
- [ ] Ollama backend (`library/backends/ollama.py` stub)
- [x] Backend router
- [ ] Adapter marketplace (install/remove adapters from the catalog)
- [ ] MCP surface for tools
- [ ] text / video / x -> audio pipelines
- [ ] audio -> text / video / x pipelines
- [ ] Trainer
- [ ] Storage layer (projects, voices, outputs, remote sync)

## Voices

- [x] Local library UI (preset cards)
- [ ] Store + import + cloud
- [ ] Create, combine, capture, play

## Audiobooks

- [x] Desktop screen shell
- [ ] Manuscript import (txt, md, epub)
- [ ] Casting board
- [ ] Chapter render + M4B export
