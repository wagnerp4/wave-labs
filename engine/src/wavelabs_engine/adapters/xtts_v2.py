from pathlib import Path

from ..registry import AdapterSpec
from .audio_util import apply_speed, as_float32, require_pkg
from .base import Audio


class XttsV2Adapter:
    def __init__(self, spec: AdapterSpec) -> None:
        self.spec = spec
        self._tts = None
        self._speakers: list[str] = []

    def load(self, device: str) -> None:
        require_pkg("TTS", "xtts")
        from TTS.api import TTS

        self._tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2")
        if device == "cuda" and hasattr(self._tts, "to"):
            self._tts.to("cuda")
        speakers = getattr(self._tts, "speakers", None) or []
        self._speakers = [str(s) for s in speakers]

    def voices(self) -> list[str]:
        return ["default", *self._speakers]

    def synthesize(
        self,
        text: str,
        voice: str | None = None,
        speed: float = 1.0,
        reference: Path | None = None,
    ) -> Audio:
        if self._tts is None:
            raise RuntimeError("adapter not loaded")
        language = "en"
        kwargs: dict = {"text": text, "language": language}
        if reference is not None and reference.is_file():
            kwargs["speaker_wav"] = str(reference)
        elif voice and voice not in {None, "default"} and voice in self._speakers:
            kwargs["speaker"] = voice
        elif self._speakers:
            kwargs["speaker"] = self._speakers[0]
        else:
            raise RuntimeError(
                "XTTS v2 needs a cloned reference clip or a built-in speaker after load"
            )
        wav = self._tts.tts(**kwargs)
        audio = Audio(samples=as_float32(wav), sample_rate=24000)
        return apply_speed(audio, speed)


# TODO: map request language instead of hard-coding English.
# TODO: honour spec.hf_repo via snapshot_download instead of the Coqui model zoo id.
