import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { getSupportedResolutions, getCurrentResolution, setResolution, type Resolution } from '../lib/store'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { ResolutionPicker } from '../components/resolution-picker'
import { Monitor, RefreshCw, MonitorCheck } from 'lucide-react'

export const Route = createFileRoute('/')({
    component: Index,
})

function Index() {
    const [resolutions, setResolutions] = useState<Resolution[]>([])
    const [currentRes, setCurrentRes] = useState<Resolution | null>(null)
    const [pickerValue, setPickerValue] = useState<{ resolution: string; refreshRate: string } | null>(null)
    const [loading, setLoading] = useState(false)
    const [applying, setApplying] = useState(false)

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        setLoading(true)
        try {
            const resList = await getSupportedResolutions()
            setResolutions(resList)

            const current = await getCurrentResolution()
            setCurrentRes(current)

            if (current) {
                setPickerValue({
                    resolution: `${current.width}x${current.height}`,
                    refreshRate: current.frequency.toString()
                })
            }
        } catch (e) {
            console.error("Failed to load resolution data", e)
        } finally {
            setLoading(false)
        }
    }

    const handleApply = async () => {
        if (!pickerValue) return
        const [w, h] = pickerValue.resolution.split('x').map(Number)
        const freq = parseInt(pickerValue.refreshRate)

        setApplying(true)
        try {
            await setResolution(w, h, freq)
            const current = await getCurrentResolution()
            setCurrentRes(current)
        } catch (e) {
            console.error("Failed to set resolution", e)
        } finally {
            setApplying(false)
        }
    }

    const formatResDisplay = (r: Resolution) => `${r.width} × ${r.height} @ ${r.frequency}Hz`

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Monitor className="h-6 w-6 text-primary" />
                            <div>
                                <CardTitle>Current Resolution</CardTitle>
                                <CardDescription>
                                    {currentRes ? formatResDisplay(currentRes) : 'Loading...'}
                                </CardDescription>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={loadData} disabled={loading}>
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                </CardHeader>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Change Resolution</CardTitle>
                    <CardDescription>Select resolution and refresh rate.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 flex flex-col">
                    <ResolutionPicker
                        resolutions={resolutions}
                        value={pickerValue}
                        onChange={setPickerValue}
                        placeholder="Select resolution..."
                        className="h-10 text-sm"
                    />
                    <Button
                        onClick={handleApply}
                        disabled={!pickerValue || applying}
                        className="w-[300px] h-10 text-sm"
                    >
                        {applying ? (
                            <>
                                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                Applying...
                            </>
                        ) : (
                            <>
                                <MonitorCheck className="mr-2 h-4 w-4" />
                                Apply Resolution
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}
