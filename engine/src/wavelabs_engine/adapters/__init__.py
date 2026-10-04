import threading
from collections.abc import Callable

from ..registry import AdapterSpec, load_registry
from .base import AdapterNotImplemented, ASRAdapter, TTSAdapter
from .chatterbox import ChatterboxAdapter
from .cosyvoice2 import CosyVoice2Adapter
from .dia import DiaAdapter
from .f5_tts import F5TTSAdapter
from .faster_whisper import FasterWhisperAdapter
from .fish_speech import FishSpeechAdapter
from .kokoro import KokoroAdapter
from .orpheus import OrpheusAdapter
from .parler import ParlerTTSAdapter
from .xtts_v2 import XttsV2Adapter

Factory = Callable[[AdapterSpec], TTSAdapter | ASRAdapter]

FACTORIES: dict[str, Factory] = {
    "kokoro": KokoroAdapter,
    "parler-tts": ParlerTTSAdapter,
    "chatterbox": ChatterboxAdapter,
    "xtts-v2": XttsV2Adapter,
    "f5-tts": F5TTSAdapter,
    "orpheus": OrpheusAdapter,
    "cosyvoice2": CosyVoice2Adapter,
    "dia": DiaAdapter,
    "fish-speech": FishSpeechAdapter,
    "faster-whisper": FasterWhisperAdapter,
}

# TODO: add factories for the remaining catalog entries (bark, piper, …).
# TODO: restore optional extras for chatterbox / f5-tts / orpheus / dia / fish once those wheels resolve on PyPI.
# Each new adapter should also flip its status in packages/registry/adapters.json.


class AdapterPool:
    def __init__(self) -> None:
        self._loaded: dict[str, TTSAdapter | ASRAdapter] = {}
        self._lock = threading.Lock()

    @property
    def loaded_ids(self) -> list[str]:
        return sorted(self._loaded)

    def get(self, adapter_id: str, device: str) -> TTSAdapter | ASRAdapter:
        with self._lock:
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
IMPLEMENTED = frozenset(FACTORIES)
