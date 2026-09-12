import typer

from . import __version__
from .config import settings

app = typer.Typer(help="voice-labs local speech engine", no_args_is_help=True)


@app.command()
def serve(
    host: str = typer.Option(settings.host, help="Bind address. Keep loopback unless needed."),
    port: int = typer.Option(settings.port),
    reload: bool = typer.Option(False, help="Auto-reload for development."),
) -> None:
    import uvicorn

    uvicorn.run(
        "voicelabs_engine.server:app",
        host=host,
        port=port,
        reload=reload,
        log_level=settings.log_level,
    )


@app.command()
def models(task: str | None = typer.Option(None, help="Filter: tts, asr, vc, enhance")) -> None:
    from .registry import load_registry

    reg = load_registry()
    rows = reg.adapters if task is None else [a for a in reg.adapters if a.task == task]
    for a in rows:
        typer.echo(f"{a.id:<24} {a.task:<8} {a.status:<13} {a.hf_repo or '-'}")
    typer.echo(f"\n{len(rows)} adapters (catalog v{reg.version}, {reg.updated})")


@app.command()
def hardware() -> None:
    from .hardware import detect

    info = detect()
    typer.echo(f"detected : {info.detected}")
    typer.echo(f"devices  : {', '.join(info.devices) or '-'}")
    typer.echo(f"torch    : {info.torch_version or 'not installed'}")
    typer.echo(f"platform : {info.platform}")


@app.command()
def download(adapter_id: str) -> None:
    from .hub import download as hub_download
    from .registry import load_registry

    spec = load_registry().get(adapter_id)
    if spec is None or spec.hf_repo is None:
        raise typer.BadParameter(f"'{adapter_id}' has no Hugging Face repo in the catalog")
    path = hub_download(spec.hf_repo)
    typer.echo(f"{spec.hf_repo} -> {path}")


@app.command()
def version() -> None:
    typer.echo(__version__)
