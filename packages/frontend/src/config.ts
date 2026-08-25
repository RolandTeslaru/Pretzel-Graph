/** Placed on the page by whatever served it; absent when Vite serves the app. */
type PublicConfig = {
    apiUrl?: string
    authUrl?: string
    cloudUrl?: string
    sessionCookieDomain?: string
}

declare global {
    interface Window {
        __PRETZEL__?: PublicConfig
    }
}

const injected = window.__PRETZEL__ ?? {}

export const API_URL = injected.apiUrl ?? import.meta.env.VITE_API_URL

export const AUTH_URL = injected.authUrl ?? import.meta.env.VITE_AUTH_URL

export const CLOUD_URL = injected.cloudUrl ?? import.meta.env.VITE_CLOUD_URL

export const SESSION_COOKIE_DOMAIN = injected.sessionCookieDomain ?? import.meta.env.VITE_SESSION_COOKIE_DOMAIN
