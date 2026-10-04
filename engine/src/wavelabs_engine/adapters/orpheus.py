from pathlib import Path

import numpy as np

from ..registry import AdapterSpec
from .audio_util import apply_speed, as_float32, require_pkg
from .base import Audio

VOICES = ["tara", "leah", "jess", "leo", "dan", "mia", "zac", "zoe"]


class OrpheusAdapter:
    def __init__(self, spec: AdapterSpec) -> None:
        self.spec = spec
        self._model = None

    def load(self, device: str) -> None:
        require_pkg("orpheus_tts", "orpheus")
        from orpheus_tts import OrpheusModel

        repo = self.spec.hf_repo or "canopylabs/orpheus-3b-0.1-ft"
        try:
            self._model = OrpheusModel(model_name=repo)
        except TypeError:
            self._model = OrpheusModel(model_path=repo)

    def voices(self) -> list[str]:
        return VOICES

    def synthesize(
        self,
        text: str,
        voice: str | None = None,
        speed: float = 1.0,
        reference: Path | None = None,
    ) -> Audio:
        if self._model is None:
            raise RuntimeError("adapter not loaded")
        chosen = voice if voice in VOICES else VOICES[0]
        stream = self._model.generate_speech(prompt=text, voice=chosen)
        chunks: list[np.ndarray] = []
        if hasattr(stream, "__iter__") and not isinstance(stream, (np.ndarray, bytes)):
            for chunk in stream:
                chunks.append(_chunk_to_float(chunk))
            samples = np.concatenate(chunks) if chunks else np.zeros(0, dtype=np.float32)
        else:
            samples = _chunk_to_float(stream)
        return apply_speed(Audio(samples=samples, sample_rate=24000), speed)


def _chunk_to_float(chunk) -> np.ndarray:
    if isinstance(chunk, bytes):
        pcm = np.frombuffer(chunk, dtype="<i2")
        return as_float32(pcm)
    return as_float32(chunk)


# TODO: require CUDA at load time when the installed extra cannot run on CPU.
# TODO: honour paralinguistic tags without stripping them from the script.
