import { immer } from "zustand/middleware/immer";
import { create } from "zustand";
import { BaseSDK } from "../Base";
import { SDK } from "../SDKManager";

@SDK("System")
class SystemSDKImpl extends BaseSDK<SystemSDK.State> {
    constructor() {super()}

    public NOTIFICATION_DURATION = 400

    public readonly useStore: BaseSDK.Store<SystemSDK.State> = create(
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