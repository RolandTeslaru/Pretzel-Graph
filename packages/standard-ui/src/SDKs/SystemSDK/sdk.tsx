import { immer } from "zustand/middleware/immer";
import { create } from "zustand";
import { BaseSDK } from "../Base";
import { SDK } from "../SDKManager";
import { cookieStorage, type CookieStorage } from "../../utils/cookieStorage";
import { getInitialPreferedTheme, resolveTheme, THEME_STORAGE_KEY } from "./utils";

@SDK("System")
class SystemSDKImpl extends BaseSDK<SystemSDK.State> {
    constructor() {super()}

    // Host-only until init names a domain, which is when the theme is first read.
    private storage: CookieStorage = cookieStorage()

    public readonly useStore: BaseSDK.Store<SystemSDK.State> = create(
        immer<SystemSDK.State>(() => ({
            theme: "system",
            resolvedTheme: resolveTheme("system")
        }))
    )

    public readonly actions: SystemSDK.actions = {
        setTheme: (newTheme) => {
            this.setState(s => {
                const resolved = resolveTheme(newTheme)

                s.theme = newTheme
                s.resolvedTheme = resolved

                const root = document.documentElement;

                root.classList.remove("dark", "light")
                root.classList.add(resolved)

                this.storage.setItem(THEME_STORAGE_KEY, newTheme)
            })
        }
    }

    // A cookie domain shares the theme with every app under it.
    public init(options: SystemSDK.InitOptions = {}){
        this.storage = cookieStorage({ domain: options.cookieDomain })

        this.actions.setTheme(getInitialPreferedTheme(this.storage))
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

    export type InitOptions = {
        cookieDomain?: string
    }

    export type State = {
        theme: Theme
        resolvedTheme: Exclude<Theme, "system">
    }

    export type actions = {
        setTheme: (newTheme: Theme) => void
    }

    export type UILayer = React.FC<{children: React.ReactNode}>
}