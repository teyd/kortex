import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { getSettings, saveSetting, fetchProcesses, getSupportedResolutions, type ResolutionProfile, type ProcessInfo, type Resolution } from '../lib/store'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
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

export const Route = createFileRoute('/profiles')({
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
            const settings = await getSettings()
            setProfiles(settings.profiles)

            if (settings.automation.defaultProfile) {
                const def = settings.automation.defaultProfile
                setDefaultProfileValue({
                    resolution: `${def.width}x${def.height}`,
                    refreshRate: def.frequency.toString()
                })
            }

            const procs = await fetchProcesses()
            const uniqueProcs = Array.from(new Map(procs.map(p => [p.name, p])).values())
            // uniqueProcs.sort((a, b) => a.name.localeCompare(b.name)) // Correctly using memory sort from backend now
            setProcesses(uniqueProcs)

            const resList = await getSupportedResolutions()
            setResolutions(resList)
        } catch (e) {
            console.error("Failed to load profiles data", e)
        } finally {
            setLoading(false)
        }
    }

    const handleAddProfile = async () => {
        if (!selectedProcess || !resPickerValue) return

        const [w, h] = resPickerValue.resolution.split('x').map(Number)
        const freq = parseInt(resPickerValue.refreshRate)

        const newProfile: ResolutionProfile = {
            processName: selectedProcess,
            width: w,
            height: h,
            frequency: freq
        }

        const updatedProfiles = [...profiles.filter(p => p.processName !== selectedProcess), newProfile]
        setProfiles(updatedProfiles)
        await saveSetting('profiles', updatedProfiles)

        setSelectedProcess('')
        setResPickerValue(null)
    }

    const handleDeleteProfile = async (processName: string) => {
        const updatedProfiles = profiles.filter(p => p.processName !== processName)
        setProfiles(updatedProfiles)
        await saveSetting('profiles', updatedProfiles)
    }

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event

        if (active.id !== over?.id) {
            setProfiles((items) => {
                const oldIndex = items.findIndex((item) => item.processName === active.id)
                const newIndex = items.findIndex((item) => item.processName === over?.id)
                const newOrder = arrayMove(items, oldIndex, newIndex)

                // Save immediately
                saveSetting('profiles', newOrder)
                return newOrder
            })
        }
    }

    const handleDefaultProfileChange = async (val: { resolution: string; refreshRate: string } | null) => {
        setDefaultProfileValue(val)
        const settings = await getSettings()

        if (val) {
            const [w, h] = val.resolution.split('x').map(Number)
            const freq = parseInt(val.refreshRate)
            await saveSetting('automation', {
                ...settings.automation,
                defaultProfile: { width: w, height: h, frequency: freq }
            })
        } else {
            // Handle clearing default profile if needed, though usually valid selection is enforced or we can allow nullable
            await saveSetting('automation', {
                ...settings.automation,
                defaultProfile: undefined
            })
        }
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

            <Card className="border-muted-foreground/20 bg-muted/10">
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
                        />
                    </div>
                </CardContent>
            </Card>
        </div >
    )
}
