import { createRootRoute, Link, Outlet } from '@tanstack/react-router'
import { ThemeProvider } from '../components/theme-provider'
import { buttonVariants } from '../components/ui/button'
import { ScrollArea } from '../components/ui/scroll-area'
import { List, Settings2, Gamepad2, Info } from 'lucide-react'
import { cn } from '../lib/utils'
import { useEffect, useState } from 'react'
import { listen } from '@tauri-apps/api/event'
import { Tooltip, TooltipContent, TooltipTrigger } from '../components/ui/tooltip'

export const Route = createRootRoute({
    component: RootComponent,
})

function ResolutionIndicator() {
    const [status, setStatus] = useState<{ process?: string, resolution?: string, status: string } | null>(null)
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        const unlisten = listen('resolution-changed', (event: any) => {
            console.log("Resolution event:", event.payload)
            setStatus(event.payload)
            setVisible(true)

            if (event.payload.status === 'reverted') {
                setTimeout(() => setVisible(false), 3000)
            }
        })

        return () => {
            unlisten.then(f => f())
        }
    }, [])

    if (!visible || !status) return null

    return (
        <Tooltip>
            <TooltipTrigger>
                <div className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium cursor-help transition-all animate-in fade-in slide-in-from-top-2",
                    status.status === 'changed' ? "bg-primary/15 text-primary" : "bg-yellow-500/15 text-yellow-600 dark:text-yellow-500"
                )}>
                    <Info className="h-3.5 w-3.5" />
                    {status.status === 'changed' ? 'Resolution Active' : 'Revert Pending'}
                </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
                <div className="space-y-1">
                    {status.process && <p><span className="font-semibold">Process:</span> {status.process}</p>}
                    {status.resolution && <p><span className="font-semibold">Target:</span> {status.resolution}</p>}
                    {status.status === 'revert-pending' && <p className="italic text-muted-foreground">Will revert after delay</p>}
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
                            to="/profiles"
                            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "justify-start")}
                            activeProps={{ className: "bg-muted" }}
                        >
                            <List className="mr-2 h-4 w-4" />
                            Profiles
                        </Link>
                        <Link
                            to="/settings"
                            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "justify-start")}
                            activeProps={{ className: "bg-muted" }}
                        >
                            <Settings2 className="mr-2 h-4 w-4" />
                            Settings
                        </Link>
                        <Link
                            to="/manual"
                            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "justify-start")}
                            activeProps={{ className: "bg-muted" }}
                        >
                            <Gamepad2 className="mr-2 h-4 w-4" />
                            Manual
                        </Link>
                        <Link
                            to="/mouse-lock"
                            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "justify-start")}
                            activeProps={{ className: "bg-muted" }}
                        >
                            <Gamepad2 className="mr-2 h-4 w-4" />
                            Mouse Lock
                        </Link>
                    </nav>

                    <ResolutionIndicator />
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
