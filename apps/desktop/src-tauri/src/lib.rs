mod engine;

use engine::{kill_on_exit, start_engine, stop_engine, EngineProcess};
use serde::Serialize;
use std::sync::Mutex;
use tauri::Manager;

#[derive(Serialize)]
struct AppInfo {
    version: String,
    engine_url: String,
}

#[tauri::command]
fn app_info() -> AppInfo {
    AppInfo {
        version: env!("CARGO_PKG_VERSION").to_string(),
        engine_url: "http://127.0.0.1:8471".to_string(),
    }
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .manage(EngineProcess(Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![app_info, start_engine, stop_engine])
        .on_window_event(|window, event| {
            if matches!(event, tauri::WindowEvent::Destroyed) {
                if let Some(state) = window.app_handle().try_state::<EngineProcess>() {
                    kill_on_exit(&state);
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running wave-labs");
}
