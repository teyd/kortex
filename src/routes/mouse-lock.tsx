
import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { getConfig, saveConfig, fetchProcesses, type ProcessInfo } from '../lib/store'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { ProcessPicker } from '../components/process-picker'
import { Plus, Trash2, MousePointer2 } from 'lucide-react'
import { Slider } from '../components/ui/slider'
import { Badge } from '../components/ui/badge'

export const Route = createFileRoute('/mouse-lock')({
    component: MouseLockTab,
})

interface MouseLockItem {
    process: string
    paddingX: number
    paddingY: number
}

function MouseLockTab() {
    const [mouseLockList, setMouseLockList] = useState<MouseLockItem[]>([])
    const [processes, setProcesses] = useState<ProcessInfo[]>([])
    const [selectedProcess, setSelectedProcess] = useState('')
    const [newPaddingX, setNewPaddingX] = useState(0)
    const [newPaddingY, setNewPaddingY] = useState(0)

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        try {
            const config = await getConfig()
            // Ensure array exists
            const list = config.automation.mouseLock || []
            setMouseLockList(list)

            await refreshProcesses()
        } catch (e) {
            console.error("Failed to load mouse lock data", e)
        }
    }

    const refreshProcesses = async () => {
        try {
            const procs = await fetchProcesses()
            const uniqueProcs = Array.from(new Map(procs.map(p => [p.name, p])).values())
            setProcesses(uniqueProcs)
        } catch (e) {
            console.error("Failed to fetch processes", e)
        }
    }

    const handleAdd = async () => {
        if (!selectedProcess) return
        if (mouseLockList.some(p => p.process === selectedProcess)) {
            setSelectedProcess('')
            // Reset sliders
            setNewPaddingX(0)
            setNewPaddingY(0)
            return
        }

        const newList = [...mouseLockList, {
            process: selectedProcess,
            paddingX: newPaddingX,
            paddingY: newPaddingY
        }]
        setMouseLockList(newList)

        const config = await getConfig()
        config.automation.mouseLock = newList
        await saveConfig(config)

        setSelectedProcess('')
        setNewPaddingX(0)
        setNewPaddingY(0)
    }

    const handleDelete = async (procName: string) => {
        const newList = mouseLockList.filter(p => p.process !== procName)
        setMouseLockList(newList)

        const config = await getConfig()
        config.automation.mouseLock = newList
        await saveConfig(config)
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Add Process to Mouse Lock</CardTitle>
                    <CardDescription>
                        Select a process and configure padding. When this window is focused, the cursor will be confined to its boundaries minus the padding.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 flex flex-col">
                    <ProcessPicker
                        processes={processes}
                        value={selectedProcess}
                        onChange={setSelectedProcess}
                        onRefresh={refreshProcesses}
                        placeholder="Select a process..."
                        className="h-10 text-sm"
                    />

                    <div className={selectedProcess ? "opacity-100 transition-opacity" : "opacity-50 pointer-events-none"}>
                        <div className="grid grid-cols-1 gap-6 px-2">
                            <div className="space-y-4">
                                <div className="flex justify-between items-center text-sm font-medium">
                                    <span>Horizontal Padding (X)</span>
                                    <Badge variant="outline">{newPaddingX}px</Badge>
                                </div>
                                <Slider
                                    min={0}
                                    max={50}
                                    step={1}
                                    value={[newPaddingX]}
                                    onValueChange={(val) => setNewPaddingX(Array.isArray(val) ? val[0] : val)}
                                    disabled={!selectedProcess}
                                />
                            </div>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center text-sm font-medium">
                                    <span>Vertical Padding (Y)</span>
                                    <Badge variant="outline">{newPaddingY}px</Badge>
                                </div>
                                <Slider
                                    min={0}
                                    max={50}
                                    step={1}
                                    value={[newPaddingY]}
                                    onValueChange={(val) => setNewPaddingY(Array.isArray(val) ? val[0] : val)}
                                    disabled={!selectedProcess}
                                />
                            </div>
                        </div>
                    </div>

                    <Button onClick={handleAdd} disabled={!selectedProcess} className="w-[300px]">
                        <Plus className="mr-2 h-4 w-4" /> Add to Lock List
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Locked Processes</CardTitle>
                    <CardDescription>
                        Cursor locks automatically when these windows are in focus.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {mouseLockList.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8">No processes configured.</div>
                    ) : (
                        <div className="space-y-4">
                            {mouseLockList.map((item) => (
                                <div
                                    key={item.process}
                                    className="p-4 border rounded-md bg-card hover:bg-accent/10 transition-colors flex items-center justify-between"
                                >
                                    <div className="flex items-center gap-4">
                                        <MousePointer2 className="h-5 w-5 text-muted-foreground" />
                                        <div className="flex flex-col">
                                            <span className="font-medium">{item.process}</span>
                                            <span className="text-xs text-muted-foreground flex gap-2">
                                                <span>X: {item.paddingX}px</span>
                                                <span>Y: {item.paddingY}px</span>
                                            </span>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDelete(item.process)}
                                        className="text-destructive hover:text-destructive"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

        </div>
    )
}
