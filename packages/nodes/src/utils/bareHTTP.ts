import axios from "axios"
import type { HTTP } from "@pretzel-graph/node-sdk"

// Loaders and sockets run without an execution, so they get a plain client with no proxy or retries.
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
