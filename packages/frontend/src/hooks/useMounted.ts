import { useEffect, useState } from 'react'

/**
 * False during the mount commit, true one painted frame later.
 * Gate enter animations on it so heavy mounting is fully committed
 * and painted before the first animation frame runs.
 */
export function useMounted(): boolean {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        const id = requestAnimationFrame(() => setMounted(true))
        return () => cancelAnimationFrame(id)
    }, [])

    return mounted
}
