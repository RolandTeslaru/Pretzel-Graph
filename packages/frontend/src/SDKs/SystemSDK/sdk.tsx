import { immer } from "zustand/middleware/immer";
import { create } from "zustand";
import { BaseSDK } from "../Base";
import { SDK } from "../SDKManager";
import { getInitialPreferedTheme } from "./utils";

@SDK("System")
class SystemSDKImpl extends BaseSDK<SystemSDK.State> {
    constructor() {super()}

    public readonly useStore: BaseSDK.Store<SystemSDK.State> = create(
        immer<SystemSDK.State>(() => ({
            theme: getInitialPreferedTheme()
        }))
    )

    public readonly actions: SystemSDK.actions = {
        setTheme: (newTheme) => {
            this.setState(s => {
                s.theme = newTheme
                const root = document.documentElement;
                const resolved = newTheme === "system"
                    ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
                    : newTheme
                root.classList.remove("dark", "light")
                root.classList.add(resolved)
                localStorage.setItem("theme", newTheme)
            })
        }
    }

    public init(){
        this.actions.setTheme(this.state.theme)
        window.matchMedia("(prefers-color-scheme: dark)")
            .addEventListener("change", () => {
                if (this.state.theme === "system") {
                    this.actions.setTheme("system")
                }
            })
    }
}

export const SystemSDK = SDK.get<SystemSDKImpl>("System")


export namespace SystemSDK {
    export type Theme = "dark" | "light" | "system"

    export type State = {
        theme: Theme
    }

    export type actions = {
        setTheme: (newTheme: Theme) => void
    }

    export type UILayer = React.FC<{children: React.ReactNode}>
}