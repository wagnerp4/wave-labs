import io
import json
import shutil
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Literal

import numpy as np
import soundfile as sf

from .adapters.kokoro import VOICES as KOKORO_VOICE_IDS
from .adapters.orpheus import VOICES as ORPHEUS_VOICE_IDS
from .config import settings

Kind = Literal["preset", "clone", "design", "mix"]

PRESET_META: dict[str, dict[str, Any]] = {
    "af_heart": {"name": "Heart", "tags": ["en-us", "female", "warm"]},
    "am_michael": {"name": "Michael", "tags": ["en-us", "male", "neutral"]},
    "am_adam": {"name": "Adam", "tags": ["en-us", "male", "clear"]},
    "af_bella": {"name": "Bella", "tags": ["en-us", "female", "soft"]},
    "bf_emma": {"name": "Emma", "tags": ["en-gb", "female", "clear"]},
    "bm_george": {"name": "George", "tags": ["en-gb", "male", "low"]},
    "tara": {"name": "Tara", "tags": ["en", "female", "orpheus"]},
    "leah": {"name": "Leah", "tags": ["en", "female", "orpheus"]},
    "jess": {"name": "Jess", "tags": ["en", "female", "orpheus"]},
    "leo": {"name": "Leo", "tags": ["en", "male", "orpheus"]},
    "dan": {"name": "Dan", "tags": ["en", "male", "orpheus"]},
    "mia": {"name": "Mia", "tags": ["en", "female", "orpheus"]},
    "zac": {"name": "Zac", "tags": ["en", "male", "orpheus"]},
    "zoe": {"name": "Zoe", "tags": ["en", "female", "orpheus"]},
}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _voice_dir(voice_id: str) -> Path:
    return settings.voices_dir / voice_id


def _meta_path(voice_id: str) -> Path:
    return _voice_dir(voice_id) / "voice.json"


def _reference_path(voice_id: str) -> Path | None:
    folder = _voice_dir(voice_id)
    for name in ("reference.wav", "reference.flac", "reference.ogg", "reference.mp3"):
        path = folder / name
        if path.is_file():
            return path
    matches = sorted(folder.glob("reference.*"))
    return matches[0] if matches else None


def _preset_row(voice_id: str, adapter: str) -> dict[str, Any]:
    meta = PRESET_META.get(voice_id, {"name": voice_id, "tags": []})
    return {
        "id": voice_id,
        "object": "voice",
        "kind": "preset",
        "name": meta["name"],
        "adapter": adapter,
        "description": None,
        "tags": meta["tags"],
        "has_audio": False,
        "created_at": None,
    }


def presets() -> list[dict[str, Any]]:
    rows = [_preset_row(voice_id, "kokoro") for voice_id in KOKORO_VOICE_IDS]
    rows.extend(_preset_row(voice_id, "orpheus") for voice_id in ORPHEUS_VOICE_IDS)
    return rows


SEED_VOICES = (
    ("seed-af_heart", "Heart ref", ["seed", "en-us", "female"]),
    ("seed-am_michael", "Michael ref", ["seed", "en-us", "male"]),
    ("seed-bf_emma", "Emma ref", ["seed", "en-gb", "female"]),
    ("seed-bm_george", "George ref", ["seed", "en-gb", "male"]),
)


def _bundled_references() -> Path:
    return Path(__file__).resolve().parent / "data" / "reference_voices"


def ensure_seed_references() -> None:
    settings.ensure_dirs()
    bundled = _bundled_references()
    for voice_id, name, tags in SEED_VOICES:
        src = bundled / f"{voice_id}.wav"
        if not src.is_file():
            continue
        if _reference_path(voice_id) is not None:
            continue
        folder = _voice_dir(voice_id)
        folder.mkdir(parents=True, exist_ok=True)
        dest = folder / "reference.wav"
        shutil.copy2(src, dest)
        record = {
            "id": voice_id,
            "kind": "clone",
            "name": name,
            "adapter": "reference",
            "description": "Bundled Kokoro clip for cloning adapters (XTTS, Chatterbox, F5-TTS).",
            "tags": tags,
            "created_at": _now(),
        }
        _meta_path(voice_id).write_text(json.dumps(record, indent=2), encoding="utf-8")


def list_library() -> list[dict[str, Any]]:
    settings.ensure_dirs()
    ensure_seed_references()
    rows: list[dict[str, Any]] = []
    if not settings.voices_dir.is_dir():
        return rows
    for folder in sorted(settings.voices_dir.iterdir()):
        meta = _meta_path(folder.name)
        if not meta.is_file():
            continue
        data = json.loads(meta.read_text(encoding="utf-8"))
        data["has_audio"] = _reference_path(folder.name) is not None
        data["object"] = "voice"
        rows.append(data)
    return rows


def get(voice_id: str) -> dict[str, Any] | None:
    for row in presets():
        if row["id"] == voice_id:
            return row
    meta = _meta_path(voice_id)
    if not meta.is_file():
        return None
    data = json.loads(meta.read_text(encoding="utf-8"))
    data["has_audio"] = _reference_path(voice_id) is not None
    data["object"] = "voice"
    return data


def create_clone(
    name: str, raw: bytes, filename: str, tags: list[str] | None = None
) -> dict[str, Any]:
    settings.ensure_dirs()
    voice_id = str(uuid.uuid4())
    folder = _voice_dir(voice_id)
    folder.mkdir(parents=True, exist_ok=True)
    suffix = Path(filename).suffix.lower() or ".wav"
    if suffix not in {".wav", ".flac", ".ogg", ".mp3", ".m4a"}:
        suffix = ".wav"
    dest = folder / f"reference{suffix}"
    dest.write_bytes(raw)
    try:
        samples, rate = sf.read(io.BytesIO(raw))
        wav = folder / "reference.wav"
        sf.write(wav, samples, rate)
        if dest != wav:
            dest.unlink(missing_ok=True)
    except Exception:
        pass
    record = {
        "id": voice_id,
        "kind": "clone",
        "name": name.strip() or "Untitled clip",
        "adapter": "reference",
        "description": None,
        "tags": tags or ["reference"],
        "created_at": _now(),
    }
    _meta_path(voice_id).write_text(json.dumps(record, indent=2), encoding="utf-8")
    return get(voice_id) or record


def create_design(
    name: str,
    description: str,
    tags: list[str] | None = None,
    samples: np.ndarray | None = None,
    sample_rate: int = 44100,
) -> dict[str, Any]:
    settings.ensure_dirs()
    voice_id = str(uuid.uuid4())
    folder = _voice_dir(voice_id)
    folder.mkdir(parents=True, exist_ok=True)
    if samples is not None and samples.size > 0:
        sf.write(folder / "reference.wav", samples, sample_rate)
    record = {
        "id": voice_id,
        "kind": "design",
        "name": name.strip() or "Untitled design",
        "adapter": "parler-tts",
        "description": description.strip(),
        "tags": tags or ["designed"],
        "created_at": _now(),
    }
    _meta_path(voice_id).write_text(json.dumps(record, indent=2), encoding="utf-8")
    return get(voice_id) or record


def create_mix(
    name: str,
    voices: list[str],
    speed: float = 1.0,
    tags: list[str] | None = None,
) -> dict[str, Any]:
    settings.ensure_dirs()
    parts = [item.strip() for item in voices if item.strip()]
    unknown = [item for item in parts if item not in KOKORO_VOICE_IDS]
    if not parts:
        raise ValueError("mix requires at least one Kokoro voice id")
    if unknown:
        raise ValueError(f"unknown Kokoro voice '{unknown[0]}'")
    formula = ",".join(parts)
    voice_id = str(uuid.uuid4())
    folder = _voice_dir(voice_id)
    folder.mkdir(parents=True, exist_ok=True)
    record = {
        "id": voice_id,
        "kind": "mix",
        "name": name.strip() or "Untitled mix",
        "adapter": "kokoro",
        "description": formula,
        "tags": tags or ["mix", "kokoro"],
        "formula": formula,
        "speed": speed,
        "created_at": _now(),
    }
    _meta_path(voice_id).write_text(json.dumps(record, indent=2), encoding="utf-8")
    return get(voice_id) or record


def delete(voice_id: str) -> bool:
    if any(row["id"] == voice_id for row in presets()):
        return False
    folder = _voice_dir(voice_id)
    if not folder.is_dir():
        return False
    shutil.rmtree(folder)
    return True


def reference_file(voice_id: str) -> Path | None:
    return _reference_path(voice_id)


# TODO: run an enhancer pass on clone uploads before storing reference.wav.
# TODO: write adapter embeddings next to voice.json once a cloning backend exists.
# TODO: add reference clips for Orpheus / Dia named speakers once those extras install.
# TODO: weighted Kokoro pack interpolation (voice*w) once mix UX needs non-equal blends.
