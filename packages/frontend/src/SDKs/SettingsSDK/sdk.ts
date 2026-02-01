import { immer } from "zustand/middleware/immer";
import { BaseSDK } from "../Base";
import { create } from "zustand";

export class _SettingsSDK_ extends BaseSDK<SettingsSDK.State> {
    private constructor() { super() }

    public static readonly instance = new _SettingsSDK_();

    public readonly useStore = create<SettingsSDK.State>()(
        immer((set, get) => ({
            healthCheckMaxRetries: 5,
            apiUrl: "",
            autoSaveEnabled: true,
            autoSaveInterval: 1000,
            theme: "dark"
        }))
    )
}

export namespace SettingsSDK {
    export type State = {
        // System
        healthCheckMaxRetries: number; // 5
        apiUrl: string;

        // User Preferences
        autoSaveEnabled: boolean;      // true
        autoSaveInterval: number;      // 1000 (ms)
        theme: 'dark' | 'light';
    }
}