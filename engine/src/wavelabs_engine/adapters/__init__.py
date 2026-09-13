from collections.abc import Callable

from ..registry import AdapterSpec, load_registry
from .base import AdapterNotImplemented, ASRAdapter, TTSAdapter
from .faster_whisper import FasterWhisperAdapter
from .kokoro import KokoroAdapter

Factory = Callable[[AdapterSpec], TTSAdapter | ASRAdapter]

FACTORIES: dict[str, Factory] = {
    "kokoro": KokoroAdapter,
    "faster-whisper": FasterWhisperAdapter,
}

# TODO: add factories for the remaining catalog entries as they are implemented.
# Each new adapter should also flip its status in packages/registry/adapters.json.


class AdapterPool:
    def __init__(self) -> None:
        self._loaded: dict[str, TTSAdapter | ASRAdapter] = {}

    @property
    def loaded_ids(self) -> list[str]:
        return sorted(self._loaded)

    def get(self, adapter_id: str, device: str) -> TTSAdapter | ASRAdapter:
        if adapter_id in self._loaded:
            return self._loaded[adapter_id]
        spec = load_registry().get(adapter_id)
        if spec is None:
            raise KeyError(f"unknown adapter: {adapter_id}")
        factory = FACTORIES.get(adapter_id)
        if factory is None:
            msg = f"adapter '{adapter_id}' is in the catalog but not implemented"
            raise AdapterNotImplemented(msg)
        adapter = factory(spec)
        adapter.load(device)
        self._loaded[adapter_id] = adapter
        return adapter

    def unload(self, adapter_id: str) -> bool:
        return self._loaded.pop(adapter_id, None) is not None


pool = AdapterPool()
