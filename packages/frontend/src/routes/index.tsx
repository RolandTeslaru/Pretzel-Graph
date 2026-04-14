import { createFileRoute, Link } from '@tanstack/react-router'


export const Route = createFileRoute('/')({
    component: Landing,
})

function Landing() {
    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
                <h1 className="text-3xl font-bold">PretzelGraph</h1>
                <p className="mt-2 text-sm opacity-70">Visual agent workflow editor.</p>
                <Link
                    to="/home"
                    className="inline-block mt-6 px-4 py-2 rounded border hover:bg-muted"
                >
                    Go to Home →
                </Link>
            </div>
        </div>
    )
}
