import { load } from '@tauri-apps/plugin-store';
import { invoke } from '@tauri-apps/api/core';

export type Theme = "dark" | "light" | "system";

export interface ResolutionProfile {
    processName: string;
    width: number;
    height: number;
    frequency: number;
}

export interface AppSettings {
    system: {
        theme: Theme;
        autostart: boolean;
        startMinimized: boolean;
    };
    automation: {
        revertDelay: number;
        defaultProfile?: Resolution;
    };
    profiles: ResolutionProfile[];
}

const STORE_PATH = 'config.json';

export async function getStore() {
    return await load(STORE_PATH, { autoSave: true, defaults: {} });
}

export async function getSettings(): Promise<AppSettings> {
    const store = await getStore();

    // Legacy migration check or default handling would go here, 
    // but we will assume clean state or overwrite for this overhaul.

    const system = await store.get<{ theme: Theme; autostart: boolean; startMinimized: boolean }>('system');
    const automation = await store.get<{ revertDelay: number; defaultProfile?: Resolution }>('automation');
    const profiles = await store.get<ResolutionProfile[]>('profiles');

    return {
        system: {
            theme: system?.theme ?? 'system',
            autostart: system?.autostart ?? false,
            startMinimized: system?.startMinimized ?? false
        },
        automation: {
            revertDelay: automation?.revertDelay ?? 15000,
            defaultProfile: automation?.defaultProfile
        },
        profiles: profiles ?? []
    };
}

export async function saveSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    const store = await getStore();
    await store.set(key, value);
    await store.save();
}

export interface ProcessInfo {
    pid: number;
    name: string;
    memory: number;
}

export interface Resolution {
    width: number;
    height: number;
    frequency: number;
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
