# wavelabs-engine

Local speech engine behind the wave-labs desktop app and website. Exposes an OpenAI-compatible HTTP API on loopback and loads adapters for Hugging Face speech models on demand.

```
uv sync --extra kokoro --extra whisper
uv run wavelabs-engine serve
uv run wavelabs-engine models
uv run wavelabs-engine hardware
```

The adapter catalog is read from `packages/registry/adapters.json` in the repository. When the wheel is built, the file is copied into the package under `wavelabs_engine/data/`. Override the location with `WAVELABS_REGISTRY=/path/to/adapters.json`.
