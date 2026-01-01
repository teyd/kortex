import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { getConfig, saveConfig, fetchProcesses, getSupportedResolutions, type ResolutionProfile, type ProcessInfo, type Resolution } from '../lib/store'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
// import { Input } from '../components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { ProcessPicker } from '../components/process-picker'
import { ResolutionPicker } from '../components/resolution-picker'
import { Plus, Trash2, RefreshCw, GripVertical } from 'lucide-react'
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from '@dnd-kit/core'
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import { Slider } from '../components/ui/slider'

export const Route = createFileRoute('/res')({
    component: ProfilesTab,
})

function SortableProfileItem({ profile, onDelete }: { profile: ResolutionProfile, onDelete: (name: string) => void }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: profile.processName })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="flex items-center justify-between p-3 border rounded-md mb-2 bg-card hover:bg-accent/50 transition-colors"
        >
            <div className="flex items-center gap-3">
                <div {...attributes} {...listeners} className="cursor-grab text-muted-foreground hover:text-foreground">
                    <GripVertical className="h-5 w-5" />
                </div>
                <div>
                    <div className="font-medium">{profile.processName}</div>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <div className="text-sm text-muted-foreground">
                    {profile.width} × {profile.height} @ {profile.frequency}Hz
                </div>
                <Button variant="ghost" size="sm" onClick={() => onDelete(profile.processName)} className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
        </div>
    )
}

function ProfilesTab() {
    const [profiles, setProfiles] = useState<ResolutionProfile[]>([])
    const [processes, setProcesses] = useState<ProcessInfo[]>([])
    const [resolutions, setResolutions] = useState<Resolution[]>([])

    const [selectedProcess, setSelectedProcess] = useState('')
    const [resPickerValue, setResPickerValue] = useState<{ resolution: string; refreshRate: string } | null>(null)
    const [defaultProfileValue, setDefaultProfileValue] = useState<{ resolution: string; refreshRate: string } | null>(null)

    const [loading, setLoading] = useState(false)

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        setLoading(true)
        try {
            const config = await getConfig()

            // Already an array now
            const profileList: ResolutionProfile[] = config.automation.autoRes.profiles.map(p => ({
                processName: p.process, // Mapped from process -> processName for local usage
                width: p.width,
                height: p.height,
                frequency: p.frequency
            }))

            setProfiles(profileList)

            if (config.automation.autoRes.defaultProfile) {
                const def = config.automation.autoRes.defaultProfile
                setDefaultProfileValue({
                    resolution: `${def.width}x${def.height}`,
                    refreshRate: def.frequency.toString()
                })
            }

            const ms = config.automation.autoRes.revertDelay || 15000
            // Default behavior simplified: only support s/m for editing, but respect raw ms loading
            if (ms >= 60000 && ms % 60000 === 0) {
                setRevertUnit("m")
                setRevertValue(ms / 60000)
            } else {
                setRevertUnit("s")
                setRevertValue(Math.floor(ms / 1000))
            }

            await refreshProcesses()

            const resList = await getSupportedResolutions()
            setResolutions(resList)
        } catch (e) {
            console.error("Failed to load profiles data", e)
        } finally {
            setLoading(false)
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

    const handleAddProfile = async () => {
        if (!selectedProcess || !resPickerValue) return

        const [w, h] = resPickerValue.resolution.split('x').map(Number)
        const freq = parseInt(resPickerValue.refreshRate)

        const config = await getConfig();
        // Check if exists, replace or add
        const existingIdx = config.automation.autoRes.profiles.findIndex(p => p.process === selectedProcess);
        const newEntry = { process: selectedProcess, width: w, height: h, frequency: freq };

        if (existingIdx >= 0) {
            config.automation.autoRes.profiles[existingIdx] = newEntry;
        } else {
            config.automation.autoRes.profiles.push(newEntry);
        }

        await saveConfig(config)
        // Reload to sync state exactly
        await loadData(); // Simplified state sync

        setSelectedProcess('')
        setResPickerValue(null)
    }

    const handleDeleteProfile = async (processName: string) => {
        const config = await getConfig();
        config.automation.autoRes.profiles = config.automation.autoRes.profiles.filter(p => p.process !== processName);
        await saveConfig(config)

        await loadData();
    }

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event

        if (active.id !== over?.id) {
            setProfiles((items) => {
                const oldIndex = items.findIndex((item) => item.processName === active.id)
                const newIndex = items.findIndex((item) => item.processName === over?.id)
                const newItems = arrayMove(items, oldIndex, newIndex)

                // Persist new order!
                // We need to map back to config structure
                const saveOrder = async () => {
                    const config = await getConfig();
                    config.automation.autoRes.profiles = newItems.map(p => ({
                        process: p.processName,
                        width: p.width,
                        height: p.height,
                        frequency: p.frequency
                    }));
                    await saveConfig(config);
                };
                saveOrder();

                return newItems
            })
        }
    }

    const handleDefaultProfileChange = async (val: { resolution: string; refreshRate: string } | null) => {
        setDefaultProfileValue(val)
        const config = await getConfig()

        if (val) {
            const [w, h] = val.resolution.split('x').map(Number)
            const freq = parseInt(val.refreshRate)
            config.automation.autoRes.defaultProfile = { width: w, height: h, frequency: freq };
        } else {
            config.automation.autoRes.defaultProfile = undefined;
        }
        await saveConfig(config)
    }

    const [revertUnit, setRevertUnit] = useState<"s" | "m">("s")
    const [revertValue, setRevertValue] = useState(0)

    const updateRevertDelay = async (val: number, newUnit: "s" | "m") => {
        let multiplier = 1000
        if (newUnit === 'm') multiplier = 60000

        const totalMs = val * multiplier
        setRevertValue(val)
        setRevertUnit(newUnit)

        const config = await getConfig();
        config.automation.autoRes.revertDelay = totalMs;
        await saveConfig(config);
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Add New Profile</CardTitle>
                    <CardDescription>Select a running process to automate.</CardDescription>
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
                    <ResolutionPicker
                        resolutions={resolutions}
                        value={resPickerValue}
                        onChange={setResPickerValue}
                        placeholder="Select resolution..."
                        className="h-10 text-sm"
                    />
                    <Button onClick={handleAddProfile} disabled={!selectedProcess || !resPickerValue} className="w-[300px]">
                        <Plus className="mr-2 h-4 w-4" /> Add Profile
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div className="flex flex-col space-y-1.5">
                            <CardTitle>Active Profiles</CardTitle>
                            <CardDescription>
                                Priority is top to bottom. The first matching process determines the resolution.
                            </CardDescription>
                        </div>
                        <Button variant="ghost" size="sm" onClick={loadData} disabled={loading}>
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {profiles.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8">No profiles configured.</div>
                    ) : (
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext
                                items={profiles.map(p => p.processName)}
                                strategy={verticalListSortingStrategy}
                            >
                                <div className="space-y-1">
                                    {profiles.map((profile) => (
                                        <SortableProfileItem
                                            key={profile.processName}
                                            profile={profile}
                                            onDelete={handleDeleteProfile}
                                        />
                                    ))}
                                </div>
                            </SortableContext>
                        </DndContext>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Default Profile (Lowest Priority)</CardTitle>
                    <CardDescription>
                        System reverts to this resolution when no active processes are found.
                        If not set, it reverts to the resolution used before automation started.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Default Resolution</label>
                        <ResolutionPicker
                            resolutions={resolutions}
                            value={defaultProfileValue}
                            onChange={handleDefaultProfileChange}
                            placeholder="Use System Default (No Change)"
                            className="h-10 text-sm"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Revert Delay Section */}
            <Card className="mt-6">
                <CardHeader>
                    <CardTitle>Revert Delay</CardTitle>
                    <CardDescription>
                        Time to wait after closing a game before reverting resolution.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-muted-foreground">
                                Current Delay: <span className="text-foreground font-bold">{revertValue}</span> {revertUnit}
                            </span>
                        </div>
                        <div className="flex items-center gap-4">
                            <Slider
                                value={[revertValue]}
                                min={0}
                                max={60}
                                step={1}
                                onValueChange={(vals) => {
                                    const val = Array.isArray(vals) ? vals[0] : vals;
                                    updateRevertDelay(val, revertUnit)
                                }}
                                className="flex-1"
                            />
                            <Select value={revertUnit} onValueChange={(val) => val && updateRevertDelay(revertValue, val as "s" | "m")}>
                                <SelectTrigger className="w-[80px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="s">s</SelectItem>
                                    <SelectItem value="m">m</SelectItem>
                                </SelectContent>
                            </Select>
                        </div >
                    </div >
                </CardContent >
            </Card >
        </div >
    )
}
