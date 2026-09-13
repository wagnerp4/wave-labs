use std::net::TcpStream;
use std::path::PathBuf;
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
        return compile_time.canonicalize().ok();
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

    let engine = engine_dir(&app).ok_or_else(|| {
        "engine directory not found. Set WAVELABS_ENGINE_DIR or keep engine/ next to the binary."
            .to_string()
    })?;

    let uv = resolve_uv();
    let child = Command::new(&uv)
        .args([
            "run",
            "wavelabs-engine",
            "serve",
            "--host",
            "127.0.0.1",
            "--port",
            &DEFAULT_PORT.to_string(),
        ])
        .current_dir(&engine)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|e| {
            format!(
                "failed to spawn {} in {}: {e}",
                uv.display(),
                engine.display()
            )
        })?;

    *slot = Some(child);
    Ok(format!("started engine from {}", engine.display()))
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
