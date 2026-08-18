export const getInitialPreferedTheme = (): "dark" | "light" | "system" => {
    const theme = localStorage.getItem("theme")
    if (!theme) return "system"
    return theme as "dark" | "light" | "system"
}

// Collapses "system" down to the OS preference.
export const resolveTheme = (theme: "dark" | "light" | "system"): "dark" | "light" => {
    if (theme !== "system") return theme
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}