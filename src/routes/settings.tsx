import { createFileRoute } from '@tanstack/react-router'
import { useTheme } from '../components/theme-provider'
import { saveSetting } from '../lib/store'
import { enable, disable, isEnabled } from '@tauri-apps/plugin-autostart'
import { useEffect, useState } from 'react'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select'
import { Label } from '../components/ui/label'

export const Route = createFileRoute('/settings')({
    component: Settings,
})

function Settings() {
    const { theme, setTheme } = useTheme()
    const [autostartEnabled, setAutostartEnabled] = useState(false)

    useEffect(() => {
        // Check autostart status
        // Note: This relies on the Tauri plugin functionality.
        // In dev mode in browser it might fail, so we wrap in try/catch or simple check.
        // However, since we are building a Tauri app, we assume we want to call it.
        // If it fails (e.g. not in Tauri), we just log it.
        isEnabled().then(setAutostartEnabled).catch(err => console.error("Autostart check failed:", err))
    }, [])

    const toggleAutostart = async (checked: boolean) => {
        try {
            if (checked) {
                await enable()
            } else {
                await disable()
            }
            setAutostartEnabled(checked)
            await saveSetting('autostart', checked)
        } catch (e) {
            console.error('Failed to toggle autostart', e)
            // Revert UI if failed
            // setAutostartEnabled(!checked)
        }
    }

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
                <p className="text-muted-foreground">Manage your application preferences.</p>
            </div>

            <div className="grid gap-6">
                <div className="grid grid-cols-1 gap-4 rounded-lg border p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label className="text-base">Appearance</Label>
                            <p className="text-sm text-muted-foreground">Customize the look and feel of the application.</p>
                        </div>
                        <div className="w-[180px]">
                            <Select value={theme} onValueChange={(val: any) => setTheme(val)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="light">Light</SelectItem>
                                    <SelectItem value="dark">Dark</SelectItem>
                                    <SelectItem value="system">System</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 rounded-lg border p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label htmlFor="autostart" className="text-base">Autostart</Label>
                            <p className="text-sm text-muted-foreground">Launch the application automatically when Windows starts.</p>
                        </div>
                        <div>
                            <input
                                type="checkbox"
                                id="autostart"
                                checked={autostartEnabled}
                                onChange={(e) => toggleAutostart(e.target.checked)}
                                className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
