import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { BaseSDK } from "../Base";
import { SDK } from "../SDKManager";
import { Webhook } from "@pretzel-graph/shared/domain/Webhook";
import { createWebhookSDKActions, type WebhookSDKActions } from "./actions";

@SDK("Webhook")
export class WebhookSDKImpl extends BaseSDK<WebhookSDK.State> {
    constructor() { super() }

    public readonly useStore: BaseSDK.Store<WebhookSDK.State> = create(
        immer<WebhookSDK.State>(() => ({
            entries: [],
            baseUrl: window.location.origin,
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

    public readonly actions: WebhookSDK.Actions = createWebhookSDKActions(this)

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

    export type Actions = WebhookSDKActions

    export type Selectors = {
        pendingCount: () => number
    }
}
