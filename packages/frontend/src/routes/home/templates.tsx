import { createFileRoute } from '@tanstack/react-router'


export const Route = createFileRoute('/home/templates')({
    component: TemplatesRoute,
})

function TemplatesRoute() {
    return (
        <div className="p-6">
            <h1 className="text-2xl font-semibold">Templates</h1>
        </div>
    )
}
