import { createFileRoute } from '@tanstack/react-router'


export const Route = createFileRoute('/home/settings')({
    component: SettingsRoute,
})

function SettingsRoute() {
    return (
        <div className="p-6">
        </div>
    )
}
