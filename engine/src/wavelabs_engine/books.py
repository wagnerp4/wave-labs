import html
import io
import json
import re
import shutil
import uuid
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from xml.etree import ElementTree

import numpy as np
import soundfile as sf

from . import voices as voice_store
from .adapters import pool
from .adapters.base import TTSAdapter
from .config import settings
from .hardware import detect, torch_device

MAX_CHUNK = 1800
HEADING_RE = re.compile(r"(?m)^#{1,3}\s+(.+)$")
CHAPTER_RE = re.compile(r"(?im)^(?:chapter|part)\s+\d+\b[^\n]*")
ROLE_RE = re.compile(r"(?m)^([A-Z][A-Z0-9 .'-]{1,40}):\s+")


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _book_dir(book_id: str) -> Path:
    return settings.books_dir / book_id


def _meta_path(book_id: str) -> Path:
    return _book_dir(book_id) / "book.json"


def _chapter_wav(book_id: str, index: int) -> Path:
    return _book_dir(book_id) / "chapters" / f"{index:03d}.wav"


def _write(book_id: str, record: dict[str, Any]) -> dict[str, Any]:
    path = _meta_path(book_id)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(record, indent=2), encoding="utf-8")
    return record


def _read(book_id: str) -> dict[str, Any] | None:
    path = _meta_path(book_id)
    if not path.is_file():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def _strip_html(raw: str) -> str:
    text = re.sub(r"(?is)<script.*?>.*?</script>", " ", raw)
    text = re.sub(r"(?is)<style.*?>.*?</style>", " ", text)
    text = re.sub(r"(?is)<br\s*/?>", "\n", text)
    text = re.sub(r"(?is)</(?:p|div|h[1-6]|li)>", "\n\n", text)
    text = re.sub(r"(?is)<[^>]+>", " ", text)
    text = html.unescape(text)
    text = re.sub(r"[ \t]+", " ", text)
    return re.sub(r"\n{3,}", "\n\n", text).strip()


def _epub_text(data: bytes) -> str:
    with zipfile.ZipFile(io.BytesIO(data)) as zf:
        names = zf.namelist()
        opf = next((n for n in names if n.endswith(".opf")), None)
        bodies: list[str] = []
        if opf:
            root = ElementTree.fromstring(zf.read(opf))
            ns = {"o": "http://www.idpf.org/2007/opf"}
            hrefs = [item.attrib.get("href") for item in root.findall(".//o:item", ns)]
            base = str(Path(opf).parent)
            for href in hrefs:
                if not href or not href.lower().endswith((".xhtml", ".html", ".htm")):
                    continue
                target = href if base in {".", ""} else f"{base}/{href}".replace("\\", "/")
                if target not in zf.namelist():
                    target = href
                if target in zf.namelist():
                    bodies.append(_strip_html(zf.read(target).decode("utf-8", errors="replace")))
        if not bodies:
            for name in names:
                if name.lower().endswith((".xhtml", ".html", ".htm")):
                    bodies.append(_strip_html(zf.read(name).decode("utf-8", errors="replace")))
    text = "\n\n".join(b for b in bodies if b)
    if not text:
        raise ValueError("could not extract text from EPUB")
    return text


def manuscript_to_text(data: bytes, filename: str) -> str:
    suffix = Path(filename).suffix.lower()
    if suffix == ".epub":
        return _epub_text(data)
    return data.decode("utf-8", errors="replace").lstrip("\ufeff")


def _split_chapters(text: str) -> list[dict[str, str]]:
    marks = list(HEADING_RE.finditer(text))
    if len(marks) >= 2:
        chapters = []
        for i, match in enumerate(marks):
            end = marks[i + 1].start() if i + 1 < len(marks) else len(text)
            body = text[match.end() : end].strip()
            if body:
                chapters.append({"title": match.group(1).strip(), "text": body, "role": "narrator"})
        if chapters:
            return chapters
    marks = list(CHAPTER_RE.finditer(text))
    if marks:
        chapters = []
        for i, match in enumerate(marks):
            end = marks[i + 1].start() if i + 1 < len(marks) else len(text)
            body = text[match.end() : end].strip()
            title = match.group(0).strip()
            if body:
                chapters.append({"title": title, "text": body, "role": "narrator"})
        if chapters:
            return chapters
    body = text.strip()
    if not body:
        raise ValueError("manuscript is empty")
    return [{"title": "Manuscript", "text": body, "role": "narrator"}]


def _roles_from_text(text: str) -> list[str]:
    found = []
    for match in ROLE_RE.finditer(text):
        name = match.group(1).strip().title()
        if name not in found:
            found.append(name)
    return found


def _chunk_text(text: str) -> list[str]:
    paras = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    chunks: list[str] = []
    buf = ""
    for para in paras:
        candidate = f"{buf}\n\n{para}" if buf else para
        if len(candidate) > MAX_CHUNK and buf:
            chunks.append(buf)
            buf = para
        else:
            buf = candidate
    if buf:
        chunks.append(buf)
    if not chunks:
        return [text[:MAX_CHUNK]]
    overflow: list[str] = []
    for chunk in chunks:
        if len(chunk) <= MAX_CHUNK:
            overflow.append(chunk)
            continue
        for i in range(0, len(chunk), MAX_CHUNK):
            overflow.append(chunk[i : i + MAX_CHUNK])
    return overflow


def list_books() -> list[dict[str, Any]]:
    settings.ensure_dirs()
    rows: list[dict[str, Any]] = []
    if not settings.books_dir.is_dir():
        return rows
    for folder in sorted(settings.books_dir.iterdir(), key=lambda p: p.name):
        record = _read(folder.name)
        if record:
            rows.append(_public(record))
    return rows


def get(book_id: str) -> dict[str, Any] | None:
    record = _read(book_id)
    return _public(record) if record else None


def _public(record: dict[str, Any]) -> dict[str, Any]:
    book_id = record["id"]
    chapters = []
    for i, chapter in enumerate(record.get("chapters", [])):
        wav = _chapter_wav(book_id, i)
        chapters.append(
            {
                **chapter,
                "index": i,
                "chars": len(chapter.get("text", "")),
                "has_audio": wav.is_file(),
            }
        )
    return {
        "id": book_id,
        "object": "book",
        "name": record["name"],
        "source": record.get("source"),
        "status": record.get("status", "draft"),
        "roles": record.get("roles", {}),
        "chapters": chapters,
        "created_at": record.get("created_at"),
    }


def create(name: str, data: bytes, filename: str) -> dict[str, Any]:
    settings.ensure_dirs()
    text = manuscript_to_text(data, filename)
    chapters = _split_chapters(text)
    extras = _roles_from_text(text)
    roles = {"narrator": {"voice": "af_heart", "adapter": "kokoro"}}
    for role in extras:
        key = role.lower()
        if key not in roles:
            roles[key] = {"voice": "af_heart", "adapter": "kokoro"}
    book_id = str(uuid.uuid4())
    folder = _book_dir(book_id)
    folder.mkdir(parents=True, exist_ok=True)
    (folder / "chapters").mkdir(exist_ok=True)
    (folder / "manuscript.txt").write_text(text, encoding="utf-8")
    record = {
        "id": book_id,
        "name": name.strip() or Path(filename).stem or "Untitled book",
        "source": filename,
        "status": "draft",
        "roles": roles,
        "chapters": chapters,
        "created_at": _now(),
    }
    _write(book_id, record)
    return _public(record)


def set_cast(book_id: str, roles: dict[str, Any]) -> dict[str, Any]:
    record = _read(book_id)
    if record is None:
        raise KeyError(book_id)
    merged = dict(record.get("roles", {}))
    for key, value in roles.items():
        if not isinstance(value, dict):
            continue
        merged[key] = {
            "voice": str(value.get("voice") or "af_heart"),
            "adapter": str(value.get("adapter") or "kokoro"),
        }
    record["roles"] = merged
    _write(book_id, record)
    return _public(record)


def delete(book_id: str) -> bool:
    folder = _book_dir(book_id)
    if not folder.is_dir():
        return False
    shutil.rmtree(folder)
    return True


def chapter_audio(book_id: str, index: int) -> Path | None:
    path = _chapter_wav(book_id, index)
    return path if path.is_file() else None


def _synthesize_chunks(texts: list[str], adapter_id: str, voice: str) -> tuple[np.ndarray, int]:
    adapter = pool.get(adapter_id, torch_device(detect()))
    if not isinstance(adapter, TTSAdapter):
        raise TypeError(f"'{adapter_id}' is not a TTS adapter")
    parts: list[np.ndarray] = []
    rate = 24000
    for piece in texts:
        reference = voice_store.reference_file(voice)
        audio = adapter.synthesize(piece, voice=voice, speed=1.0, reference=reference)
        parts.append(np.asarray(audio.samples, dtype=np.float32))
        rate = audio.sample_rate
    if not parts:
        return np.zeros(0, dtype=np.float32), rate
    return np.concatenate(parts), rate


def render(book_id: str, chapter_index: int | None = None) -> dict[str, Any]:
    record = _read(book_id)
    if record is None:
        raise KeyError(book_id)
    chapters = record.get("chapters", [])
    indices = [chapter_index] if chapter_index is not None else list(range(len(chapters)))
    record["status"] = "rendering"
    _write(book_id, record)
    try:
        for index in indices:
            if index < 0 or index >= len(chapters):
                raise IndexError(index)
            chapter = chapters[index]
            role = chapter.get("role") or "narrator"
            cast = record.get("roles", {}).get(role) or record.get("roles", {}).get("narrator")
            if not cast:
                raise RuntimeError("no narrator voice assigned")
            samples, rate = _synthesize_chunks(
                _chunk_text(chapter.get("text") or ""),
                str(cast.get("adapter") or "kokoro"),
                str(cast.get("voice") or "af_heart"),
            )
            wav = _chapter_wav(book_id, index)
            wav.parent.mkdir(parents=True, exist_ok=True)
            sf.write(wav, samples, rate)
        record["status"] = "ready"
        _write(book_id, record)
    except Exception:
        record["status"] = "error"
        _write(book_id, record)
        raise
    return _public(record)


# TODO: export a single M4B / concatenated WAV once chapter renders are stable.
# TODO: per-paragraph role assignment from dialogue tags instead of one role per chapter.
