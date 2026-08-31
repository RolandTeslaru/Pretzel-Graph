import axios from "axios"
import type { HTTP } from "@pretzel-graph/node-sdk"

export type AccessTokenGetter = () => Promise<string>

// Loaders run without an execution, so they get a plain client with no proxy or retries.
export function bareHTTP(): HTTP.ClientAPI {
    return {
        create: (config = {}) => {
            const { vendor: _vendor, retries: _retries, proxy: _proxy, ...axiosConfig } = config
            const instance = axios.create({ timeout: 30_000, ...axiosConfig })

            return {
                get:    <T>(url: string, cfg?: HTTP.RequestConfig) => instance.get<T>(url, cfg).then(r => r.data),
                post:   <T>(url: string, data?: unknown, cfg?: HTTP.RequestConfig) => instance.post<T>(url, data, cfg).then(r => r.data),
                put:    <T>(url: string, data?: unknown, cfg?: HTTP.RequestConfig) => instance.put<T>(url, data, cfg).then(r => r.data),
                patch:  <T>(url: string, data?: unknown, cfg?: HTTP.RequestConfig) => instance.patch<T>(url, data, cfg).then(r => r.data),
                delete: <T>(url: string, cfg?: HTTP.RequestConfig) => instance.delete<T>(url, cfg).then(r => r.data),
                raw:    instance,
            }
        },
    }
}

// Every Google product client: a bearer token fetched per request, so a refresh mid-run is invisible.
export class GoogleClient {
    protected readonly http: HTTP.Client

    constructor(http: HTTP.ClientAPI, baseURL: string, getToken: AccessTokenGetter) {
        this.http = http.create({
            vendor:  "Google",
            baseURL,
            headers: { Accept: "application/json" },
        })

        this.http.raw.interceptors.request.use(async (config) => {
            config.headers.Authorization = `Bearer ${await getToken()}`
            return config
        })
    }

    protected get(path: string, params?: object, config?: HTTP.RequestConfig): Promise<unknown> {
        return this.http.get<unknown>(path, { ...config, params })
    }

    protected post(path: string, body?: unknown, params?: object, config?: HTTP.RequestConfig): Promise<unknown> {
        return this.http.post<unknown>(path, body, { ...config, params })
    }

    protected put(path: string, body?: unknown, params?: object): Promise<unknown> {
        return this.http.put<unknown>(path, body, { params })
    }

    protected patch(path: string, body?: unknown, params?: object): Promise<unknown> {
        return this.http.patch<unknown>(path, body, { params })
    }

    protected delete(path: string, params?: object): Promise<unknown> {
        return this.http.delete<unknown>(path, { params }).then(body => body ?? {})
    }
}

export const encodeSegment = (value: string) => encodeURIComponent(value)
