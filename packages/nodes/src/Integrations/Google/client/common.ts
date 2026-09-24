import type { HTTP } from "@pretzel-graph/node-sdk"

export type AccessTokenGetter = () => Promise<string>

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
