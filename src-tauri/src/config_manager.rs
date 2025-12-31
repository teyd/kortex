use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};

use crate::resolution_manager::Resolution;

// Shared Resolution struct is imported from resolution_manager

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
pub struct AutomationConfig {
    #[serde(rename = "revertDelay")]
    pub revert_delay: u64,
    #[serde(rename = "defaultProfile")]
    pub default_profile: Option<Resolution>,
    pub profiles: HashMap<String, Resolution>,
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
                revert_delay: 15000,
                default_profile: None,
                profiles: HashMap::new(),
            },
        }
    }
}

pub fn get_config_path(app: &AppHandle) -> PathBuf {
    app.path()
        .app_config_dir()
        .expect("failed to get app config dir")
        .join("config.json")
}

#[tauri::command]
pub fn get_config(app: AppHandle) -> AppConfig {
    let path = get_config_path(&app);
    if path.exists() {
        if let Ok(content) = fs::read_to_string(&path) {
            if let Ok(config) = serde_json::from_str(&content) {
                return config;
            }
        }
    }
    // Return default if file missing or corrupt
    AppConfig::default()
}

#[tauri::command]
pub fn save_config(app: AppHandle, config: AppConfig) -> Result<(), String> {
    let path = get_config_path(&app);
    if let Some(parent) = path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    let json = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
    fs::write(path, json).map_err(|e| e.to_string())?;
    Ok(())
}
