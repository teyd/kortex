import { createRootRoute, Link, Outlet } from '@tanstack/react-router'
import { ThemeProvider } from '../components/theme-provider'

export const Route = createRootRoute({
    component: () => (
        <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
            <div className="flex flex-col h-screen bg-background text-foreground">
                <header className="border-b px-6 py-4 flex items-center justify-between">
                    <h1 className="text-xl font-bold tracking-tight">DynRes</h1>
                </header>

                <div className="flex flex-1 overflow-hidden">

                    <nav className="w-48 border-r p-4 flex flex-col gap-2">
                        <Link to="/" className="[&.active]:font-bold text-sm">Home</Link>
                        <Link to="/rules" className="[&.active]:font-bold text-sm">Rules</Link>
                        <Link to="/settings" className="[&.active]:font-bold text-sm">Settings</Link>
                        <Link to="/logs" className="[&.active]:font-bold text-sm">Logs</Link>
                    </nav>

                    <main className="flex-1 p-6 overflow-auto">
                        <Outlet />
                    </main>

                </div>
                {/* <TanStackRouterDevtools /> */}
            </div>
        </ThemeProvider>
    ),
})
