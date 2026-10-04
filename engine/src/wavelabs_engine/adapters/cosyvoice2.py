from pathlib import Path

from ..hub import download
from ..registry import AdapterSpec
from .audio_util import apply_speed, need_reference, require_pkg, tensor_to_audio
from .base import Audio


class CosyVoice2Adapter:
    def __init__(self, spec: AdapterSpec) -> None:
        self.spec = spec
        self._model = None

    def load(self, device: str) -> None:
        require_pkg("cosyvoice", "cosyvoice")
        from cosyvoice.cli.cosyvoice import CosyVoice2

        repo = self.spec.hf_repo or "FunAudioLLM/CosyVoice2-0.5B"
        root = download(repo)
        fp16 = device == "cuda"
        try:
            self._model = CosyVoice2(str(root), load_jit=False, load_trt=False, fp16=fp16)
        except TypeError:
            self._model = CosyVoice2(str(root))

    def voices(self) -> list[str]:
        names = getattr(self._model, "list_available_spks", None)
        if callable(names):
            return [str(s) for s in names()]
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
        rate = int(getattr(self._model, "sample_rate", 24000))
        if reference is not None and reference.is_file():
            wav = self._zero_shot(text, reference)
        else:
            wav = self._sft(text, voice)
        return apply_speed(tensor_to_audio(wav, rate), speed)

    def _zero_shot(self, text: str, reference: Path):
        from cosyvoice.utils.file_utils import load_wav

        prompt = load_wav(str(need_reference(self.spec.id, reference)), 16000)
        chunks = []
        for item in self._model.inference_zero_shot(text, "", prompt, stream=False):
            chunks.append(item["tts_speech"])
        if not chunks:
            raise RuntimeError("CosyVoice 2 returned no audio")
        return _concat_torch(chunks)

    def _sft(self, text: str, voice: str | None):
        speakers = self.voices()
        speaker = voice if voice in speakers else (speakers[0] if speakers else None)
        if speaker is None:
            raise RuntimeError(
                "CosyVoice 2 needs a cloned reference clip or an SFT speaker after load"
            )
        chunks = []
        for item in self._model.inference_sft(text, speaker, stream=False):
            chunks.append(item["tts_speech"])
        if not chunks:
            raise RuntimeError("CosyVoice 2 returned no audio")
        return _concat_torch(chunks)


def _concat_torch(chunks):
    import torch

    if len(chunks) == 1:
        return chunks[0]
    return torch.cat(chunks, dim=-1)


# TODO: pass prompt text from Voices once clone metadata stores a transcript.
# TODO: CosyVoice extra currently assumes the FunAudioLLM tree is importable as `cosyvoice`.
