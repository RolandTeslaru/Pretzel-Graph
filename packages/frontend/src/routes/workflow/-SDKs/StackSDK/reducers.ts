import type { StackSDK } from "./sdk";

export const stackReducers = {
    push: (s, panelId, renderer) => {
        // If already exists, delete first (brings to front on re-insert)
        const existing = s.panels.get(panelId)
        if (existing)
            s.panels.delete(panelId)

        s.panels.set(panelId, {
            panelId,
            isOpen: true,
            renderer,
            companions: existing?.companions ?? new Map(),
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

        const reordered = new Map<string, StackSDK.PanelEntry>()
        s.panels.forEach((v, k) => { if (k !== panelId) reordered.set(k, v) })
        reordered.set(panelId, entry)
        s.panels = reordered
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
    },
    pushCompanion: (s, panelId, companionId, renderer, shift) => {
        const entry = s.panels.get(panelId)
        if (!entry) return
        entry.companions.set(companionId, { companionId, renderer, shift })
    },
    popCompanion: (s, panelId, companionId) => {
        const entry = s.panels.get(panelId)
        if (!entry) return
        entry.companions.delete(companionId)
    },
} satisfies StackSDKReducers


interface StackSDKReducers {
    push: (state: StackSDK.State, panelId: string, renderer: StackSDK.Renderer) => void
    pop: (state: StackSDK.State, panelId: string) => void
    popAll: (state: StackSDK.State) => void
    bringToFront: (state: StackSDK.State, panelId: string) => void
    sendToBack: (state: StackSDK.State, panelId: string) => void
    setIsOpen: (state: StackSDK.State, panelId: string, isOpen: boolean) => void
    pushCompanion: (state: StackSDK.State, panelId: string, companionId: string, renderer: StackSDK.CompanionRenderer, shift?: number) => void
    popCompanion: (state: StackSDK.State, panelId: string, companionId: string) => void
}