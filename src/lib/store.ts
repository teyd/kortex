import { load } from '@tauri-apps/plugin-store';
import { invoke } from '@tauri-apps/api/core';

export type Theme = "dark" | "light" | "system";

export interface ResolutionRule {
    processName: string;
    width: number;
    height: number;
    frequency: number;
}

export interface AppSettings {
    theme: Theme;
    autostart: boolean;
    startMinimized: boolean;
    rules: ResolutionRule[];
    revertDelay: number;
}

const STORE_PATH = 'config.json';

export async function getStore() {
    return await load(STORE_PATH, { autoSave: true, defaults: {} });
}

export async function getSettings(): Promise<AppSettings> {
    const store = await getStore();
    const theme = await store.get<Theme>('theme');
    const autostart = await store.get<boolean>('autostart');
    const startMinimized = await store.get<boolean>('startMinimized');
    const rules = await store.get<ResolutionRule[]>('rules');
    const revertDelay = await store.get<number>('revertDelay');

    return {
        theme: theme ?? 'system',
        autostart: autostart ?? false,
        startMinimized: startMinimized ?? false,
        rules: rules ?? [],
        revertDelay: revertDelay ?? 15
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
