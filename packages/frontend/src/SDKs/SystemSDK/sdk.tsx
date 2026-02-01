import { immer } from "zustand/middleware/immer";
import { create } from "zustand";
import { useEffect } from "react";
import type { SDKStore } from "../types";
import { BaseSDK } from "../Base";

class _SystemSDK extends BaseSDK<SystemSDK.State> {
    private constructor() {super()}

    public NOTIFICATION_DURATION = 400
    public static readonly instance = new _SystemSDK()

    public readonly useStore: SDKStore<SystemSDK.State> = create(
        immer<SystemSDK.State>(() => ({
            theme: "dark"
        }))
    )

    public readonly actions: SystemSDK.actions = {
        setTheme: (newTheme) => {
            this.setState(s => {
                s.theme = newTheme
                const root = document.documentElement;
                root.classList.remove("dark", "light")
                root.classList.add(newTheme)
            })
        }
    }

    public init(){
        this.actions.setTheme(this.useStore.getState().theme)
    }
}

export const SystemSDK = _SystemSDK.instance


export namespace SystemSDK {
    export type Theme = "dark" | "light"

    export type State = {
        theme: Theme
    }

    export type actions = {
        setTheme: (newTheme: Theme) => void
    }

    export type UILayer = React.FC<{children: React.ReactNode}>
}