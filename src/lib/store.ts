import { load } from '@tauri-apps/plugin-store';

export type Theme = "dark" | "light" | "system";

export interface AppSettings {
    theme: Theme;
    autostart: boolean;
}

const STORE_PATH = 'config.json';

export async function getStore() {
    return await load(STORE_PATH, { autoSave: true, defaults: {} });
}

export async function getSettings(): Promise<AppSettings> {
    const store = await getStore();
    const theme = await store.get<Theme>('theme');
    const autostart = await store.get<boolean>('autostart');

    return {
        theme: theme ?? 'system',
        autostart: autostart ?? false
    };
}

export async function saveSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    const store = await getStore();
    await store.set(key, value);
    await store.save();
}
