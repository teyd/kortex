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
    use tauri::menu::{Menu, MenuItem};
    use tauri::tray::{MouseButton, TrayIconBuilder, TrayIconEvent};

    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            let _ = app
                .get_webview_window("main")
                .expect("no main window")
                .set_focus();
        }))
        .plugin(tauri_plugin_autostart::Builder::new().build())
        .plugin(tauri_plugin_store::Builder::default().build())
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                window.hide().unwrap();
                api.prevent_close();
            }
        })
        .setup(|app| {
            if cfg!(debug_assertions) {
                let _ = app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                );
            }

            // Custom Store Initialization (Local to Executable)
            let store_path = std::env::current_exe()
                .unwrap_or_default()
                .parent()
                .unwrap_or_else(|| std::path::Path::new("."))
                .join("config.json");

            let store = app.handle().store(store_path.clone());

            match store {
                Ok(store) => {
                    // tauri-plugin-store in Rust loads from disk.
                    // Schema is now: { "system": { "startMinimized": boolean, ... }, ... }
                    if let Some(system) = store.get("system") {
                        if let Some(true) = system.get("startMinimized").and_then(|v| v.as_bool()) {
                            if let Some(window) = app.get_webview_window("main") {
                                window.hide().unwrap();
                            }
                        }
                    }
                }
                Err(_) => {}
            }

            // Tray Implementation
            let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let show_i = MenuItem::with_id(app, "show", "Show", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_i, &quit_i])?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "quit" => app.exit(0),
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            window.show().unwrap();
                            window.set_focus().unwrap();
                        }
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

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
