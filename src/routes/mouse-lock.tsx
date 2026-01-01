
import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { getConfig, saveConfig, fetchProcesses, type ProcessInfo } from '../lib/store'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { ProcessPicker } from '../components/process-picker'
import { Plus, Trash2, MousePointer2 } from 'lucide-react'

export const Route = createFileRoute('/mouse-lock')({
    component: MouseLockTab,
})

function MouseLockTab() {
    const [mouseLockList, setMouseLockList] = useState<string[]>([])
    const [processes, setProcesses] = useState<ProcessInfo[]>([])
    const [selectedProcess, setSelectedProcess] = useState('')

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        try {
            const config = await getConfig()
            // Ensure array exists (backward compatibility)
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
        if (mouseLockList.includes(selectedProcess)) {
            setSelectedProcess('')
            return
        }

        const newList = [...mouseLockList, selectedProcess]
        setMouseLockList(newList)

        const config = await getConfig()
        config.automation.mouseLock = newList
        await saveConfig(config)

        setSelectedProcess('')
    }

    const handleDelete = async (procName: string) => {
        const newList = mouseLockList.filter(p => p !== procName)
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
                        Select a process. When this window is focused, the cursor will be confined to its boundaries.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 flex flex-col">
                    <ProcessPicker
                        processes={processes}
                        value={selectedProcess}
                        onChange={setSelectedProcess}
                        onRefresh={refreshProcesses}
                        placeholder="Select a process..."
                        className="h-10 text-sm"
                    />
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
                        <div className="space-y-2">
                            {mouseLockList.map((proc) => (
                                <div
                                    key={proc}
                                    className="flex items-center justify-between p-3 border rounded-md bg-card hover:bg-accent/50 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <MousePointer2 className="h-5 w-5 text-muted-foreground" />
                                        <span className="font-medium">{proc}</span>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDelete(proc)}
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
