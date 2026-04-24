import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { BaseSDK } from "../Base";
import { SDK } from "../SDKManager";
import { Webhook } from "@pretzel-graph/shared/domain/Foundations/Webhook";

@SDK("Webhook")
export class WebhookSDKImpl extends BaseSDK<WebhookSDK.State> {
    constructor() { super() }

    public readonly useStore: BaseSDK.Store<WebhookSDK.State> = create(
        immer<WebhookSDK.State>(() => ({
            entries: [],
            baseUrl: import.meta.env.VITE_WEBHOOK_URL,
        }))
    )

    public readonly reducers: WebhookSDK.Reducers = {
        setBaseUrl: (url) => {
            this.useStore.setState(s => { s.baseUrl = url });
        },
        clear: () => {
            this.useStore.setState(s => { s.entries = [] });
        },
        removeEntry: (id) => {
            this.useStore.setState(s => {
                s.entries = s.entries.filter(e => e.id !== id);
            });
        },
    }

    public readonly actions: WebhookSDK.Actions = {
        fire: async (config) => {
            const id = crypto.randomUUID();
            const { baseUrl } = this.useStore.getState();
            const url = config.url ?? `${baseUrl}/${config.path.replace(/^\//, "")}`;

            const entry: WebhookSDK.Entry = {
                id,
                timestamp: Date.now(),
                method: config.method,
                url,
                headers: config.headers ?? {},
                body: config.body ?? "",
                status: "pending",
            };

            this.useStore.setState(s => { s.entries.unshift(entry) });

            const start = performance.now();

            try {
                const hasBody = config.method !== "GET" && config.method !== "DELETE";
                const res = await fetch(url, {
                    method: config.method,
                    headers: {
                        "Content-Type": "application/json",
                        ...config.headers,
                    },
                    body: hasBody && config.body ? config.body : undefined,
                });

                const durationMs = Math.round(performance.now() - start);
                const responseBody = await res.text();
                const responseHeaders: Record<string, string> = {};
                res.headers.forEach((v, k) => { responseHeaders[k] = v });

                this.useStore.setState(s => {
                    const e = s.entries.find(e => e.id === id);
                    if (!e) return;
                    e.status = res.ok ? "success" : "error";
                    e.responseStatus = res.status;
                    e.responseBody = responseBody;
                    e.responseHeaders = responseHeaders;
                    e.durationMs = durationMs;
                });
            } catch (err) {
                const durationMs = Math.round(performance.now() - start);
                this.useStore.setState(s => {
                    const e = s.entries.find(e => e.id === id);
                    if (!e) return;
                    e.status = "error";
                    e.responseBody = err instanceof Error ? err.message : String(err);
                    e.durationMs = durationMs;
                });
            }
        },
    }

    public readonly selectors: WebhookSDK.Selectors = {
        pendingCount: () => {
            return this.useStore.getState().entries.filter(e => e.status === "pending").length;
        },
    }
}

export const WebhookSDK = SDK.get<WebhookSDKImpl>("Webhook")

export namespace WebhookSDK {

    export type Entry = {
        id: string
        timestamp: number
        method: Webhook.Method
        url: string
        headers: Record<string, string>
        body: string
        status: "pending" | "success" | "error"
        responseStatus?: number
        responseBody?: string
        responseHeaders?: Record<string, string>
        durationMs?: number
    }

    export type State = {
        entries: Entry[]
        baseUrl: string
    }

    export type Reducers = {
        setBaseUrl: (url: string) => void
        clear: () => void
        removeEntry: (id: string) => void
    }

    export type Actions = {
        fire: (config: {
            method: Webhook.Method
            path: string
            url?: string
            headers?: Record<string, string>
            body?: string
        }) => Promise<void>
    }

    export type Selectors = {
        pendingCount: () => number
    }
}
