import { createRootRoute, Link, Outlet } from '@tanstack/react-router'
import { ThemeProvider } from '../components/theme-provider'
import { buttonVariants } from '../components/ui/button'
import { List, Settings2, Gamepad2 } from 'lucide-react'
import { cn } from '../lib/utils'

export const Route = createRootRoute({
    component: RootComponent,
})

function RootComponent() {
    return (
        <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
            <div className="flex flex-col h-screen bg-background text-foreground">
                <header className="border-b bg-card p-2">
                    <nav className="flex gap-2">
                        <Link
                            to="/"
                            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "justify-start")}
                            activeProps={{ className: "bg-muted" }}
                        >
                            <Gamepad2 className="mr-2 h-4 w-4" />
                            Manual
                        </Link>
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
                    </nav>
                </header>

                <main className="flex-1 overflow-hidden">
                    <div className="h-full overflow-auto p-4">
                        <Outlet />
                    </div>
                </main>
                {/* <TanStackRouterDevtools /> */}
            </div>
        </ThemeProvider>
    )
}
