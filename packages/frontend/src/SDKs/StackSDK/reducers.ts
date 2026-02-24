import type { StackSDK } from "./sdk";

export const stackReducers = {
    push: (s, panelId, renderer) => {
        // If already exists, delete first (brings to front on re-insert)
        if (s.panels.has(panelId))
            s.panels.delete(panelId)

        s.panels.set(panelId, {
            panelId,
            isOpen: true,
            renderer,
        })
    },
    pop: (s, panelId) => {
        s.panels.delete(panelId)
    },
    popAll: (s) => {
        s.panels.clear()
    },
    bringToFront: (s, panelId) => {
        const entry = s.panels.get(panelId)
        if (!entry) return

        s.panels.delete(panelId)
        s.panels.set(panelId, entry)
    },
    sendToBack: (s, panelId) => {
        const entry = s.panels.get(panelId)
        if (!entry) return

        const remaining = new Map(s.panels)
        remaining.delete(panelId)

        s.panels.clear()
        s.panels.set(panelId, entry)
        remaining.forEach((v, k) => s.panels.set(k, v))
    },
    setIsOpen: (s, panelId, isOpen) => {
        const entry = s.panels.get(panelId)
        if (!entry) return
        entry.isOpen = isOpen
    }
} satisfies StackSDKReducers


type StackSDKReducers = {
    push: (state: StackSDK.State, panelId: string, renderer: StackSDK.Renderer) => void
    pop: (state: StackSDK.State, panelId: string) => void
    popAll: (state: StackSDK.State) => void
    bringToFront: (state: StackSDK.State, panelId: string) => void
    sendToBack: (state: StackSDK.State, panelId: string) => void
    setIsOpen: (state: StackSDK.State, panelId: string, isOpen: boolean) => void
}