import { createFileRoute } from '@tanstack/react-router'


export const Route = createFileRoute('/home/credentials')({
    component: CredentialsRoute,
})

function CredentialsRoute() {
    return (
        <div className="p-6">
        </div>
    )
}
