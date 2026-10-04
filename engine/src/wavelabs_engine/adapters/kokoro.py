from pathlib import Path

import numpy as np

from ..registry import AdapterSpec
from .base import Audio

VOICES = ["af_heart", "af_bella", "am_michael", "am_adam", "bf_emma", "bm_george"]


def resolve_voice(voice: str | None) -> str:
    raw = (voice or VOICES[0]).replace("+", ",")
    parts = [part.strip() for part in raw.split(",") if part.strip()]
    if not parts:
        return VOICES[0]
    names: list[str] = []
    for part in parts:
        name = part.split("*", 1)[0].strip()
        if name not in VOICES:
            known = ", ".join(VOICES)
            raise ValueError(f"unknown Kokoro voice '{name}'. Use one of: {known}")
        names.append(name)
    return ",".join(names)


class KokoroAdapter:
    def __init__(self, spec: AdapterSpec) -> None:
        self.spec = spec
        self._pipeline = None

    def load(self, device: str) -> None:
        try:
            from kokoro import KPipeline
        except ImportError as exc:
            raise RuntimeError("kokoro is not installed. Run: uv sync") from exc
        try:
            self._pipeline = KPipeline(lang_code="a", repo_id="hexgrad/Kokoro-82M", device=device)
        except TypeError:
            self._pipeline = KPipeline(lang_code="a", device=device)

    def voices(self) -> list[str]:
        return VOICES

    def synthesize(
        self,
        text: str,
        voice: str | None = None,
        speed: float = 1.0,
        reference: Path | None = None,
    ) -> Audio:
        if self._pipeline is None:
            raise RuntimeError("adapter not loaded")
        voice = resolve_voice(voice)
        chunks = [audio for _, _, audio in self._pipeline(text, voice=voice, speed=speed)]
        if not chunks:
            return Audio(samples=np.zeros(0, dtype=np.float32), sample_rate=24000)
        samples = np.concatenate([np.asarray(c, dtype=np.float32) for c in chunks])
        return Audio(samples=samples, sample_rate=24000)


# TODO: map lang_code from the requested voice prefix (a=en-us, b=en-gb, j=ja, z=zh, ...).
# TODO: stream chunks instead of concatenating once the API supports chunked responses.
