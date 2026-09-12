use serde::Serialize;

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

// TODO: spawn the Python engine as a Tauri sidecar (tauri-plugin-shell `sidecar`) and
// stream its stdout/stderr to the Logs screen via events.
// TODO: pick a free port at startup and pass it to both the sidecar and the frontend.
// TODO: expose `open_path` for the outputs directory using tauri-plugin-opener.

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![app_info])
        .run(tauri::generate_context!())
        .expect("error while running voice-labs");
}
