import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
// import { attachConsole } from '@tauri-apps/plugin-log'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'

export const Route = createFileRoute('/logs')({
    component: LogsCallback,
})

function LogsCallback() {
    // To view backend logs in frontend, we'd need to configure tauri-plugin-log targets.
    // For now, we are relying on stdout/terminal.

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Logs</h2>
                <p className="text-muted-foreground">Application logs are currently output to the terminal.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>System Logs</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="p-4 bg-muted/50 rounded-md font-mono text-xs">
                        Please check the terminal window where `bun tauri dev` is running to see real-time logs from the Rust backend.
                        <br /><br />
                        Look for lines starting with `[info]`, `[debug]`, `[error]`.
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
