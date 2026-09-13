from pathlib import Path

from ...hub import download, is_downloaded


class HuggingFaceBackend:
    kind = "huggingface"

    def pull(self, repo_id: str, revision: str | None = None) -> Path:
        return download(repo_id, revision=revision)

    def cached(self, repo_id: str) -> bool:
        return is_downloaded(repo_id)
