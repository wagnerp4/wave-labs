from pathlib import Path

from ..registry import AdapterSpec
from .audio_util import apply_speed, require_pkg, tensor_to_audio
from .base import Audio


class ChatterboxAdapter:
    def __init__(self, spec: AdapterSpec) -> None:
        self.spec = spec
        self._model = None

    def load(self, device: str) -> None:
        require_pkg("chatterbox", "chatterbox")
        from chatterbox.tts import ChatterboxTTS

        target = device if device in {"cuda", "cpu", "mps"} else "cpu"
        self._model = ChatterboxTTS.from_pretrained(device=target)

    def voices(self) -> list[str]:
        return ["default"]

    def synthesize(
        self,
        text: str,
        voice: str | None = None,
        speed: float = 1.0,
        reference: Path | None = None,
    ) -> Audio:
        if self._model is None:
            raise RuntimeError("adapter not loaded")
        kwargs: dict = {}
        if reference is not None and reference.is_file():
            kwargs["audio_prompt_path"] = str(reference)
        wav = self._model.generate(text, **kwargs)
        audio = tensor_to_audio(wav, getattr(self._model, "sr", 24000))
        return apply_speed(audio, speed)


# TODO: expose exaggeration and cfg_weight once the speech request schema has style knobs.
# TODO: optional ChatterboxMultilingualTTS path when language is not English.
