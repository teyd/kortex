import { invoke } from '@tauri-apps/api/core';

export type Theme = "dark" | "light" | "system";

export interface Resolution {
    width: number;
    height: number;
    frequency: number;
}

export interface ResolutionProfile extends Resolution {
    processName: string;
}

// Matches the JSON from backend
export interface ProfileConfig {
    process: string;
    width: number;
    height: number;
    frequency: number;
}

export interface MouseLockItem {
    process: string;
    paddingX: number;
    paddingY: number;
}

export interface AutomationSettings {
    mouseLock: MouseLockItem[];
    autoRes: {
        revertDelay: number;
        defaultProfile?: Resolution;
        profiles: ProfileConfig[];
    };
}

export interface AppSettings {
    ui: {
        theme: "light" | "dark" | "system";
    };
    system: {
        autostart: boolean;
        startMinimized: boolean;
    };
    automation: AutomationSettings;
}

export const defaultSettings: AppSettings = {
    ui: { theme: 'system' },
    system: { autostart: false, startMinimized: false },
    automation: {
        mouseLock: [],
        autoRes: {
            revertDelay: 15000,
            profiles: []
        }
    }
}

export interface Config extends AppSettings { }

export async function getConfig(): Promise<Config> {
    return await invoke('get_config');
}

export async function saveConfig(config: Config): Promise<void> {
    return await invoke('save_config', { config });
}

export async function getProfilesList(): Promise<ResolutionProfile[]> {
    const config = await getConfig();
    // Map ProfileConfig (backend) to ResolutionProfile (frontend)
    const list = config.automation.autoRes.profiles || [];
    return list.map(p => ({
        processName: p.process,
        width: p.width,
        height: p.height,
        frequency: p.frequency
    }));
}

export interface ProcessInfo {
    pid: number;
    name: string;
    memory: number;
}

export async function fetchProcesses(): Promise<ProcessInfo[]> {
    return await invoke('fetch_processes');
}

export async function getSupportedResolutions(): Promise<Resolution[]> {
    return await invoke('get_resolutions');
}

export async function getCurrentResolution(): Promise<Resolution | null> {
    return await invoke('get_current_res');
}

export async function setResolution(width: number, height: number, frequency: number): Promise<void> {
    return await invoke('set_resolution', { width, height, frequency });
}

export async function openConfigFolder() {
    return await invoke('open_config_folder');
}


export async function getAppVersion(): Promise<string> {
    return await invoke('get_app_version');
}

export async function forceRevert(): Promise<void> {
    return await invoke('force_revert');
}
