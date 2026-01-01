"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import type { ProcessInfo } from "@/lib/store"

interface ProcessPickerProps {
    processes: ProcessInfo[]
    value: string
    onChange: (value: string) => void
    onRefresh?: () => void
    placeholder?: string
    className?: string
}

export function ProcessPicker({
    processes,
    value,
    onChange,
    onRefresh,
    placeholder = "Select process...",
    className,
}: ProcessPickerProps) {
    const [open, setOpen] = React.useState(false)

    return (
        <Popover open={open} onOpenChange={(isOpen) => {
            setOpen(isOpen)
            if (isOpen && onRefresh) {
                onRefresh()
            }
        }}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn("w-full justify-between h-10 font-normal", className)}
                >
                    {value ? value : <span className="text-muted-foreground">{placeholder}</span>}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[450px] p-0" align="start">
                <Command>
                    <CommandInput placeholder="Search process..." />
                    <CommandList>
                        <CommandEmpty>No process found.</CommandEmpty>
                        <CommandGroup>
                            {processes.map((process) => (
                                <CommandItem
                                    key={process.pid + process.name}
                                    value={process.name}
                                    onSelect={(currentValue) => {
                                        onChange(currentValue)
                                        setOpen(false)
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === process.name ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    <div className="flex flex-1 justify-between items-center">
                                        <span>{process.name}</span>
                                        <span className="text-xs text-muted-foreground font-mono">
                                            {(process.memory / 1024 / 1024).toFixed(0)} MB
                                        </span>
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
