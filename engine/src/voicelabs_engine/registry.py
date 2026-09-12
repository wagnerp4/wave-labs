import json
from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, Field

from .config import settings

Task = Literal["tts", "asr", "vc", "enhance"]
Hardware = Literal["cpu", "cuda", "mps", "rocm"]


class AdapterSpec(BaseModel):
    id: str
    name: str
    task: Task
    connection: Literal["local", "remote"]
    status: Literal["available", "experimental", "planned"]
    runtime: str
    hardware: list[Hardware]
    hf_repo: str | None
    license: str
    params: str | None
    languages: str | list[str]
    description: str
    features: list[str] = Field(default_factory=list)
    homepage: str | None = None


class Registry(BaseModel):
    version: int
    updated: str
    adapters: list[AdapterSpec]

    def get(self, adapter_id: str) -> AdapterSpec | None:
        return next((a for a in self.adapters if a.id == adapter_id), None)

    def by_task(self, task: Task) -> list[AdapterSpec]:
        return [a for a in self.adapters if a.task == task]


def _candidate_paths() -> list[Path]:
    here = Path(__file__).resolve()
    candidates: list[Path] = []
    if settings.registry is not None:
        candidates.append(settings.registry)
    candidates.append(here.parent / "data" / "adapters.json")
    candidates.append(here.parents[3] / "packages" / "registry" / "adapters.json")
    return candidates


@lru_cache(maxsize=1)
def load_registry() -> Registry:
    for path in _candidate_paths():
        if path.is_file():
            with path.open("r", encoding="utf-8") as fh:
                return Registry.model_validate(json.load(fh))
    searched = ", ".join(str(p) for p in _candidate_paths())
    raise FileNotFoundError(f"adapters.json not found. Searched: {searched}")
