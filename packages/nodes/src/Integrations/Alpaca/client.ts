import {
    Alpaca as OfficialAlpacaClient,
    type trading,
} from "@alpacahq/alpaca-trade-api/rest"
import type { HTTP } from "@pretzel-graph/node-sdk"


export type AlpacaEnvironment = "paper" | "live"

export type AlpacaCredentials = {
    keyId:       string
    secret:      string
    environment: AlpacaEnvironment
}


const bodyFor = (value: unknown, status: number): BodyInit | null => {
    if (status === 204 || status === 205 || status === 304 || value === undefined || value === null)
        return null

    if (typeof value === "string" || value instanceof ArrayBuffer || value instanceof Blob)
        return value

    if (ArrayBuffer.isView(value))
        return new Uint8Array(value.buffer, value.byteOffset, value.byteLength).slice().buffer

    return JSON.stringify(value)
}


const responseHeaders = (values: Record<string, unknown>): Headers => {
    const headers = new Headers()

    for (const [name, value] of Object.entries(values)) {
        if (value === undefined || value === null)
            continue

        headers.set(name, Array.isArray(value) ? value.join(", ") : String(value))
    }

    return headers
}


/**
 * Adapts Alpaca's generated Fetch transport to PretzelGraph's proxy-bound Axios client.
 *
 * The official SDK remains responsible for paths, serialization, retries, rate limiting and API
 * errors. This seam only preserves the runtime node's proxy and execution AbortSignal. Axios
 * retries are disabled here so one transient failure cannot multiply both retry policies.
 */
export const createAlpacaFetch = (http: HTTP.ClientAPI): trading.FetchAPI => {
    const transport = http.create({
        vendor:         "Alpaca",
        retries:        0,
        validateStatus: () => true,
    })

    return async (url, init) => {
        const headers = Object.fromEntries(new Headers(init.headers).entries())

        const response = await transport.raw.request<unknown>({
            url,
            method:            init.method,
            headers,
            data:              init.body,
            signal:            init.signal ?? undefined,
            responseType:      "arraybuffer",
            transformResponse: value => value,
            validateStatus:    () => true,

            // Alpaca defaults redirects to "error" so secret headers are never forwarded to a
            // different host. Axios follows by default, therefore the adapter must opt out too.
            maxRedirects: init.redirect === "follow" ? 5 : 0,
        })

        return new Response(bodyFor(response.data, response.status), {
            status:     response.status,
            statusText: response.statusText,
            headers:    responseHeaders(response.headers as Record<string, unknown>),
        })
    }
}


export const parseAlpacaCredentials = (value: {
    apiKeyId?:   string
    apiSecret?:  string
    environment?: string
}): AlpacaCredentials => {
    const keyId  = value.apiKeyId?.trim()  ?? ""
    const secret = value.apiSecret?.trim() ?? ""

    if (!keyId || !secret)
        throw new Error("Alpaca: API Key ID and API Secret are required.")

    return {
        keyId,
        secret,
        // Existing saved credentials predate this field. Paper is the fail-safe migration.
        environment: value.environment === "live" ? "live" : "paper",
    }
}


export const createAlpacaClient = (
    http: HTTP.ClientAPI,
    credentials: AlpacaCredentials,
): OfficialAlpacaClient =>
    new OfficialAlpacaClient({
        keyId:     credentials.keyId,
        secret:    credentials.secret,
        paper:     credentials.environment === "paper",
        fetchApi:  createAlpacaFetch(http),
        userAgent: "PretzelGraph/1.0",
    })


export type AlpacaClient = OfficialAlpacaClient
