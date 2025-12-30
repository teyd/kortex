import { createFileRoute } from '@tanstack/react-router'
import { useTheme } from '../components/theme-provider'
import { saveSetting, openConfigFolder, getSettings } from '../lib/store'
import { enable, disable, isEnabled } from '@tauri-apps/plugin-autostart'
import { useEffect, useState } from 'react'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select'
import { Label } from '../components/ui/label'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'

export const Route = createFileRoute('/settings')({
    component: Settings,
})

function Settings() {
    const { theme, setTheme } = useTheme()
    const [autostartEnabled, setAutostartEnabled] = useState(false)
    const [startMinimized, setStartMinimized] = useState(false)


    // State for local input management
    const [inputValue, setInputValue] = useState(15)
    const [unit, setUnit] = useState<"ms" | "s" | "m">("s")

    useEffect(() => {
        // Check autostart status
        isEnabled().then(setAutostartEnabled).catch(err => console.error("Autostart check failed:", err))

        // Load settings
        getSettings().then(s => {
            setStartMinimized(s.startMinimized)
            const ms = s.revertDelay ?? 15000


            // Set initial unit/value representation
            if (ms % 60000 === 0 && ms !== 0) {
                setUnit("m")
                setInputValue(ms / 60000)
            } else if (ms % 1000 === 0 && ms !== 0) {
                setUnit("s")
                setInputValue(ms / 1000)
            } else {
                setUnit("ms")
                setInputValue(ms)
            }
        })
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
        }
    }

    const toggleStartMinimized = async (checked: boolean) => {
        setStartMinimized(checked)
        await saveSetting('startMinimized', checked)
    }

    const updateRevertDelay = async (val: number, newUnit: "ms" | "s" | "m") => {
        let multiplier = 1
        if (newUnit === 's') multiplier = 1000
        if (newUnit === 'm') multiplier = 60000

        const totalMs = val * multiplier

        setInputValue(val)
        setUnit(newUnit)
        await saveSetting('revertDelay', totalMs)
    }

    const handleValueChange = (valStr: string) => {
        const val = parseFloat(valStr)
        if (!isNaN(val) && val >= 0) {
            updateRevertDelay(val, unit)
        } else if (valStr === '') {
            setInputValue(0) // or handle empty state better if needed
        }
    }

    const handleUnitChange = (newUnit: "ms" | "s" | "m") => {
        updateRevertDelay(inputValue, newUnit)
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

                <div className="grid grid-cols-1 gap-4 rounded-lg border p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label htmlFor="startMin" className="text-base">Start Minimized</Label>
                            <p className="text-sm text-muted-foreground">Launch the application in the background (hidden).</p>
                        </div>
                        <div>
                            <input
                                type="checkbox"
                                id="startMin"
                                checked={startMinimized}
                                onChange={(e) => toggleStartMinimized(e.target.checked)}
                                className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 rounded-lg border p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label htmlFor="revertDelay" className="text-base">Revert Delay</Label>
                            <p className="text-sm text-muted-foreground">Time to wait before reverting resolution after app switch.</p>
                        </div>
                        <div className="flex items-center gap-2 w-[220px]">
                            <Input
                                type="number"
                                min="0"
                                value={inputValue}
                                onChange={(e) => handleValueChange(e.target.value)}
                                className="w-[100px]"
                            />
                            <Select value={unit} onValueChange={(val: any) => handleUnitChange(val)}>
                                <SelectTrigger className="w-[110px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ms">Millis (ms)</SelectItem>
                                    <SelectItem value="s">Seconds (s)</SelectItem>
                                    <SelectItem value="m">Minutes (m)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 rounded-lg border p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label className="text-base">Data & Storage</Label>
                            <p className="text-sm text-muted-foreground">Access your configuration file manually.</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => openConfigFolder()}>Open Config Folder</Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
