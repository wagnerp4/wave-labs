import asyncio
import io
import tempfile
from pathlib import Path
from typing import Annotated, Literal

import soundfile as sf
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel, Field

from . import __version__
from . import books as book_store
from . import voices as voice_store
from .adapters import IMPLEMENTED, pool
from .adapters.base import AdapterNotImplemented, ASRAdapter, TTSAdapter
from .hardware import detect, torch_device
from .hub import download as hub_download
from .hub import is_downloaded
from .registry import load_registry

router = APIRouter()


class SpeechRequest(BaseModel):
    model: str = "kokoro"
    input: str = Field(min_length=1, max_length=20000)
    voice: str = "af_heart"
    speed: float = Field(default=1.0, ge=0.25, le=4.0)
    response_format: Literal["wav", "flac", "pcm"] = "wav"


@router.get("/health")
def health() -> dict:
    hw = detect()
    return {
        "status": "ok",
        "version": __version__,
        "hardware": {"detected": hw.detected, "devices": hw.devices},
        "loaded": pool.loaded_ids,
    }


@router.get("/v1/models")
def list_models() -> dict:
    reg = load_registry()
    data = []
    for a in reg.adapters:
        data.append(
            {
                "id": a.id,
                "object": "model",
                "owned_by": (a.hf_repo or "wave-labs").split("/")[0],
                "task": a.task,
                "status": a.status,
                "implemented": a.id in IMPLEMENTED,
                "hf_repo": a.hf_repo,
                "downloaded": bool(a.hf_repo and is_downloaded(a.hf_repo)),
                "loaded": a.id in pool.loaded_ids,
            }
        )
    return {"object": "list", "data": data}


@router.post("/v1/audio/speech")
def speech(req: SpeechRequest) -> Response:
    adapter = _get(req.model, expected="tts")
    assert isinstance(adapter, TTSAdapter)
    voice = None if req.voice in {"default", ""} else req.voice
    speed = req.speed
    stored = voice_store.get(req.voice) if voice else None
    if stored and stored.get("kind") == "mix":
        voice = str(stored.get("formula") or "")
        speed = float(stored.get("speed") or 1.0) * req.speed
    if stored and stored.get("kind") == "design" and req.model == "parler-tts":
        voice = str(stored.get("description") or "")
    reference = voice_store.reference_file(req.voice) if req.voice else None
    try:
        audio = adapter.synthesize(req.input, voice=voice, speed=speed, reference=reference)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    if req.response_format == "pcm":
        pcm = (audio.samples * 32767).clip(-32768, 32767).astype("<i2").tobytes()
        return Response(content=pcm, media_type="audio/pcm")

    buf = io.BytesIO()
    sf.write(buf, audio.samples, audio.sample_rate, format=req.response_format.upper())
    media = "audio/wav" if req.response_format == "wav" else "audio/flac"
    return Response(content=buf.getvalue(), media_type=media)


@router.post("/v1/audio/transcriptions", response_model=None)
async def transcriptions(
    file: Annotated[UploadFile, File()],
    model: Annotated[str, Form()],
    language: Annotated[str | None, Form()] = None,
    response_format: Annotated[Literal["json", "verbose_json", "text"], Form()] = "json",
) -> Response | dict:
    adapter = await asyncio.to_thread(_get, model, "asr")
    assert isinstance(adapter, ASRAdapter)

    suffix = Path(file.filename or "audio").suffix or ".wav"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(await file.read())
        tmp_path = Path(tmp.name)
    try:
        result = await asyncio.to_thread(adapter.transcribe, tmp_path, language)
    finally:
        tmp_path.unlink(missing_ok=True)

    if response_format == "text":
        return Response(content=result.text, media_type="text/plain")
    if response_format == "verbose_json":
        return {
            "task": "transcribe",
            "language": result.language,
            "text": result.text,
            "segments": [{"start": s.start, "end": s.end, "text": s.text} for s in result.segments],
        }
    return {"text": result.text}


class DesignVoiceRequest(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    description: str = Field(min_length=3, max_length=2000)
    script: str = Field(
        default="The leaves move though the air is still. Listen for a moment.",
        min_length=3,
        max_length=500,
    )
    tags: list[str] = Field(default_factory=list)


PROBE_SCRIPT = "The leaves move though the air is still. Listen for a moment."


@router.post("/v1/voices/design")
async def design_voice(req: DesignVoiceRequest) -> dict:
    adapter = await asyncio.to_thread(_get, "parler-tts", "tts")
    assert isinstance(adapter, TTSAdapter)
    script = req.script.strip() or PROBE_SCRIPT
    try:
        audio = await asyncio.to_thread(
            adapter.synthesize, script, req.description.strip(), 1.0, None
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return await asyncio.to_thread(
        voice_store.create_design,
        req.name,
        req.description,
        req.tags,
        audio.samples,
        audio.sample_rate,
    )


@router.post("/v1/models/{adapter_id}/download")
async def download_model(adapter_id: str) -> dict:
    spec = load_registry().get(adapter_id)
    if spec is None:
        raise HTTPException(status_code=404, detail=f"unknown model '{adapter_id}'")
    if spec.hf_repo is None:
        raise HTTPException(status_code=400, detail=f"model '{adapter_id}' has no Hugging Face repo")
    try:
        path = await asyncio.to_thread(hub_download, spec.hf_repo)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"download failed: {exc}") from exc
    return {
        "id": adapter_id,
        "hf_repo": spec.hf_repo,
        "path": str(path),
        "downloaded": True,
    }


@router.get("/v1/voices")
def list_voices(kind: str | None = None) -> dict:
    data = voice_store.presets() + voice_store.list_library()
    if kind:
        data = [row for row in data if row.get("kind") == kind]
    return {"object": "list", "data": data}


@router.post("/v1/voices/clone")
async def clone_voice(
    file: Annotated[UploadFile, File()],
    name: Annotated[str, Form()],
) -> dict:
    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="empty audio file")
    return voice_store.create_clone(name, raw, file.filename or "clip.wav")


class MixVoiceRequest(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    voices: list[str] = Field(min_length=1)
    speed: float = Field(default=1.0, ge=0.25, le=4.0)
    tags: list[str] = Field(default_factory=list)


@router.post("/v1/voices/mix")
def mix_voice(req: MixVoiceRequest) -> dict:
    try:
        return voice_store.create_mix(req.name, req.voices, req.speed, req.tags)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/v1/voices/{voice_id}")
def get_voice(voice_id: str) -> dict:
    row = voice_store.get(voice_id)
    if row is None:
        raise HTTPException(status_code=404, detail=f"unknown voice '{voice_id}'")
    return row


@router.get("/v1/voices/{voice_id}/audio")
def voice_audio(voice_id: str) -> FileResponse:
    path = voice_store.reference_file(voice_id)
    if path is None:
        raise HTTPException(status_code=404, detail="no reference audio for this voice")
    media = "audio/wav" if path.suffix == ".wav" else "application/octet-stream"
    return FileResponse(path, media_type=media, filename=path.name)


@router.delete("/v1/voices/{voice_id}")
def delete_voice(voice_id: str) -> dict:
    if any(row["id"] == voice_id for row in voice_store.presets()):
        raise HTTPException(status_code=400, detail="preset voices cannot be deleted")
    if not voice_store.delete(voice_id):
        raise HTTPException(status_code=404, detail=f"unknown voice '{voice_id}'")
    return {"deleted": voice_id}


class CastRequest(BaseModel):
    roles: dict[str, dict[str, str]]


@router.get("/v1/books")
def list_books() -> dict:
    return {"object": "list", "data": book_store.list_books()}


@router.post("/v1/books")
async def create_book(
    file: Annotated[UploadFile, File()],
    name: Annotated[str, Form()] = "",
) -> dict:
    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="empty manuscript")
    try:
        return book_store.create(name, raw, file.filename or "manuscript.txt")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/v1/books/{book_id}")
def get_book(book_id: str) -> dict:
    row = book_store.get(book_id)
    if row is None:
        raise HTTPException(status_code=404, detail=f"unknown book '{book_id}'")
    return row


@router.patch("/v1/books/{book_id}/cast")
def cast_book(book_id: str, req: CastRequest) -> dict:
    try:
        return book_store.set_cast(book_id, req.roles)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"unknown book '{book_id}'") from None


@router.post("/v1/books/{book_id}/render")
async def render_book(book_id: str, chapter: int | None = None) -> dict:
    try:
        return await asyncio.to_thread(book_store.render, book_id, chapter)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"unknown book '{book_id}'") from None
    except IndexError:
        raise HTTPException(status_code=400, detail="chapter index out of range") from None
    except AdapterNotImplemented as exc:
        raise HTTPException(status_code=501, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("/v1/books/{book_id}/chapters/{index}/audio")
def book_chapter_audio(book_id: str, index: int) -> FileResponse:
    path = book_store.chapter_audio(book_id, index)
    if path is None:
        raise HTTPException(status_code=404, detail="chapter has no audio yet")
    return FileResponse(path, media_type="audio/wav", filename=path.name)


@router.delete("/v1/books/{book_id}")
def delete_book(book_id: str) -> dict:
    if not book_store.delete(book_id):
        raise HTTPException(status_code=404, detail=f"unknown book '{book_id}'")
    return {"deleted": book_id}


def _get(adapter_id: str, expected: str) -> TTSAdapter | ASRAdapter:
    spec = load_registry().get(adapter_id)
    if spec is None:
        raise HTTPException(status_code=404, detail=f"unknown model '{adapter_id}'")
    if spec.task != expected:
        detail = f"model '{adapter_id}' is {spec.task}, expected {expected}"
        raise HTTPException(status_code=400, detail=detail)
    try:
        return pool.get(adapter_id, torch_device(detect()))
    except AdapterNotImplemented as exc:
        raise HTTPException(status_code=501, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


# TODO: stream download progress over SSE.
# TODO: DELETE /v1/models/{id} to unload and optionally purge weights.
# TODO: POST /v1/voices/{id}/embed once a cloning adapter can consume reference.wav.
# TODO: stream book render progress over SSE.
