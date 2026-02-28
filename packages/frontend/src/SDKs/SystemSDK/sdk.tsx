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
                root.classList.remove("dark", "light")
                root.classList.add(newTheme)

                localStorage.setItem("theme", newTheme)
            })
        }
    }

    public init(){
        this.actions.setTheme(this.state.theme)
    }
}

export const SystemSDK = SDK.get<SystemSDKImpl>("System")


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