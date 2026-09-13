import io
import tempfile
from pathlib import Path
from typing import Annotated, Literal

import soundfile as sf
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel, Field

from . import __version__
from .adapters import pool
from .adapters.base import AdapterNotImplemented, ASRAdapter, TTSAdapter
from .hardware import detect, torch_device
from .hub import is_downloaded
from .registry import load_registry

router = APIRouter()


class SpeechRequest(BaseModel):
    model: str
    input: str = Field(min_length=1, max_length=20000)
    voice: str = "default"
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
    voice = None if req.voice == "default" else req.voice
    audio = adapter.synthesize(req.input, voice=voice, speed=req.speed)

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
    adapter = _get(model, expected="asr")
    assert isinstance(adapter, ASRAdapter)

    suffix = Path(file.filename or "audio").suffix or ".wav"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(await file.read())
        tmp_path = Path(tmp.name)
    try:
        result = adapter.transcribe(tmp_path, language=language)
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


# TODO: POST /v1/models/{id}/download with progress via SSE.
# TODO: DELETE /v1/models/{id} to unload and optionally purge weights.
# TODO: GET /v1/voices?model= to expose TTSAdapter.voices() to the desktop app.
