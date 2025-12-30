import { createFileRoute } from '@tanstack/react-router'
import { ComponentExample } from '../components/component-example'

export const Route = createFileRoute('/')({
    component: Index,
})

function Index() {
    return (
        <div className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight">Home</h2>
            <ComponentExample />
        </div>
    )
}
