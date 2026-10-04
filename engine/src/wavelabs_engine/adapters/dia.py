from pathlib import Path

from ..registry import AdapterSpec
from .audio_util import apply_speed, as_float32, require_pkg
from .base import Audio


class DiaAdapter:
    def __init__(self, spec: AdapterSpec) -> None:
        self.spec = spec
        self._model = None

    def load(self, device: str) -> None:
        require_pkg("dia", "dia")
        from dia.model import Dia

        repo = self.spec.hf_repo or "nari-labs/Dia-1.6B"
        try:
            self._model = Dia.from_pretrained(repo, device=device)
        except TypeError:
            self._model = Dia.from_pretrained(repo)

    def voices(self) -> list[str]:
        return ["s1"]

    def synthesize(
        self,
        text: str,
        voice: str | None = None,
        speed: float = 1.0,
        reference: Path | None = None,
    ) -> Audio:
        if self._model is None:
            raise RuntimeError("adapter not loaded")
        script = text if text.lstrip().startswith("[S") else f"[S1] {text}"
        out = self._model.generate(script)
        if hasattr(self._model, "save_audio"):
            import tempfile

            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
                path = Path(tmp.name)
            try:
                self._model.save_audio(str(path), out)
                import soundfile as sf

                samples, rate = sf.read(path)
            finally:
                path.unlink(missing_ok=True)
            audio = Audio(samples=as_float32(samples), sample_rate=int(rate))
        else:
            audio = Audio(samples=as_float32(out), sample_rate=44100)
        return apply_speed(audio, speed)


# TODO: multi-speaker scripts should keep user [S1]/[S2] tags and optional audio prompts.
# TODO: pin Dia-1.6B-0626 vs Dia-1.6B once the extra is version-locked.
