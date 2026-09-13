from pathlib import Path

from ..registry import AdapterSpec
from .base import Segment, Transcript


class FasterWhisperAdapter:
    def __init__(self, spec: AdapterSpec, size: str = "large-v3") -> None:
        self.spec = spec
        self.size = size
        self._model = None

    def load(self, device: str) -> None:
        try:
            from faster_whisper import WhisperModel
        except ImportError as exc:
            msg = "faster-whisper is not installed. Run: uv sync --extra whisper"
            raise RuntimeError(msg) from exc
        target = "cuda" if device == "cuda" else "cpu"
        compute = "float16" if target == "cuda" else "int8"
        self._model = WhisperModel(self.size, device=target, compute_type=compute)

    def transcribe(self, audio: Path, language: str | None = None) -> Transcript:
        if self._model is None:
            raise RuntimeError("adapter not loaded")
        segments, info = self._model.transcribe(str(audio), language=language, vad_filter=True)
        out: list[Segment] = []
        for s in segments:
            out.append(Segment(start=float(s.start), end=float(s.end), text=s.text.strip()))
        return Transcript(text=" ".join(s.text for s in out), language=info.language, segments=out)


# TODO: expose word_timestamps and beam_size as request options.
# TODO: honour settings.models_dir via download_root so weights live in the app cache.
