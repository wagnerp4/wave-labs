class OllamaBackend:
    kind = "ollama"
    host: str = "http://127.0.0.1:11434"

    def list_models(self) -> list[str]:
        raise NotImplementedError("Ollama listing is not implemented yet")

    def pull(self, name: str) -> None:
        raise NotImplementedError(f"Ollama pull for {name} is not implemented yet")
