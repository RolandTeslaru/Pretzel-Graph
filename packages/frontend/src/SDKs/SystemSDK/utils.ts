export const getInitialPreferedTheme = (): "dark" | "light" | "system" => {
    const theme = localStorage.getItem("theme")
    if (!theme) return "system"
    return theme as "dark" | "light" | "system"
}