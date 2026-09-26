import { immer } from "zustand/middleware/immer";
import { BaseSDK } from "@pretzel-graph/standard-ui/SDKs/Base";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export class _SettingsSDK_ extends BaseSDK<SettingsSDK.State> {
    private constructor() { super() }

    public static readonly instance = new _SettingsSDK_();

    public readonly useStore = create<SettingsSDK.State>()(
        persist(
            immer((set, get) => ({
                healthCheckMaxRetries: 5,
                apiUrl: "",
                autoSaveEnabled: true,
                autoSaveInterval: 1000,
                theme: "dark",
                edgeStyle: "curved",
            })),
            {
                name:       "pretzel-settings",
                partialize: (state) => ({ edgeStyle: state.edgeStyle }),
            }
        )
    )

    public readonly setEdgeStyle = (edgeStyle: SettingsSDK.EdgeStyle) => {
        this.useStore.setState((s) => { s.edgeStyle = edgeStyle })
    }
}

export const SettingsSDK = _SettingsSDK_.instance

export namespace SettingsSDK {
    export type State = {
        // System
        healthCheckMaxRetries: number; // 5
        apiUrl: string;

        // User Preferences
        autoSaveEnabled: boolean;      // true
        autoSaveInterval: number;      // 1000 (ms)
        theme: 'dark' | 'light';
        edgeStyle: EdgeStyle;
    }

    /** Curved beziers, right angles with rounded corners, or right angles forward and curves backward. */
    export type EdgeStyle = 'curved' | 'angled' | 'hybrid'
}