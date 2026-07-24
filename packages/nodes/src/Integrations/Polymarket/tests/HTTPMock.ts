import type { HTTP } from "@pretzel-graph/node-sdk"

type Response = unknown | (() => unknown | Promise<unknown>)

export type HTTPCall = {
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
    path:   string
    data?:  unknown
    config?: object
}

export class HTTPMock {
    public readonly calls: HTTPCall[] = []
    public config: HTTP.Client.Config | undefined

    readonly #responses: ReadonlyMap<string, Response>

    constructor(responses: Record<string, Response>) {
        this.#responses = new Map(Object.entries(responses))
    }

    readonly #resolve = async <T>(path: string): Promise<T> => {
        if (!this.#responses.has(path))
            throw new Error(`No mock response configured for ${path}`)

        const response = this.#responses.get(path)
        const value    = typeof response === "function"
            ? await response()
            : response

        return value as T
    }

    public readonly api: HTTP.ClientAPI = {
        create: (config) => {
            this.config = config

            return {
                raw: {} as HTTP.Client["raw"],

                get: async <T>(path: string, requestConfig?: object) => {
                    this.calls.push({
                        method: "GET",
                        path,
                        config: requestConfig,
                    })

                    return this.#resolve<T>(path)
                },

                post: async <T>(
                    path: string,
                    data?: unknown,
                    requestConfig?: object,
                ) => {
                    this.calls.push({
                        method: "POST",
                        path,
                        data,
                        config: requestConfig,
                    })

                    return this.#resolve<T>(path)
                },

                put: async <T>(
                    path: string,
                    data?: unknown,
                    requestConfig?: object,
                ) => {
                    this.calls.push({
                        method: "PUT",
                        path,
                        data,
                        config: requestConfig,
                    })

                    return this.#resolve<T>(path)
                },

                patch: async <T>(
                    path: string,
                    data?: unknown,
                    requestConfig?: object,
                ) => {
                    this.calls.push({
                        method: "PATCH",
                        path,
                        data,
                        config: requestConfig,
                    })

                    return this.#resolve<T>(path)
                },

                delete: async <T>(
                    path: string,
                    requestConfig?: object,
                ) => {
                    this.calls.push({
                        method: "DELETE",
                        path,
                        config: requestConfig,
                    })

                    return this.#resolve<T>(path)
                },
            }
        },
    }
}
