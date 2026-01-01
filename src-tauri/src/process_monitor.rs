use crate::resolution_manager::{change_resolution, get_current_resolution, Resolution};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use sysinfo::{Pid, ProcessesToUpdate, System};
use tauri::AppHandle;
use tauri::Emitter;
use windows::Win32::{
    Foundation::{HWND, RECT},
    UI::{
        Accessibility::{SetWinEventHook, HWINEVENTHOOK},
        // Input::KeyboardAndMouse::ClipCursor,
        WindowsAndMessaging::{
            ClipCursor, DispatchMessageW, GetMessageW, GetWindowRect, GetWindowThreadProcessId,
            IsIconic, TranslateMessage, EVENT_SYSTEM_FOREGROUND, MSG, WINEVENT_OUTOFCONTEXT,
        },
    },
};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessInfo {
    pub pid: u32,
    pub name: String,
    pub memory: u64,
}

// Global state for key monitoring data
struct MonitorState {
    original_resolution: Option<Resolution>,
    active_process: Option<String>, // Name of the process forcing the resolution
    revert_pending: Option<Instant>, // Time when revert was requested
    locked_window: Option<usize>,
    locked_window_padding: (u32, u32),
    locked_process: Option<String>,
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
        check_and_apply_window(hwnd, "Hook");
    }
}

// Shared logic for both Hook and Polling
fn check_and_apply_window(hwnd: HWND, source: &str) {
    if hwnd.0.is_null() {
        return;
    }

    unsafe {
        if IsIconic(hwnd).as_bool() {
            return;
        }
    }

    let mut process_id = 0;
    unsafe {
        GetWindowThreadProcessId(hwnd, Some(&mut process_id));
    }

    let mut sys = System::new();
    sys.refresh_processes(ProcessesToUpdate::All, true);

    let process_name = if let Some(proc) = sys.process(Pid::from_u32(process_id)) {
        proc.name().to_string_lossy().into_owned()
    } else {
        return;
    };

    log::info!(
        "[{}] Foreground Process: {} (PID: {})",
        source,
        process_name,
        process_id
    );

    let app_handle = unsafe {
        if let Some(ref h) = APP_HANDLE {
            h.clone()
        } else {
            return;
        }
    };

    // Load Config
    let config = crate::config_manager::get_config(app_handle.clone());
    let profiles = config.automation.auto_res.profiles; // Vec<ProfileConfig>
    let mouse_lock_list = config.automation.mouse_lock;

    let state_arc = {
        let guard = STATE.lock().unwrap();
        guard.clone()
    };

    if let Some(state_arc) = state_arc {
        let mut state = state_arc.lock().unwrap();

        // Check for Mouse Lock
        let mut should_lock_mouse = false;
        let mut padding = (0, 0);
        let proc_lower = process_name.to_lowercase();
        let proc_stem = std::path::Path::new(&process_name)
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or(&process_name)
            .to_lowercase();

        for lock_config in &mouse_lock_list {
            let target_lower = lock_config.process.to_lowercase();
            if proc_lower == target_lower || proc_stem == target_lower {
                should_lock_mouse = true;
                padding = (lock_config.padding_x, lock_config.padding_y);
                break;
            }
        }

        if should_lock_mouse {
            log::info!(
                "[{}] Locking mouse to: {} (Padding: {}x{})",
                source,
                process_name,
                padding.0,
                padding.1
            );
            unsafe {
                let mut rect = RECT::default();
                if GetWindowRect(hwnd, &mut rect).is_ok() {
                    rect.left += padding.0 as i32;
                    rect.top += padding.1 as i32;
                    rect.right -= padding.0 as i32;
                    rect.bottom -= padding.1 as i32;
                    let _ = ClipCursor(Some(&rect));
                    state.locked_window = Some(hwnd.0 as usize);
                    state.locked_window_padding = padding;

                    if state.locked_process.as_deref() != Some(&process_name) {
                        state.locked_process = Some(process_name.clone());
                        let _ = app_handle.emit(
                            "mouse-lock-changed",
                            serde_json::json!({
                                "process": process_name,
                                "status": "active"
                            }),
                        );
                    }
                }
            }
        } else {
            unsafe {
                let _ = ClipCursor(None);
            }
            state.locked_window = None;

            if state.locked_process.is_some() {
                state.locked_process = None;
                let _ = app_handle.emit(
                    "mouse-lock-changed",
                    serde_json::json!({
                        "status": "inactive"
                    }),
                );
            }
        }

        // Check for Resolution Profile
        let mut matched_profile: Option<(String, Resolution)> = None;

        for profile in profiles {
            let key = profile.process.clone();
            let key_lower = key.to_lowercase();

            // 1. Exact Match
            if proc_lower == key_lower {
                matched_profile = Some((key, profile.into()));
                break;
            }

            // 2. Stem Match
            if proc_stem == key_lower {
                matched_profile = Some((key, profile.into()));
                break;
            }
        }

        if let Some((profile_name, profile_res)) = matched_profile {
            // We are inside a target process
            let was_revert_pending = state.revert_pending.is_some();
            state.revert_pending = None;

            if state.active_process.as_deref() != Some(&profile_name) {
                log::info!(
                    "[{}] MATCH! Changing resolution for: {}",
                    source,
                    profile_name
                );

                if state.original_resolution.is_none() {
                    if let Some(current) = get_current_resolution() {
                        state.original_resolution = Some(current.clone());
                    }
                }

                if let Err(e) = change_resolution(profile_res.clone()) {
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
            // Not a target process
            if let Some(active) = &state.active_process {
                if state.revert_pending.is_none() {
                    let active_name = active.clone();
                    log::info!(
                        "[{}] Lost focus of {}. Starting revert timer.",
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
            locked_window: None,
            locked_window_padding: (0, 0),
            locked_process: None,
        })));
    }

    // Thread 1: Windows Event Hook
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

    // Thread 2: Revert Timer Watcher
    let app_handle_thread = app.clone();
    std::thread::spawn(move || {
        println!("Starting Revert Watcher Thread...");
        loop {
            std::thread::sleep(Duration::from_secs(1));

            let state_arc = {
                let guard = STATE.lock().unwrap();
                guard.clone()
            };

            if let Some(state_arc) = state_arc {
                let mut state = state_arc.lock().unwrap();

                if let Some(pending_time) = state.revert_pending {
                    let config = crate::config_manager::get_config(app_handle_thread.clone());
                    let delay_ms = config.automation.auto_res.revert_delay;
                    let default_profile = config.automation.auto_res.default_profile;

                    if pending_time.elapsed() > Duration::from_millis(delay_ms) {
                        if let Some(active) = &state.active_process {
                            log::info!("Revert timer expired for {}. Reverting now.", active);

                            let target = if let Some(def) = default_profile {
                                log::info!(
                                    "Using Default Profile: {}x{}@{}",
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
                                        serde_json::json!({ "status": "reverted" }),
                                    );
                                }
                            } else {
                                log::warn!("No resolution to revert to.");
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

    // Thread 3: Mouse Lock Enforcement (High Frequency)
    std::thread::spawn(move || {
        println!("Starting Mouse Lock Watcher Thread...");
        loop {
            std::thread::sleep(Duration::from_millis(20));

            let state_arc = {
                let guard = STATE.lock().unwrap();
                guard.clone()
            };

            if let Some(state_arc) = state_arc {
                let (target_hwnd, padding) = {
                    let state = state_arc.lock().unwrap();
                    (state.locked_window, state.locked_window_padding)
                };

                if let Some(hwnd_val) = target_hwnd {
                    let hwnd = HWND(hwnd_val as *mut _);
                    unsafe {
                        let mut rect = RECT::default();
                        if GetWindowRect(hwnd, &mut rect).is_ok() {
                            rect.left += padding.0 as i32;
                            rect.top += padding.1 as i32;
                            rect.right -= padding.0 as i32;
                            rect.bottom -= padding.1 as i32;
                            let _ = ClipCursor(Some(&rect));
                        }
                    }
                }
            }
        }
    });
}

pub fn force_revert() {
    let state_arc = {
        let guard = STATE.lock().unwrap();
        guard.clone()
    };

    if let Some(state_arc) = state_arc {
        let mut state = state_arc.lock().unwrap();
        if state.revert_pending.is_some() {
            // Set time to past to trigger immediate revert in watcher thread
            state.revert_pending = Some(Instant::now() - Duration::from_secs(3600));
            log::info!("Force revert requested. Timer expired manually.");
        }
    }
}
