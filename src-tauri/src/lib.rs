mod process_monitor;
mod resolution_manager;

use process_monitor::{start_monitor_hook, ProcessInfo};
use resolution_manager::Resolution;
use tauri::Manager;
use tauri_plugin_store::StoreExt;

#[tauri::command]
fn get_resolutions() -> Vec<Resolution> {
    resolution_manager::get_supported_resolutions()
}

#[tauri::command]
fn get_current_res() -> Option<Resolution> {
    resolution_manager::get_current_resolution()
}

#[tauri::command]
fn set_resolution(width: u32, height: u32, frequency: u32) -> Result<(), String> {
    resolution_manager::change_resolution(Resolution {
        width,
        height,
        frequency,
    })
}

#[tauri::command]
fn fetch_processes() -> Vec<ProcessInfo> {
    process_monitor::get_running_processes()
}

#[tauri::command]
fn open_config_folder(app: tauri::AppHandle) {
    if let Ok(path) = app.path().app_config_dir() {
        use std::process::Command;
        // Windows specific explorer launch
        #[cfg(target_os = "windows")]
        let _ = Command::new("explorer").arg(path).spawn();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_autostart::Builder::new().build())
        .plugin(tauri_plugin_store::Builder::new().build())
        .setup(|app| {
            if cfg!(debug_assertions) {
                let _ = app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                );
            }

            // Start Minimized Check
            let stores = app.handle().store("config.json");
            match stores {
                Ok(store) => {
                    // tauri-plugin-store in Rust loads from disk.
                    if let Some(val) = store.get("startMinimized") {
                        if let Some(true) = val.as_bool() {
                            if let Some(window) = app.get_webview_window("main") {
                                window.hide().unwrap();
                            }
                        }
                    }
                }
                Err(_) => {}
            }

            start_monitor_hook(app.handle().clone());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_resolutions,
            get_current_res,
            set_resolution,
            fetch_processes,
            open_config_folder
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
