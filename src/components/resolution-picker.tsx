import { useState, useMemo, useEffect } from 'react'
import { Button } from './ui/button'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import { ScrollArea } from './ui/scroll-area'
import { cn } from '../lib/utils'
import { ChevronsUpDown, Check } from 'lucide-react'
import type { Resolution } from '../lib/store'

interface ResolutionPickerProps {
    resolutions: Resolution[]
    value: { resolution: string; refreshRate: string } | null
    onChange: (value: { resolution: string; refreshRate: string }) => void
    placeholder?: string
    className?: string
}

export function ResolutionPicker({
    resolutions,
    value,
    onChange,
    placeholder = "Select resolution...",
    className,
}: ResolutionPickerProps) {
    const [open, setOpen] = useState(false)
    const [tempRes, setTempRes] = useState<string>('')
    const [tempRate, setTempRate] = useState<string>('')

    useEffect(() => {
        if (open) {
            setTempRes(value?.resolution ?? '')
            setTempRate(value?.refreshRate ?? '')
        }
    }, [open, value])

    const resolutionOptions = useMemo(() => {
        const unique = new Map<string, { w: number, h: number }>()
        resolutions.forEach(r => {
            const key = `${r.width}x${r.height}`
            if (!unique.has(key)) {
                unique.set(key, { w: r.width, h: r.height })
            }
        })
        return Array.from(unique.entries())
            .sort((a, b) => b[1].w - a[1].w || b[1].h - a[1].h)
            .map(([key, val]) => ({
                value: key,
                label: `${val.w} × ${val.h}`,
            }))
    }, [resolutions])

    const refreshRateOptions = useMemo(() => {
        if (!tempRes) return []
        const [w, h] = tempRes.split('x').map(Number)
        return resolutions
            .filter(r => r.width === w && r.height === h)
            .map(r => r.frequency)
            .filter((v, i, a) => a.indexOf(v) === i)
            .sort((a, b) => b - a)
            .map(rate => ({
                value: rate.toString(),
                label: `${rate} Hz`,
            }))
    }, [tempRes, resolutions])

    useEffect(() => {
        if (tempRes && refreshRateOptions.length > 0) {
            const validRates = refreshRateOptions.map(r => r.value)
            if (!validRates.includes(tempRate)) {
                setTempRate(refreshRateOptions[0].value)
            }
        }
    }, [tempRes, refreshRateOptions, tempRate])

    const handleOpenChange = (isOpen: boolean) => {
        if (!isOpen) {
            if (tempRes && tempRate) {
                onChange({ resolution: tempRes, refreshRate: tempRate })
            }
        }
        setOpen(isOpen)
    }

    const displayValue = value
        ? `${value.resolution.replace('x', ' × ')} @ ${value.refreshRate} Hz`
        : null

    return (
        <Popover open={open} onOpenChange={handleOpenChange}>
            <PopoverTrigger
                render={(props) => (
                    <Button
                        {...props}
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className={cn("w-full justify-between h-12 text-base font-normal", className)}
                    >
                        {displayValue ?? <span className="text-muted-foreground">{placeholder}</span>}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                )}
            />
            <PopoverContent
                className="w-[400px] p-0"
                align="start"
                side="bottom"
            >
                <div className="flex h-[300px] divide-x">
                    {/* Left: Resolutions */}
                    <div className="flex-1 flex flex-col">
                        <div className="p-2 text-xs font-medium text-muted-foreground uppercase tracking-wide border-b bg-popover">
                            Resolution
                        </div>
                        <ScrollArea className="h-[260px]">
                            <div className="p-1">
                                {resolutionOptions.map((opt) => (
                                    <button
                                        key={opt.value}
                                        onClick={() => setTempRes(opt.value)}
                                        className={cn(
                                            "w-full text-left px-3 py-2 rounded-sm text-sm hover:bg-accent transition-colors flex items-center justify-between",
                                            tempRes === opt.value && "bg-accent"
                                        )}
                                    >
                                        {opt.label}
                                        {tempRes === opt.value && <Check className="h-4 w-4" />}
                                    </button>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>

                    {/* Right: Refresh Rates */}
                    <div className="w-[120px] flex flex-col">
                        <div className="p-2 text-xs font-medium text-muted-foreground uppercase tracking-wide border-b bg-popover">
                            Refresh
                        </div>
                        <ScrollArea className="h-[260px]">
                            <div className="p-1">
                                {tempRes ? (
                                    refreshRateOptions.map((opt) => (
                                        <button
                                            key={opt.value}
                                            onClick={() => {
                                                setTempRate(opt.value)
                                                onChange({ resolution: tempRes, refreshRate: opt.value })
                                                setOpen(false)
                                            }}
                                            className={cn(
                                                "w-full text-left px-3 py-2 rounded-sm text-sm hover:bg-accent transition-colors flex items-center justify-between",
                                                tempRate === opt.value && "bg-accent"
                                            )}
                                        >
                                            {opt.label}
                                            {tempRate === opt.value && <Check className="h-4 w-4" />}
                                        </button>
                                    ))
                                ) : (
                                    <div className="p-3 text-xs text-muted-foreground text-center">
                                        Select resolution
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    )
}
