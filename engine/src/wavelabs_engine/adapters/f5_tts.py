from pathlib import Path

from ..registry import AdapterSpec
from .audio_util import apply_speed, as_float32, need_reference, require_pkg
from .base import Audio


class F5TTSAdapter:
    def __init__(self, spec: AdapterSpec) -> None:
        self.spec = spec
        self._model = None
        self._device = "cpu"

    def load(self, device: str) -> None:
        require_pkg("f5_tts", "f5tts")
        from f5_tts.api import F5TTS

        self._device = device if device in {"cuda", "cpu", "mps"} else "cpu"
        try:
            self._model = F5TTS(device=self._device)
        except TypeError:
            self._model = F5TTS()

    def voices(self) -> list[str]:
        return []

    def synthesize(
        self,
        text: str,
        voice: str | None = None,
        speed: float = 1.0,
        reference: Path | None = None,
    ) -> Audio:
        if self._model is None:
            raise RuntimeError("adapter not loaded")
        ref = need_reference(self.spec.id, reference)
        try:
            result = self._model.infer(
                ref_file=str(ref),
                ref_text="",
                gen_text=text,
                speed=speed,
            )
        except TypeError:
            result = self._model.infer(
                ref_audio=str(ref),
                ref_text="",
                gen_text=text,
            )
        wav, rate = _unpack_f5(result)
        return Audio(samples=as_float32(wav), sample_rate=int(rate))


def _unpack_f5(result):
    if isinstance(result, tuple):
        wav = result[0]
        rate = result[1] if len(result) > 1 else 24000
        return wav, rate
    return result, 24000


# TODO: pass the reference transcript when Voices stores one next to reference.wav.
# TODO: pin model="F5TTS_v1_Base" once the extra is version-locked.
