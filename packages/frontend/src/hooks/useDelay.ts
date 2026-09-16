import { useEffect, useState } from 'react'

/** False until the delay has elapsed; true immediately when there is no delay. */
export function useDelay(delay = 0): boolean {
    const [isReady, setIsReady] = useState(delay <= 0)

    useEffect(() => {
        if (delay <= 0)
            return

        const id = setTimeout(() => setIsReady(true), delay)

        return () => clearTimeout(id)
    }, [delay])

    return isReady
}
