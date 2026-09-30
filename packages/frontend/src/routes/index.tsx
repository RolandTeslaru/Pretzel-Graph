import { createFileRoute, redirect } from '@tanstack/react-router'


export const Route = createFileRoute('/')({
    beforeLoad: ({ context }) => {
        if (context.auth.hasSession && context.auth.access === 'granted') {
            throw redirect({ to: '/home' })
        }

        throw redirect({ to: '/auth' })
    },
})
