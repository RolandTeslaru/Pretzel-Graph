import type { CookieStorage } from "../../utils/cookieStorage"

export const THEME_STORAGE_KEY = "pretzel.theme"

const isTheme = (value: string | null): value is "dark" | "light" | "system" =>
    value === "dark" || value === "light" || value === "system"

// The stored theme, falling back to the entry earlier versions kept in localStorage.
export const getInitialPreferedTheme = (storage: CookieStorage): "dark" | "light" | "system" => {
    const stored = storage.getItem(THEME_STORAGE_KEY) ?? localStorage.getItem("theme")

    return isTheme(stored) ? stored : "system"
}

// Collapses "system" down to the OS preference.
export const resolveTheme = (theme: "dark" | "light" | "system"): "dark" | "light" => {
    if (theme !== "system") return theme
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}
