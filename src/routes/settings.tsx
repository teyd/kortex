import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useTheme } from '../components/theme-provider'
import { saveSetting, openConfigFolder, getSettings } from '../lib/store'
import { enable, disable, isEnabled } from '@tauri-apps/plugin-autostart'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select'
import { Label } from '../components/ui/label'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { FolderOpen } from 'lucide-react'

export const Route = createFileRoute('/settings')({
    component: SettingsTab,
})

function SettingsTab() {
    const { theme, setTheme } = useTheme()
    const [autostartEnabled, setAutostartEnabled] = useState(false)
    const [startMinimized, setStartMinimized] = useState(false)

    // Config state
    const [inputValue, setInputValue] = useState(15)
    const [unit, setUnit] = useState<"ms" | "s" | "m">("s")

    useEffect(() => {
        // Check autostart status
        isEnabled().then(setAutostartEnabled).catch(err => console.error("Autostart check failed:", err))

        // Load settings
        getSettings().then(s => {
            setStartMinimized(s.system.startMinimized)
            const ms = s.automation.revertDelay

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
            // Note: We need to save the whole system object if strict, but let's assume partial updates if store supports key path or we read-modify-write.
            // Simplified: read, modify, write system object.
            const current = await getSettings();
            await saveSetting('system', { ...current.system, autostart: checked })
        } catch (e) {
            console.error('Failed to toggle autostart', e)
        }
    }

    const toggleStartMinimized = async (checked: boolean) => {
        setStartMinimized(checked)
        const current = await getSettings();
        await saveSetting('system', { ...current.system, startMinimized: checked })
    }

    const updateTheme = async (val: "light" | "dark" | "system") => {
        setTheme(val)
        const current = await getSettings();
        await saveSetting('system', { ...current.system, theme: val })
    }

    const updateRevertDelay = async (val: number, newUnit: "ms" | "s" | "m") => {
        let multiplier = 1
        if (newUnit === 's') multiplier = 1000
        if (newUnit === 'm') multiplier = 60000

        const totalMs = val * multiplier
        setInputValue(val)
        setUnit(newUnit)

        const current = await getSettings();
        await saveSetting('automation', { ...current.automation, revertDelay: totalMs })
    }

    const handleValueChange = (valStr: string) => {
        const val = parseFloat(valStr)
        if (!isNaN(val) && val >= 0) {
            updateRevertDelay(val, unit)
        } else if (valStr === '') {
            setInputValue(0)
        }
    }

    const handleUnitChange = (newUnit: "ms" | "s" | "m") => {
        updateRevertDelay(inputValue, newUnit)
    }

    return (
        <div className="space-y-6">

            {/* Interface Section */}
            <Card>
                <CardHeader>
                    <CardTitle>Interface</CardTitle>
                    <CardDescription>Customize the look and feel.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label className="text-base">Theme</Label>
                            <p className="text-sm text-muted-foreground">Select your preferred color scheme.</p>
                        </div>
                        <div className="w-[180px]">
                            <Select value={theme} onValueChange={(val: any) => updateTheme(val)}>
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
                </CardContent>
            </Card>

            {/* System Section */}
            <Card>
                <CardHeader>
                    <CardTitle>System</CardTitle>
                    <CardDescription>Manage startup and application behavior.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label htmlFor="autostart" className="text-base">Autostart</Label>
                            <p className="text-sm text-muted-foreground">Launch automatically when Windows starts.</p>
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
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label htmlFor="startMin" className="text-base">Start Minimized</Label>
                            <p className="text-sm text-muted-foreground">Launch in the background (hidden).</p>
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
                </CardContent>
            </Card>

            {/* Automation Section */}
            <Card>
                <CardHeader>
                    <CardTitle>Automation</CardTitle>
                    <CardDescription>Configure how resolution changes are handled.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label htmlFor="revertDelay" className="text-base">Revert Delay</Label>
                            <p className="text-sm text-muted-foreground">Time to wait before reverting resolution.</p>
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
                </CardContent>
            </Card>

            {/* Data Section */}
            <Card>
                <CardHeader>
                    <CardTitle>Data</CardTitle>
                    <CardDescription>Access configuration files.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label className="text-base">Configuration Folder</Label>
                            <p className="text-sm text-muted-foreground">Open the folder containing config.json and logs.</p>
                        </div>
                        <Button variant="outline" onClick={openConfigFolder}>
                            <FolderOpen className="mr-2 h-4 w-4" /> Open Folder
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
