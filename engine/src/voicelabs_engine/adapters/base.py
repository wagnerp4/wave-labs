from dataclasses import dataclass, field
from pathlib import Path
from typing import Protocol, runtime_checkable

import numpy as np

from ..registry import AdapterSpec


@dataclass
class Audio:
    samples: np.ndarray
    sample_rate: int


@dataclass
class Segment:
    start: float
    end: float
    text: str


@dataclass
class Transcript:
    text: str
    language: str | None = None
    segments: list[Segment] = field(default_factory=list)


@runtime_checkable
class TTSAdapter(Protocol):
    spec: AdapterSpec

    def load(self, device: str) -> None: ...

    def voices(self) -> list[str]: ...

    def synthesize(self, text: str, voice: str | None = None, speed: float = 1.0) -> Audio: ...


@runtime_checkable
class ASRAdapter(Protocol):
    spec: AdapterSpec

    def load(self, device: str) -> None: ...

    def transcribe(self, audio: Path, language: str | None = None) -> Transcript: ...


class AdapterNotImplemented(RuntimeError):
    pass
