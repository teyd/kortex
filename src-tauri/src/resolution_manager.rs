use serde::{Deserialize, Serialize};
use windows::{
    core::PCWSTR,
    Win32::Graphics::Gdi::{
        ChangeDisplaySettingsW, EnumDisplaySettingsW, CDS_FULLSCREEN, DEVMODEW,
        DISP_CHANGE_SUCCESSFUL, ENUM_CURRENT_SETTINGS, ENUM_DISPLAY_SETTINGS_MODE,
    },
};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Resolution {
    pub width: u32,
    pub height: u32,
    pub frequency: u32,
}

pub fn get_supported_resolutions() -> Vec<Resolution> {
    let mut resolutions = Vec::new();
    let mut dev_mode = DEVMODEW::default();
    let mut mode_num = 0;

    unsafe {
        // ENUM_DISPLAY_SETTINGS_MODE is a newtype wrapper around u32 in newer windows-rs
        while EnumDisplaySettingsW(
            PCWSTR::null(),
            ENUM_DISPLAY_SETTINGS_MODE(mode_num),
            &mut dev_mode,
        )
        .as_bool()
        {
            let res = Resolution {
                width: dev_mode.dmPelsWidth,
                height: dev_mode.dmPelsHeight,
                frequency: dev_mode.dmDisplayFrequency,
            };

            // Basic filtering
            if !resolutions.contains(&res) {
                resolutions.push(res);
            }

            mode_num += 1;
        }
    }

    resolutions.sort_by(|a, b| {
        b.width
            .cmp(&a.width)
            .then(b.height.cmp(&a.height))
            .then(b.frequency.cmp(&a.frequency))
    });

    resolutions
}

pub fn get_current_resolution() -> Option<Resolution> {
    let mut dev_mode = DEVMODEW::default();
    unsafe {
        if EnumDisplaySettingsW(PCWSTR::null(), ENUM_CURRENT_SETTINGS, &mut dev_mode).as_bool() {
            Some(Resolution {
                width: dev_mode.dmPelsWidth,
                height: dev_mode.dmPelsHeight,
                frequency: dev_mode.dmDisplayFrequency,
            })
        } else {
            None
        }
    }
}

pub fn change_resolution(res: Resolution) -> Result<(), String> {
    let mut dev_mode = DEVMODEW::default();
    let mut found_mode = None;
    let mut mode_num = 0;

    unsafe {
        while EnumDisplaySettingsW(
            PCWSTR::null(),
            ENUM_DISPLAY_SETTINGS_MODE(mode_num),
            &mut dev_mode,
        )
        .as_bool()
        {
            if dev_mode.dmPelsWidth == res.width
                && dev_mode.dmPelsHeight == res.height
                && dev_mode.dmDisplayFrequency == res.frequency
            {
                found_mode = Some(dev_mode);
                break;
            }
            mode_num += 1;
        }

        if let Some(mut target_mode) = found_mode {
            let result = ChangeDisplaySettingsW(Some(&mut target_mode), CDS_FULLSCREEN);
            if result == DISP_CHANGE_SUCCESSFUL {
                Ok(())
            } else {
                Err(format!(
                    "ChangeDisplaySettings failed with code: {:?}",
                    result
                ))
            }
        } else {
            Err("Resolution not found in supported modes".to_string())
        }
    }
}
