use crate::resolution_manager::{change_resolution, get_current_resolution, Resolution};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use sysinfo::{Pid, ProcessesToUpdate, System};
use tauri::AppHandle;
use tauri::Emitter;
use tauri_plugin_store::StoreExt;
use windows::Win32::{
    Foundation::HWND,
    UI::{
        Accessibility::{SetWinEventHook, HWINEVENTHOOK},
        WindowsAndMessaging::{
            DispatchMessageW, GetMessageW, GetWindowThreadProcessId, TranslateMessage,
            EVENT_SYSTEM_FOREGROUND, MSG, WINEVENT_OUTOFCONTEXT,
        },
    },
};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessInfo {
    pub pid: u32,
    pub name: String,
    pub memory: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResolutionProfile {
    pub process_name: String,
    pub width: u32,
    pub height: u32,
    pub frequency: u32,
}

// Global state for key monitoring data
struct MonitorState {
    original_resolution: Option<Resolution>,
    active_process: Option<String>, // Name of the process forcing the resolution
    revert_pending: Option<Instant>, // Time when revert was requested
}

// Global AppHandle for the hook callback
static mut APP_HANDLE: Option<AppHandle> = None;
static STATE: Mutex<Option<Arc<Mutex<MonitorState>>>> = Mutex::new(None);

pub fn get_running_processes() -> Vec<ProcessInfo> {
    let mut sys = System::new_all();
    sys.refresh_processes(ProcessesToUpdate::All, true);

    let mut procs: Vec<ProcessInfo> = sys
        .processes()
        .iter()
        .map(|(pid, process)| ProcessInfo {
            pid: pid.as_u32(),
            name: process.name().to_string_lossy().into_owned(),
            memory: process.memory(),
        })
        .collect();

    // Sort by Memory Usage (Descending)
    procs.sort_by(|a, b| b.memory.cmp(&a.memory));

    procs
}

// Hook Callback
unsafe extern "system" fn win_event_hook(
    _h_win_event_hook: HWINEVENTHOOK,
    event: u32,
    hwnd: HWND,
    _id_object: i32,
    _id_child: i32,
    _id_event_thread: u32,
    _dw_ms_event_time: u32,
) {
    if event == EVENT_SYSTEM_FOREGROUND {
        // println!("Hook Triggered");
        check_and_apply_window(hwnd, "Hook");
    }
}

// Shared logic for both Hook and Polling
fn check_and_apply_window(hwnd: HWND, source: &str) {
    if hwnd.0.is_null() {
        return;
    }

    let mut process_id = 0;
    unsafe {
        GetWindowThreadProcessId(hwnd, Some(&mut process_id));
    }

    // Optimization: avoid re-creating System every millisecond if possible,
    // but for now creating it fresh ensures we get the latest proc list safely.
    // To optimize, we could store a System in a Mutex, but `System::new_all()` is actually heavy.
    // `System::new()` is lighter.
    let mut sys = System::new();
    // We only need to refresh specific PID?
    // sysinfo 0.36 doesn't have refresh_process(pid) directly on System easily without Full refresh sometimes?
    // Actually, refresh_processes with list is best.
    sys.refresh_processes(ProcessesToUpdate::All, true);

    let process_name = if let Some(proc) = sys.process(Pid::from_u32(process_id)) {
        proc.name().to_string_lossy().into_owned()
    } else {
        // This often happens for "System" processes or higher privilege if we can't read them.
        // println!("[{}] Unknown PID: {}", source, process_id);
        return;
    };

    log::info!(
        "[{}] Foreground Process: {} (PID: {})",
        source,
        process_name,
        process_id
    );

    // Access Global State
    let app_handle = unsafe {
        if let Some(ref h) = APP_HANDLE {
            h.clone()
        } else {
            return;
        }
    };

    // Load Config via Manager (Portable)
    let config = crate::config_manager::get_config(app_handle.clone());
    let profiles = config.automation.profiles; // HashMap<String, Resolution>

    // We need to iterate the hashmap.
    // Since we originally iterated a Vec and checked for name equality,
    // here matches are keys. We can just lookup?
    // Wait, users process names might be case insensitive or exact.
    // Let's iterate keys to find case-insensitive match.

    let state_arc = {
        let guard = STATE.lock().unwrap();
        guard.clone()
    };

    if let Some(state_arc) = state_arc {
        let mut state = state_arc.lock().unwrap();

        // Debug logging for rules
        log::info!(
            "[{}] Checking {} profiles against process '{}'",
            source,
            profiles.len(),
            process_name
        );

        // Check for match
        let mut matched_profile: Option<(String, Resolution)> = None;
        for (proc_name, res) in profiles {
            log::info!("  -> Checking profile: '{}'", proc_name);
            if process_name.eq_ignore_ascii_case(&proc_name) {
                matched_profile = Some((proc_name, res));
                break;
            }
        }

        if let Some((profile_name, profile_res)) = matched_profile {
            // We are inside a target process
            // 1. Cancel any pending revert
            let was_revert_pending = state.revert_pending.is_some();
            state.revert_pending = None;

            if state.active_process.as_deref() != Some(&profile_name) {
                // Different process matched - change resolution
                log::info!(
                    "[{}] MATCH! Changing resolution for: {}",
                    source,
                    profile_name
                );

                if state.original_resolution.is_none() {
                    if let Some(current) = get_current_resolution() {
                        state.original_resolution = Some(current.clone());
                        log::info!(
                            "Saved original: {}x{}@{}",
                            current.width,
                            current.height,
                            current.frequency
                        );
                    }
                }

                let target_res = profile_res.clone();

                if let Err(e) = change_resolution(target_res) {
                    log::error!("Failed to set resolution: {}", e);
                } else {
                    state.active_process = Some(profile_name.clone());
                    log::info!("Resolution Set!");

                    let _ = app_handle.emit("resolution-changed", serde_json::json!({
                        "process": profile_name,
                        "resolution": format!("{}x{}@{}Hz", profile_res.width, profile_res.height, profile_res.frequency),
                        "status": "changed"
                    }));
                }
            } else if was_revert_pending {
                // Same process - but we just cancelled a pending revert
                log::info!(
                    "[{}] Re-entered {}. Cancelled pending revert.",
                    source,
                    profile_name
                );
                let _ = app_handle.emit("resolution-changed", serde_json::json!({
                    "process": profile_name,
                    "resolution": format!("{}x{}@{}Hz", profile_res.width, profile_res.height, profile_res.frequency),
                    "status": "changed"
                }));
            }
        } else {
            // We are NOT in a target process
            // If we have an active process, we might need to revert
            if let Some(active) = &state.active_process {
                if state.revert_pending.is_none() {
                    let active_name = active.clone();
                    log::info!(
                        "[{}] Lost focus of {}. Starting revert timer (15s).",
                        source,
                        active_name
                    );
                    state.revert_pending = Some(Instant::now());

                    let _ = app_handle.emit(
                        "resolution-changed",
                        serde_json::json!({
                            "process": active_name,
                            "status": "revert-pending"
                        }),
                    );
                }
            }
        }
    }
}

pub fn start_monitor_hook(app: AppHandle) {
    unsafe {
        APP_HANDLE = Some(app.clone());
        *STATE.lock().unwrap() = Some(Arc::new(Mutex::new(MonitorState {
            original_resolution: None,
            active_process: None,
            revert_pending: None,
        })));
    }

    // Thread 1: Windows Event Hook (Instant)
    std::thread::spawn(|| {
        println!("Starting Event Hook Thread...");
        unsafe {
            let hook = SetWinEventHook(
                EVENT_SYSTEM_FOREGROUND,
                EVENT_SYSTEM_FOREGROUND,
                None,
                Some(win_event_hook),
                0,
                0,
                WINEVENT_OUTOFCONTEXT,
            );

            if hook.0.is_null() {
                eprintln!("Failed to set SetWinEventHook");
                return;
            }

            let mut msg = MSG::default();
            while GetMessageW(&mut msg, None, 0, 0).as_bool() {
                let _ = TranslateMessage(&msg);
                let _ = DispatchMessageW(&msg);
            }
        }
    });

    // Thread 2: Revert Timer Watcher (Checks every 1s)
    let app_handle_thread = app.clone();
    std::thread::spawn(move || {
        println!("Starting Revert Watcher Thread...");
        loop {
            std::thread::sleep(Duration::from_secs(1));

            // Check if we need to revert
            let state_arc = {
                let guard = STATE.lock().unwrap();
                guard.clone()
            };

            if let Some(state_arc) = state_arc {
                let mut state = state_arc.lock().unwrap();

                if let Some(pending_time) = state.revert_pending {
                    // Check config
                    let config = crate::config_manager::get_config(app_handle_thread.clone());
                    let delay_ms = config.automation.revert_delay;
                    let default_profile = config.automation.default_profile;

                    if pending_time.elapsed() > Duration::from_millis(delay_ms) {
                        if let Some(active) = &state.active_process {
                            log::info!("Revert timer expired for {}. Reverting now.", active);

                            // Prioritize Default Profile, then Original Resolution
                            let target = if let Some(def) = default_profile {
                                log::info!(
                                    "Using Default Profile resolution: {}x{}@{}",
                                    def.width,
                                    def.height,
                                    def.frequency
                                );
                                Some(def)
                            } else {
                                state.original_resolution.clone()
                            };

                            if let Some(res) = target {
                                if let Err(e) = change_resolution(res) {
                                    log::error!("Failed to revert: {}", e);
                                } else {
                                    log::info!("Reverted successfully.");
                                    let _ = app_handle_thread.emit(
                                        "resolution-changed",
                                        serde_json::json!({
                                                "status": "reverted"
                                        }),
                                    );
                                }
                            } else {
                                log::warn!("No resolution to revert to (no Default Profile and no Original saved).");
                            }

                            state.active_process = None;
                            state.original_resolution = None;
                        }
                        state.revert_pending = None;
                    }
                }
            }
        }
    });
}
