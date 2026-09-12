from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="VOICELABS_", env_file=".env", extra="ignore")

    host: str = "127.0.0.1"
    port: int = 8471
    data_dir: Path = Path.home() / ".voicelabs"
    registry: Path | None = None
    device: str = "auto"
    log_level: str = "info"

    @property
    def models_dir(self) -> Path:
        return self.data_dir / "models"

    @property
    def outputs_dir(self) -> Path:
        return self.data_dir / "outputs"

    def ensure_dirs(self) -> None:
        self.models_dir.mkdir(parents=True, exist_ok=True)
        self.outputs_dir.mkdir(parents=True, exist_ok=True)


settings = Settings()
