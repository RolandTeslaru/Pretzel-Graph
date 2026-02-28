export const getInitialPreferedTheme = () => {
    const theme = localStorage.getItem("theme")
    if (!theme) {
        const preferedTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"

        localStorage.setItem("theme", preferedTheme);
        return preferedTheme
    }
    return theme as "dark" | "light"
}