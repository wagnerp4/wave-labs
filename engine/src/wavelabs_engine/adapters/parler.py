from pathlib import Path

import torch

from ..hub import download as hub_download
from ..registry import AdapterSpec
from .audio_util import apply_speed, require_pkg, tensor_to_audio
from .base import Audio

DEFAULT_DESCRIPTION = (
    "A clear English speaker with a neutral tone, moderate pace, recorded in a quiet studio."
)

REPO = "parler-tts/parler-tts-mini-v1"


class ParlerTTSAdapter:
    def __init__(self, spec: AdapterSpec) -> None:
        self.spec = spec
        self._model = None
        self._tokenizer = None
        self._device = "cpu"

    def load(self, device: str) -> None:
        require_pkg("parler_tts")
        from parler_tts import ParlerTTSForConditionalGeneration
        from transformers import AutoTokenizer

        repo = self.spec.hf_repo or REPO
        local = hub_download(repo)
        self._device = device if device in {"cuda", "mps"} else "cpu"
        self._model = ParlerTTSForConditionalGeneration.from_pretrained(str(local)).to(self._device)
        self._tokenizer = AutoTokenizer.from_pretrained(str(local))
        self._model.eval()

    def voices(self) -> list[str]:
        return ["description"]

    def synthesize(
        self,
        text: str,
        voice: str | None = None,
        speed: float = 1.0,
        reference: Path | None = None,
    ) -> Audio:
        if self._model is None or self._tokenizer is None:
            raise RuntimeError("adapter not loaded")
        description = (voice or "").strip() or DEFAULT_DESCRIPTION
        desc_ids = self._tokenizer(description, return_tensors="pt").input_ids.to(self._device)
        prompt_ids = self._tokenizer(text, return_tensors="pt").input_ids.to(self._device)
        with torch.inference_mode():
            generated = self._model.generate(input_ids=desc_ids, prompt_input_ids=prompt_ids)
        rate = int(getattr(self._model.config, "sampling_rate", 44100))
        audio = tensor_to_audio(generated, rate)
        return apply_speed(audio, speed)


# TODO: expose attention_mask / max_new_tokens once long descriptions truncate.
# TODO: stream tokens if Parler grows a streaming generate path.
