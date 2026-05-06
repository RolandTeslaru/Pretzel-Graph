import { Webhook } from "@pretzel-graph/shared/domain/Webhook";
import type { WebhookSDK, WebhookSDKImpl } from "./sdk";

export function createWebhookSDKActions(sdk: WebhookSDKImpl) {
    return {
        fire: async (config) => {
            const id = crypto.randomUUID();
            const { baseUrl } = sdk.useStore.getState();
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

            sdk.useStore.setState(s => { s.entries.unshift(entry) });

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

                sdk.useStore.setState(s => {
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
                sdk.useStore.setState(s => {
                    const e = s.entries.find(e => e.id === id);
                    if (!e) return;
                    e.status = "error";
                    e.responseBody = err instanceof Error ? err.message : String(err);
                    e.durationMs = durationMs;
                });
            }
        },
    } satisfies WebhookSDKActions;
}

export interface WebhookSDKActions {
    fire: (config: {
        method: Webhook.Method
        path: string
        url?: string
        headers?: Record<string, string>
        body?: string
    }) => Promise<void>
}
