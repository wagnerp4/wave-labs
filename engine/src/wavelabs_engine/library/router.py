from typing import Literal

BackendKind = Literal["huggingface", "ollama"]


class BackendRouter:
    def __init__(self, default: BackendKind = "huggingface") -> None:
        self.default = default

    def resolve(self, requested: BackendKind | None = None) -> BackendKind:
        return requested or self.default

    def list_kinds(self) -> list[BackendKind]:
        return ["huggingface", "ollama"]
