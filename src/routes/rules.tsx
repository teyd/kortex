import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { getSettings, saveSetting, fetchProcesses, getSupportedResolutions, type ResolutionRule, type ProcessInfo, type Resolution } from '../lib/store'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
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

export const Route = createFileRoute('/rules')({
    component: RulesCallback,
})

function SortableRuleItem({ rule, onDelete }: { rule: ResolutionRule, onDelete: (name: string) => void }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: rule.processName })

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
                    <div className="font-medium">{rule.processName}</div>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <div className="text-sm text-muted-foreground">
                    {rule.width} × {rule.height} @ {rule.frequency}Hz
                </div>
                <Button variant="ghost" size="sm" onClick={() => onDelete(rule.processName)} className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
        </div>
    )
}

function RulesCallback() {
    const [rules, setRules] = useState<ResolutionRule[]>([])
    const [processes, setProcesses] = useState<ProcessInfo[]>([])
    const [resolutions, setResolutions] = useState<Resolution[]>([])

    const [selectedProcess, setSelectedProcess] = useState('')
    const [resPickerValue, setResPickerValue] = useState<{ resolution: string; refreshRate: string } | null>(null)

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
            setRules(settings.rules)

            const procs = await fetchProcesses()
            const uniqueProcs = Array.from(new Map(procs.map(p => [p.name, p])).values())
            uniqueProcs.sort((a, b) => a.name.localeCompare(b.name))
            setProcesses(uniqueProcs)

            const resList = await getSupportedResolutions()
            setResolutions(resList)
        } catch (e) {
            console.error("Failed to load rules data", e)
        } finally {
            setLoading(false)
        }
    }

    const handleAddRule = async () => {
        if (!selectedProcess || !resPickerValue) return

        const [w, h] = resPickerValue.resolution.split('x').map(Number)
        const freq = parseInt(resPickerValue.refreshRate)

        const newRule: ResolutionRule = {
            processName: selectedProcess,
            width: w,
            height: h,
            frequency: freq
        }

        const updatedRules = [...rules.filter(r => r.processName !== selectedProcess), newRule]
        setRules(updatedRules)
        await saveSetting('rules', updatedRules)

        setSelectedProcess('')
        setResPickerValue(null)
    }

    const handleDeleteRule = async (processName: string) => {
        const updatedRules = rules.filter(r => r.processName !== processName)
        setRules(updatedRules)
        await saveSetting('rules', updatedRules)
    }

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event

        if (active.id !== over?.id) {
            setRules((items) => {
                const oldIndex = items.findIndex((item) => item.processName === active.id)
                const newIndex = items.findIndex((item) => item.processName === over?.id)
                const newOrder = arrayMove(items, oldIndex, newIndex)

                // Save immediately
                saveSetting('rules', newOrder)
                return newOrder
            })
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Resolution Rules</h2>
                <p className="text-muted-foreground">Manage automatic resolution changes. Priority is top-to-bottom.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Add New Rule</CardTitle>
                    <CardDescription>Select a running process and target resolution.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Process</label>
                        <Select value={selectedProcess} onValueChange={setSelectedProcess}>
                            <SelectTrigger className="h-12 text-base">
                                <SelectValue placeholder="Select a process..." />
                            </SelectTrigger>
                            <SelectContent side="bottom" className="max-h-[300px]">
                                {processes.map((p) => (
                                    <SelectItem key={p.name} value={p.name} className="py-2">
                                        {p.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Resolution & Refresh Rate</label>
                        <ResolutionPicker
                            resolutions={resolutions}
                            value={resPickerValue}
                            onChange={setResPickerValue}
                            placeholder="Select resolution..."
                        />
                    </div>

                    <Button onClick={handleAddRule} disabled={!selectedProcess || !resPickerValue} className="w-full">
                        <Plus className="mr-2 h-4 w-4" /> Add Rule
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Active Rules</CardTitle>
                        <Button variant="ghost" size="sm" onClick={loadData} disabled={loading}>
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {rules.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8">No rules configured.</div>
                    ) : (
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext
                                items={rules.map(r => r.processName)}
                                strategy={verticalListSortingStrategy}
                            >
                                <div className="space-y-1">
                                    {rules.map((rule) => (
                                        <SortableRuleItem
                                            key={rule.processName}
                                            rule={rule}
                                            onDelete={handleDeleteRule}
                                        />
                                    ))}
                                </div>
                            </SortableContext>
                        </DndContext>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

