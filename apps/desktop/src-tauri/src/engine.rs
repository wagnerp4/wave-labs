use std::net::TcpStream;
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::time::Duration;
use tauri::{AppHandle, Manager, State};

const DEFAULT_PORT: u16 = 8471;

pub struct EngineProcess(pub Mutex<Option<Child>>);

fn port_open(port: u16) -> bool {
    TcpStream::connect_timeout(
        &(std::net::Ipv4Addr::LOCALHOST, port).into(),
        Duration::from_millis(200),
    )
    .is_ok()
}

fn engine_dir(app: &AppHandle) -> Option<PathBuf> {
    if let Ok(from_env) = std::env::var("WAVELABS_ENGINE_DIR") {
        let path = PathBuf::from(from_env);
        if path.join("pyproject.toml").is_file() {
            return Some(path);
        }
    }

    let compile_time = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../../engine");
    if compile_time.join("pyproject.toml").is_file() {
        return compile_time.canonicalize().ok().or(Some(compile_time));
    }

    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            let next_to_exe = dir.join("engine");
            if next_to_exe.join("pyproject.toml").is_file() {
                return Some(next_to_exe);
            }
        }
    }

    if let Ok(resource) = app.path().resource_dir() {
        let bundled = resource.join("engine");
        if bundled.join("pyproject.toml").is_file() {
            return Some(bundled);
        }
    }

    None
}

fn resolve_uv() -> PathBuf {
    if let Ok(from_env) = std::env::var("WAVELABS_UV") {
        return PathBuf::from(from_env);
    }
    PathBuf::from("uv")
}

#[cfg(windows)]
fn parse_wsl_unc(path: &Path) -> Option<(String, PathBuf)> {
    let raw = path.to_string_lossy().replace('/', "\\");
    let lower = raw.to_ascii_lowercase();
    let rest = if let Some(idx) = lower.find("\\wsl.localhost\\") {
        &raw[idx + "\\wsl.localhost\\".len()..]
    } else if let Some(idx) = lower.find("\\wsl$\\") {
        &raw[idx + "\\wsl$\\".len()..]
    } else {
        return None;
    };
    let mut parts = rest.split('\\').filter(|part| !part.is_empty());
    let distro = parts.next()?.to_string();
    let linux = format!("/{}", parts.collect::<Vec<_>>().join("/"));
    Some((distro, PathBuf::from(linux)))
}

#[cfg(windows)]
fn linux_engine_path(path: PathBuf) -> PathBuf {
    if path.file_name().and_then(|name| name.to_str()) == Some("engine") {
        path
    } else {
        path.join("engine")
    }
}

#[cfg(windows)]
fn wsl_engine_target(app: &AppHandle) -> Option<(String, PathBuf)> {
    let distro_env = std::env::var("WAVELABS_WSL_DISTRO").ok();
    if let Ok(repo) = std::env::var("WAVELABS_WSL_REPO") {
        let distro = distro_env.unwrap_or_else(|| "Debian".to_string());
        let engine = linux_engine_path(PathBuf::from(repo.trim_end_matches('/')));
        return Some((distro, engine));
    }

    let mut candidates: Vec<PathBuf> = Vec::new();
    if let Ok(from_env) = std::env::var("WAVELABS_ENGINE_DIR") {
        candidates.push(PathBuf::from(from_env));
    }
    candidates.push(PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../../engine"));
    if let Some(found) = engine_dir(app) {
        candidates.push(found);
    }

    for cand in candidates {
        if let Some((parsed_distro, linux)) = parse_wsl_unc(&cand) {
            let distro = distro_env.clone().unwrap_or(parsed_distro);
            return Some((distro, linux_engine_path(linux)));
        }
    }
    None
}

#[cfg(windows)]
fn spawn_wsl_engine(distro: &str, linux_engine: &Path) -> Result<Child, String> {
    let engine = linux_engine.to_string_lossy().replace('"', "\\\"");
    let script = format!(
        "cd \"{engine}\" && uv run wavelabs-engine serve --host 0.0.0.0 --port {DEFAULT_PORT}"
    );
    Command::new("wsl")
        .args(["-d", distro, "--", "bash", "-lc", &script])
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|err| {
            format!(
                "failed to spawn wsl -d {distro} engine at {engine}: {err}. Set WAVELABS_WSL_DISTRO and WAVELABS_WSL_REPO."
            )
        })
}

fn spawn_native_engine(engine: &Path) -> Result<Child, String> {
    let uv = resolve_uv();
    Command::new(&uv)
        .args([
            "run",
            "wavelabs-engine",
            "serve",
            "--host",
            "127.0.0.1",
            "--port",
            &DEFAULT_PORT.to_string(),
        ])
        .current_dir(engine)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|err| format!("failed to spawn {} in {}: {err}", uv.display(), engine.display()))
}

#[tauri::command]
pub fn start_engine(app: AppHandle, state: State<EngineProcess>) -> Result<String, String> {
    if port_open(DEFAULT_PORT) {
        return Ok(format!("engine already listening on 127.0.0.1:{DEFAULT_PORT}"));
    }

    let mut slot = state.0.lock().map_err(|e| e.to_string())?;
    if let Some(child) = slot.as_mut() {
        if child.try_wait().map_err(|e| e.to_string())?.is_none() {
            return Ok("engine process already spawned".to_string());
        }
    }

    let (child, origin) = {
        #[cfg(windows)]
        {
            if let Some((distro, linux_engine)) = wsl_engine_target(&app) {
                (
                    spawn_wsl_engine(&distro, &linux_engine)?,
                    format!("wsl:{distro}:{}", linux_engine.display()),
                )
            } else {
                let engine = engine_dir(&app).ok_or_else(|| {
                    "engine directory not found. On Windows with the repo in WSL, set WAVELABS_WSL_REPO (Linux path) and WAVELABS_WSL_DISTRO, or start serve from WSL. Otherwise set WAVELABS_ENGINE_DIR."
                        .to_string()
                })?;
                (spawn_native_engine(&engine)?, engine.display().to_string())
            }
        }
        #[cfg(not(windows))]
        {
            let engine = engine_dir(&app).ok_or_else(|| {
                "engine directory not found. Set WAVELABS_ENGINE_DIR or keep engine/ next to the binary."
                    .to_string()
            })?;
            (spawn_native_engine(&engine)?, engine.display().to_string())
        }
    };

    *slot = Some(child);
    Ok(format!("started engine from {origin}"))
}

#[tauri::command]
pub fn stop_engine(state: State<EngineProcess>) -> Result<String, String> {
    let mut slot = state.0.lock().map_err(|e| e.to_string())?;
    match slot.take() {
        Some(mut child) => {
            let _ = child.kill();
            let _ = child.wait();
            Ok("engine stopped".to_string())
        }
        None => Ok("no spawned engine".to_string()),
    }
}

pub fn kill_on_exit(state: &EngineProcess) {
    if let Ok(mut slot) = state.0.lock() {
        if let Some(mut child) = slot.take() {
            let _ = child.kill();
            let _ = child.wait();
        }
    }
}

// TODO: resolve WAVELABS_WSL_DISTRO from `wsl -l -q` when unset.
// TODO: stop_engine should terminate the Linux uvicorn tree, not only the wsl.exe wrapper.
