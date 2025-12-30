import { createRootRoute, Link, Outlet } from '@tanstack/react-router'
// import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { ThemeProvider } from '../components/theme-provider'

export const Route = createRootRoute({
    component: RootComponent,
})

function RootComponent() {
    return (
        <ThemeProvider>
            <div className="min-h-screen bg-background text-foreground flex flex-col font-sans antialiased">
                <header className="p-4 border-b flex justify-between items-center">
                    <h1 className="text-xl font-bold">DynRes</h1>
                    <nav className="flex gap-4">
                        <Link to="/" className="text-sm font-medium hover:underline [&.active]:font-bold">Home</Link>
                        <Link to="/settings" className="text-sm font-medium hover:underline [&.active]:font-bold">Settings</Link>
                    </nav>
                </header>
                <main className="flex-1 p-6">
                    <Outlet />
                </main>
                {/* <TanStackRouterDevtools /> */}
            </div>
        </ThemeProvider>
    )
}
