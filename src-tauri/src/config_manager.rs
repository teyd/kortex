use log;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Manager};

use crate::resolution_manager::Resolution;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UiConfig {
    pub theme: String, // "system", "dark", "light"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemConfig {
    pub autostart: bool,
    #[serde(rename = "startMinimized")]
    pub start_minimized: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MouseLockConfig {
    pub process: String,
    pub padding_x: u32,
    pub padding_y: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProfileConfig {
    pub process: String,
    pub width: u32,
    pub height: u32,
    pub frequency: u32,
}

impl From<ProfileConfig> for Resolution {
    fn from(val: ProfileConfig) -> Self {
        Resolution {
            width: val.width,
            height: val.height,
            frequency: val.frequency,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AutoResConfig {
    pub revert_delay: u64,
    pub default_profile: Option<Resolution>,
    pub profiles: Vec<ProfileConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AutomationConfig {
    pub mouse_lock: Vec<MouseLockConfig>,
    pub auto_res: AutoResConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub ui: UiConfig,
    pub system: SystemConfig,
    pub automation: AutomationConfig,
}

impl Default for AppConfig {
    fn default() -> Self {
        AppConfig {
            ui: UiConfig {
                theme: "system".to_string(),
            },
            system: SystemConfig {
                autostart: false,
                start_minimized: false,
            },
            automation: AutomationConfig {
                mouse_lock: Vec::new(),
                auto_res: AutoResConfig {
                    revert_delay: 15000,
                    default_profile: None,
                    profiles: Vec::new(),
                },
            },
        }
    }
}

// Global in-memory cache to prevent constant disk reads
static CACHED_CONFIG: Mutex<Option<AppConfig>> = Mutex::new(None);

pub fn get_config_path(app: &AppHandle) -> PathBuf {
    app.path()
        .app_config_dir()
        .expect("failed to get app config dir")
        .join("config.json")
}

#[tauri::command]
pub fn get_config(app: AppHandle) -> AppConfig {
    // 1. Check in-memory cache
    if let Ok(guard) = CACHED_CONFIG.lock() {
        if let Some(ref config) = *guard {
            return config.clone();
        }
    }

    // 2. Read from disk if not cached
    let path = get_config_path(&app);
    let config = if path.exists() {
        if let Ok(content) = fs::read_to_string(&path) {
            match serde_json::from_str::<AppConfig>(&content) {
                Ok(c) => c,
                Err(e) => {
                    log::error!("Failed to parse config.json: {}", e);
                    AppConfig::default()
                }
            }
        } else {
            AppConfig::default()
        }
    } else {
        AppConfig::default()
    };

    // 3. Update cache
    if let Ok(mut guard) = CACHED_CONFIG.lock() {
        *guard = Some(config.clone());
    }

    config
}

#[tauri::command]
pub fn save_config(app: AppHandle, config: AppConfig) -> Result<(), String> {
    // 1. Update in-memory cache immediately
    if let Ok(mut guard) = CACHED_CONFIG.lock() {
        *guard = Some(config.clone());
    }

    // 2. Persist to disk
    let path = get_config_path(&app);
    if let Some(parent) = path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    let json = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
    fs::write(path, json).map_err(|e| e.to_string())?;
    Ok(())
}
