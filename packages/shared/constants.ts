export const REDIS_HOST = process.env.REDIS_HOST ?? "localhost"
export const REDIS_PORT = Number(process.env.REDIS_PORT ?? 6379)
// Set when the queue is reachable over a network rather than loopback, which is
// the case once the backend and the worker are separate machines.
export const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined
