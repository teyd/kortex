import { invoke } from '@tauri-apps/api/core';

export type Theme = "dark" | "light" | "system";

export interface Resolution {
    width: number;
    height: number;
    frequency: number;
}

export interface Config {
    ui: {
        theme: Theme;
    };
    system: {
        autostart: boolean;
        startMinimized: boolean;
    };
    automation: {
        revertDelay: number;
        defaultProfile?: Resolution;
        mouseLock: string[];
        profiles: Record<string, Resolution>;
    };
}

export async function getConfig(): Promise<Config> {
    return await invoke('get_config');
}

export async function saveConfig(config: Config): Promise<void> {
    return await invoke('save_config', { config });
}

// Helper to keep compatibility with UI components that expect an array
export interface ResolutionProfile extends Resolution {
    processName: string;
}

export async function getProfilesList(): Promise<ResolutionProfile[]> {
    const config = await getConfig();
    const profiles = config.automation?.profiles || {};
    return Object.entries(profiles).map(([name, res]) => ({
        processName: name,
        width: res.width,
        height: res.height,
        frequency: res.frequency
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
