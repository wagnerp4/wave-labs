# voicelabs-engine

Local speech engine behind the voice-labs desktop app and website. Exposes an OpenAI-compatible HTTP API on loopback and loads adapters for Hugging Face speech models on demand.

```
uv sync --extra kokoro --extra whisper
uv run voicelabs-engine serve
uv run voicelabs-engine models
uv run voicelabs-engine hardware
```

The adapter catalog is read from `packages/registry/adapters.json` in the repository. When the wheel is built, the file is copied into the package under `voicelabs_engine/data/`. Override the location with `VOICELABS_REGISTRY=/path/to/adapters.json`.
