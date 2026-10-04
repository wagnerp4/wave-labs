from pathlib import Path

import numpy as np

from .base import Audio


def require_pkg(module: str, extra: str | None = None) -> None:
    try:
        __import__(module)
    except ImportError as exc:
        hint = f"uv sync --extra {extra}" if extra else "uv sync"
        msg = f"{module} import failed ({exc}). Run: {hint}"
        raise RuntimeError(msg) from exc


def as_float32(samples) -> np.ndarray:
    arr = np.asarray(samples)
    if arr.ndim > 1:
        arr = np.mean(arr, axis=-1)
    if arr.dtype == np.int16:
        arr = arr.astype(np.float32) / 32767.0
    elif arr.dtype == np.int32:
        arr = arr.astype(np.float32) / 2147483647.0
    else:
        arr = arr.astype(np.float32)
    return np.clip(arr, -1.0, 1.0)


def tensor_to_audio(wav, sample_rate: int) -> Audio:
    if hasattr(wav, "detach"):
        wav = wav.detach().cpu().numpy()
    arr = np.asarray(wav)
    if arr.ndim == 2:
        arr = arr[0] if arr.shape[0] <= 2 else arr[:, 0]
    return Audio(samples=as_float32(arr), sample_rate=int(sample_rate))


def apply_speed(audio: Audio, speed: float) -> Audio:
    if speed == 1.0 or audio.samples.size == 0:
        return audio
    new_len = max(1, int(audio.samples.size / speed))
    x_old = np.linspace(0.0, 1.0, audio.samples.size, endpoint=False)
    x_new = np.linspace(0.0, 1.0, new_len, endpoint=False)
    samples = np.interp(x_new, x_old, audio.samples).astype(np.float32)
    return Audio(samples=samples, sample_rate=audio.sample_rate)


def need_reference(adapter_id: str, reference: Path | None) -> Path:
    if reference is None or not reference.is_file():
        msg = (
            f"adapter '{adapter_id}' needs a cloned voice with reference audio. "
            "Add a clip in Voices, then select it here."
        )
        raise RuntimeError(msg)
    return reference
