import { createRootRoute, Link, Outlet } from '@tanstack/react-router'
import { ThemeProvider } from '../components/theme-provider'
import { buttonVariants, Button } from '../components/ui/button'
import { ScrollArea } from '../components/ui/scroll-area'
import { Settings2, Info, Monitor, SlidersHorizontal, MousePointer2 } from 'lucide-react'
import { cn } from '../lib/utils'
import { useEffect, useState } from 'react'
import { listen } from '@tauri-apps/api/event'
import { Tooltip, TooltipContent, TooltipTrigger } from '../components/ui/tooltip'
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover'
import { forceRevert } from '../lib/store'

export const Route = createRootRoute({
    component: RootComponent,
})

function ResolutionIndicator() {
    const [status, setStatus] = useState<{ process?: string, resolution?: string, status: string } | null>(null)
    const [showIndicator, setShowIndicator] = useState(false)
    const [isPopoverOpen, setIsPopoverOpen] = useState(false)

    useEffect(() => {
        const unlisten = listen('resolution-changed', (event: any) => {
            console.log("Resolution event:", event.payload)
            setStatus(event.payload)
            setShowIndicator(true)

            if (event.payload.status === 'reverted') {
                setTimeout(() => setShowIndicator(false), 3000)
            }
            // For 'revert-pending', we keep showing it until reverted or cancelled
        })

        return () => {
            unlisten.then(f => f())
        }
    }, [])

    if (!showIndicator || !status) return null

    return (
        <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
            <PopoverTrigger asChild>
                <div onClick={() => setIsPopoverOpen(!isPopoverOpen)} className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-all animate-in fade-in slide-in-from-top-2",
                    status.status === 'changed' ? "bg-primary/15 text-primary" : "bg-yellow-500/15 text-yellow-600 dark:text-yellow-500"
                )}>
                    <Info className="h-3.5 w-3.5" />
                    {status.status === 'changed' ? 'Resolution Active' : 'Revert Pending'}
                </div>
            </PopoverTrigger>
            <PopoverContent side="bottom" className="text-xs p-3 w-auto">
                <div className="space-y-2">
                    {status.process && <p><span className="font-semibold">Process:</span> {status.process}</p>}
                    {status.resolution && <p><span className="font-semibold">Target:</span> {status.resolution}</p>}
                    {status.status === 'revert-pending' && (
                        <div className="flex flex-col gap-2 pt-1">
                            <p className="italic text-muted-foreground">Will revert after delay</p>
                            <Button
                                variant="destructive"
                                size="sm"
                                className="h-7 text-xs w-full"
                                onClick={() => {
                                    forceRevert()
                                    setIsPopoverOpen(false)
                                }}
                            >
                                Revert Now
                            </Button>
                        </div>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    )
}

function MouseLockIndicator() {
    const [status, setStatus] = useState<{ process?: string, status: string } | null>(null)
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        const unlisten = listen('mouse-lock-changed', (event: any) => {
            console.log("Mouse Lock event:", event.payload)
            setStatus(event.payload)

            if (event.payload.status === 'active') {
                setVisible(true)
            } else {
                setTimeout(() => setVisible(false), 2000)
            }
        })

        return () => {
            unlisten.then(f => f())
        }
    }, [])

    if (!visible || !status || status.status !== 'active') return null

    return (
        <Tooltip>
            <TooltipTrigger>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium cursor-help transition-all animate-in fade-in slide-in-from-top-2 bg-green-500/15 text-green-600 dark:text-green-500">
                    <MousePointer2 className="h-3.5 w-3.5" />
                    Locked
                </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
                <div className="space-y-1">
                    {status.process && <p><span className="font-semibold">Process:</span> {status.process}</p>}
                    <p className="italic text-muted-foreground">Cursor confined to window</p>
                </div>
            </TooltipContent>
        </Tooltip>
    )
}

function RootComponent() {
    return (
        <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
            <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
                <header className="border-b bg-card p-2 flex items-center justify-between shrink-0">
                    <nav className="flex gap-2">
                        <Link
                            to="/res"
                            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "justify-start")}
                            activeProps={{ className: "bg-muted" }}
                        >
                            <Monitor className="mr-2 h-4 w-4" />
                            Res
                        </Link>
                        <Link
                            to="/mouse-lock"
                            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "justify-start")}
                            activeProps={{ className: "bg-muted" }}
                        >
                            <MousePointer2 className="mr-2 h-4 w-4" />
                            Mouse Lock
                        </Link>
                        <Link
                            to="/manual"
                            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "justify-start")}
                            activeProps={{ className: "bg-muted" }}
                        >
                            <SlidersHorizontal className="mr-2 h-4 w-4" />
                            Manual
                        </Link>
                        <Link
                            to="/settings"
                            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "justify-start")}
                            activeProps={{ className: "bg-muted" }}
                        >
                            <Settings2 className="mr-2 h-4 w-4" />
                            Settings
                        </Link>
                    </nav>

                    <div className="flex items-center gap-2">
                        <MouseLockIndicator />
                        <ResolutionIndicator />
                    </div>
                </header>

                <main className="flex-1 overflow-hidden">
                    <ScrollArea className="h-full">
                        <div className="p-4">
                            <Outlet />
                        </div>
                    </ScrollArea>
                </main>
            </div>
        </ThemeProvider>
    )
}
