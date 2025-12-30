import { createContext, useContext, useEffect, useState } from "react"
import { getSettings, saveSetting, type Theme } from "../lib/store"

type ThemeProviderProps = {
    children: React.ReactNode
    defaultTheme?: Theme
    storageKey?: string
}

type ThemeProviderState = {
    theme: Theme
    setTheme: (theme: Theme) => void
}

const initialState: ThemeProviderState = {
    theme: "system",
    setTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
    children,
    defaultTheme = "system",
    ...props
}: ThemeProviderProps) {
    const [theme, setThemeState] = useState<Theme>(defaultTheme)

    // Load from store on mount
    useEffect(() => {
        const init = async () => {
            // We can initialize the store here to ensure file exists
            const { initStore } = await import('../lib/store');
            await initStore();

            getSettings().then((settings) => {
                setThemeState(settings.system.theme)
            })
        }
        init()
    }, [])

    useEffect(() => {
        const root = window.document.documentElement

        root.classList.remove("light", "dark")

        if (theme === "system") {
            const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
                .matches
                ? "dark"
                : "light"

            root.classList.add(systemTheme)
            return
        }

        root.classList.add(theme)
    }, [theme])

    const setTheme = async (newTheme: Theme) => {
        const currentSettings = await getSettings();
        await saveSetting('system', { ...currentSettings.system, theme: newTheme })
        setThemeState(newTheme)
    }

    return (
        <ThemeProviderContext.Provider {...props} value={{ theme, setTheme }}>
            {children}
        </ThemeProviderContext.Provider>
    )
}

export const useTheme = () => {
    const context = useContext(ThemeProviderContext)

    if (context === undefined)
        throw new Error("useTheme must be used within a ThemeProvider")

    return context
}
