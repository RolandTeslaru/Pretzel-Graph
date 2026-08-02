export type PlainValue =
    | null
    | boolean
    | number
    | string
    | PlainValue[]
    | { [key: string]: PlainValue }


export const iso = (value: Date | string | null | undefined): string | null => {
    if (value === undefined || value === null)
        return null

    const date = value instanceof Date ? value : new Date(value)
    return Number.isNaN(date.getTime()) ? String(value) : date.toISOString()
}


/** Converts generated SDK models into graph-safe JSON while preserving unknown activity fields. */
export const plain = (value: unknown): PlainValue => {
    if (value === undefined || value === null)
        return null

    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean")
        return value

    if (value instanceof Date)
        return value.toISOString()

    if (value instanceof Set)
        return [...value].map(plain)

    if (Array.isArray(value))
        return value.map(plain)

    if (typeof value === "object")
        return Object.fromEntries(
            Object.entries(value)
                .filter(([, child]) => child !== undefined)
                .map(([key, child]) => [key, plain(child)]),
        )

    return String(value)
}


export const required = (value: string, name: string): string => {
    const result = value.trim()

    if (!result)
        throw new Error(`Alpaca: '${name}' is required.`)

    return result
}


export const bounded = (
    value: number | undefined,
    fallback: number,
    maximum: number,
): number => Math.min(Math.max(Math.trunc(value ?? fallback), 1), maximum)


export const optionalDate = (value: string | undefined, name: string): Date | undefined => {
    if (!value?.trim())
        return undefined

    const date = new Date(value)

    if (Number.isNaN(date.getTime()))
        throw new Error(`Alpaca: '${name}' must be an ISO date or datetime.`)

    return date
}
