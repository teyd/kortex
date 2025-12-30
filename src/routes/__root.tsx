import { createRootRoute, Link, Outlet, useRouterState } from '@tanstack/react-router'
import { ThemeProvider } from '../components/theme-provider'
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs'
import { List, Settings2, Gamepad2 } from 'lucide-react'

export const Route = createRootRoute({
    component: RootComponent,
})

function RootComponent() {
    const router = useRouterState()
    const currentPath = router.location.pathname

    // Simple logic to determine active tab value based on path
    let activeTab = 'manual'
    if (currentPath.startsWith('/profiles')) activeTab = 'profiles'
    if (currentPath.startsWith('/settings')) activeTab = 'settings'

    return (
        <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
            <div className="flex flex-col h-screen bg-background text-foreground">
                <header className="border-b bg-card p-1">
                    <Tabs value={activeTab} className="w-full flex justify-start">
                        <TabsList className="h-9">
                            <TabsTrigger value="profiles" className="w-32 text-xs" asChild>
                                <Link to="/profiles" className="flex items-center justify-center w-full h-full">
                                    <List className="mr-2 h-3.5 w-3.5" /> Profiles
                                </Link>
                            </TabsTrigger>
                            <TabsTrigger value="settings" className="w-32 text-xs" asChild>
                                <Link to="/settings" className="flex items-center justify-center w-full h-full">
                                    <Settings2 className="mr-2 h-3.5 w-3.5" /> Settings
                                </Link>
                            </TabsTrigger>
                            <TabsTrigger value="manual" className="w-32 text-xs" asChild>
                                <Link to="/" className="flex items-center justify-center w-full h-full">
                                    <Gamepad2 className="mr-2 h-3.5 w-3.5" /> Manual
                                </Link>
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
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
