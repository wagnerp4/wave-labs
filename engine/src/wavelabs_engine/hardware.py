import platform
from dataclasses import dataclass, field

from .config import settings


@dataclass
class HardwareInfo:
    detected: str
    devices: list[str] = field(default_factory=list)
    torch_version: str | None = None
    platform: str = platform.platform()


def detect() -> HardwareInfo:
    if settings.device != "auto":
        return HardwareInfo(detected=settings.device, devices=[settings.device])

    try:
        import torch
    except ImportError:
        return HardwareInfo(detected="cpu", devices=["cpu"])

    info = HardwareInfo(detected="cpu", devices=["cpu"], torch_version=torch.__version__)

    if torch.cuda.is_available():
        names = [torch.cuda.get_device_name(i) for i in range(torch.cuda.device_count())]
        is_rocm = getattr(torch.version, "hip", None) is not None
        info.detected = "rocm" if is_rocm else "cuda"
        info.devices = names
        return info

    mps = getattr(torch.backends, "mps", None)
    if mps is not None and mps.is_available():
        info.detected = "mps"
        info.devices = ["Apple Silicon"]
        return info

    return info


def torch_device(info: HardwareInfo) -> str:
    if info.detected in ("cuda", "rocm"):
        return "cuda"
    if info.detected == "mps":
        return "mps"
    return "cpu"
