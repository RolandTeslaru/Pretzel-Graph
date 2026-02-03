import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { BaseSDK } from "../Base";
import { SDK } from "../SDKManager";
import { Realtime } from "@vx-agent-editor/shared/types";

@SDK("Realtime")
export class RealtimeSDKImpl extends BaseSDK<RealtimeSDK.State> {
    constructor() { super() }

    public readonly useStore: BaseSDK.Store<RealtimeSDK.State> = create(
        immer<RealtimeSDK.State>(() => ({
            isConnected: false
        }))
    )

    private socket: WebSocket | null = null;
    private listeners = new Map<Realtime.Topic.Id, Set<(data: any) => void>>();

    public subscribeToTopic<T>(
        topic: Realtime.Topic.Id,
        callback: (data: T) => void
    ) {
        if (!this.listeners.has(topic)) {
            this.listeners.set(topic, new Set());
            // Tell Backend to subscribe us to this Redis topic
            this.send({ action: "subscribe", topic });
        }
        this.listeners.get(topic)!.add(callback);

        return () => {
            const topicListeners = this.listeners.get(topic);
            if (!topicListeners)
                return

            topicListeners.delete(callback);
            // If no more listeners for this topic, unsubscribe from backend
            if (topicListeners.size === 0) {
                this.listeners.delete(topic);
                this.send({ action: "unsubscribe", topic });
            }
        };
    }

    private send(message: any) {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            console.warn("RealtimeSDK: Socket not connected, cannot send message", message);
            return;
        }

        this.socket.send(JSON.stringify(message));
    }

    public connect(url: string) {
        if (this.socket) {
            this.socket.close();
        }

        this.socket = new WebSocket(url);

        this.socket.onopen = () => {
            console.log("RealtimeSDK: Connected");
            this.useStore.setState((state) => { state.isConnected = true; });
            // Resubscribe to existing topics if any (reconnection logic)
            this.listeners.forEach((_, topic) => {
                this.send({ action: "subscribe", topic });
            });
        };

        this.socket.onclose = () => {
            console.log("RealtimeSDK: Disconnected");
            this.useStore.setState((state) => { state.isConnected = false; });
            // TODO: Implement auto-reconnect with backoff
        };

        this.socket.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                // Expecting message to have a topicId field (from Event.Base)
                const topic = message.topicId as Realtime.Topic.Id;

                if (topic && this.listeners.has(topic)) {
                    this.listeners.get(topic)!.forEach(callback => callback(message));
                }
            } catch (err) {
                console.error("RealtimeSDK: Failed to parse message", err);
            }
        };
    }

    public readonly reducers: RealtimeSDK.Reducers = {}
    public readonly actions: RealtimeSDK.Actions = {}
    public readonly selectors: RealtimeSDK.Selectors = {}
}

export const RealtimeSDK = SDK.get<RealtimeSDKImpl>("Realtime")

export namespace RealtimeSDK {

    export type State = {
        isConnected: boolean;
    }
    export type Reducers = {}
    export type Actions = {}
    export type Selectors = {}
}