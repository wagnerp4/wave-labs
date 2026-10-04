from pathlib import Path

from ..registry import AdapterSpec
from .audio_util import apply_speed, as_float32, need_reference, require_pkg
from .base import Audio


class FishSpeechAdapter:
    def __init__(self, spec: AdapterSpec) -> None:
        self.spec = spec
        self._infer = None

    def load(self, device: str) -> None:
        require_pkg("fish_speech", "fish")
        self._infer = _bind_infer(self.spec.hf_repo)
        _ = device

    def voices(self) -> list[str]:
        return []

    def synthesize(
        self,
        text: str,
        voice: str | None = None,
        speed: float = 1.0,
        reference: Path | None = None,
    ) -> Audio:
        if self._infer is None:
            raise RuntimeError("adapter not loaded")
        ref = need_reference(self.spec.id, reference)
        wav, rate = self._infer(text, ref)
        return apply_speed(Audio(samples=as_float32(wav), sample_rate=int(rate)), speed)


def _bind_infer(repo: str | None):
    try:
        from fish_speech.inference import TTS

        model = TTS() if repo is None else TTS(model=repo)
        return lambda text, ref: _from_tts(model, text, ref)
    except (ImportError, TypeError, AttributeError):
        pass
    try:
        from fish_speech.inference_engine import TTSInferenceEngine

        engine = TTSInferenceEngine()
        return lambda text, ref: _from_engine(engine, text, ref)
    except (ImportError, TypeError, AttributeError):
        pass
    msg = (
        "fish-speech is installed but no supported inference API was found. "
        "Expected fish_speech.inference.TTS or fish_speech.inference_engine.TTSInferenceEngine."
    )
    raise RuntimeError(msg)


def _from_tts(model, text: str, ref: Path):
    result = model.infer(text, reference_audio=str(ref))
    if isinstance(result, tuple):
        return result[0], result[1] if len(result) > 1 else 44100
    return result, 44100


def _from_engine(engine, text: str, ref: Path):
    result = engine.infer(text=text, reference_audio=str(ref))
    if isinstance(result, tuple):
        return result[0], result[1] if len(result) > 1 else 44100
    audio = getattr(result, "audio", result)
    rate = getattr(result, "sample_rate", 44100)
    return audio, rate


# TODO: lock the fish-speech extra to one inference entry point after the first hardware run.
# TODO: unused `device` should be passed into TTS / TTSInferenceEngine once those APIs accept it.
