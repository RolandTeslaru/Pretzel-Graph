/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_URL: string
    readonly VITE_CLOUD_URL?: string
    // Add other env vars here
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
