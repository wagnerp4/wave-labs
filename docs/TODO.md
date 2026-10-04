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
- [x] Local store + clip import + text design (`~/.wavelabs/voices`, `GET/POST /v1/voices`)
- [ ] Cloud / store marketplace
- [x] Clone reference path wired into Chatterbox / XTTS / F5-TTS / CosyVoice / Fish Speech
- [ ] Persist per-voice embeddings next to `voice.json` (still prompt-from-wav)
- [x] Parler-TTS design synthesis (`POST /v1/voices/design`, Design screen)
- [x] Play presets (kokoro) and reference clips

## Audiobooks

- [x] Desktop screen shell
- [x] Manuscript import (txt, md, epub) into `~/.wavelabs/books`
- [x] Casting board (Kokoro presets / detected roles)
- [x] Chapter WAV render via Kokoro
- [ ] Concatenated book WAV / M4B export
