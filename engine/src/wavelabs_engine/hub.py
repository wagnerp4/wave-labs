from pathlib import Path

from huggingface_hub import snapshot_download

from .config import settings


def download(
    repo_id: str,
    revision: str | None = None,
    allow_patterns: list[str] | None = None,
) -> Path:
    settings.ensure_dirs()
    path = snapshot_download(
        repo_id=repo_id,
        revision=revision,
        cache_dir=str(settings.models_dir),
        allow_patterns=allow_patterns,
    )
    return Path(path)


def is_downloaded(repo_id: str) -> bool:
    safe = repo_id.replace("/", "--")
    return any(settings.models_dir.glob(f"models--{safe}/snapshots/*"))


# TODO: report download progress to the API (tqdm callback or huggingface_hub progress hooks).
# TODO: support HF_TOKEN for gated repos and surface a clear error when access is denied.
