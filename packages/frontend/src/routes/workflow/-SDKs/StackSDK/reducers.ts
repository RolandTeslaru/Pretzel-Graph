import type { StackSDK } from "./sdk";

export const stackReducers = {
    push: (s, panelId, renderer) => {
        // If already exists, delete first (brings to front on re-insert)
        const existing = s.panels.get(panelId as StackSDK.Panel.Id)
        if (existing)
            s.panels.delete(panelId as StackSDK.Panel.Id)

        s.panels.set(panelId as StackSDK.Panel.Id, {
            id: panelId as StackSDK.Panel.Id,
            isOpen: true,
            renderer,
            companions: existing?.companions ?? new Map(),
            offset: { x: 0, y: 0 }
        })
    },
    pop: (s, panelId) => {
        s.panels.delete(panelId as StackSDK.Panel.Id)
    },
    popAll: (s) => {
        s.panels.clear()
    },
    bringToFront: (s, panelId) => {
        const entry = s.panels.get(panelId)
        if (!entry) return

        const reordered = new Map<StackSDK.Panel.Id, StackSDK.Panel>()
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
    pushCompanion: (s, panelId, companionId, side, width, renderer) => {
        const panel = s.panels.get(panelId)
        if (!panel) return

        panel.companions.set(companionId, { id: companionId, renderer, side, width })
    },
    popCompanion: (s, panelId, companionId) => {
        const panel = s.panels.get(panelId)
        if (!panel) return
        panel.companions.delete(companionId)
    },
    setOffset: (s, panelId, offset) => {
        const entry = s.panels.get(panelId)
        if (!entry) return
        entry.offset = offset
    }
} satisfies StackSDKReducers


interface StackSDKReducers {
    push:           (state: StackSDK.State, panelId: string, renderer: StackSDK.Panel.Renderer) => void
    pop:            (state: StackSDK.State, panelId: string) => void
    popAll:         (state: StackSDK.State) => void
    bringToFront:   (state: StackSDK.State, panelId: StackSDK.Panel.Id) => void
    sendToBack:     (state: StackSDK.State, panelId: StackSDK.Panel.Id) => void
    setIsOpen:      (state: StackSDK.State, panelId: StackSDK.Panel.Id, isOpen: boolean) => void
    pushCompanion:  (state: StackSDK.State, panelId: StackSDK.Panel.Id, companionId: StackSDK.Companion.Id, side: StackSDK.Side, width: number, renderer: StackSDK.Companion.Renderer) => void
    popCompanion:   (state: StackSDK.State, panelId: StackSDK.Panel.Id, companionId: StackSDK.Companion.Id) => void
    setOffset:      (state: StackSDK.State, panelId: StackSDK.Panel.Id, offset: { x: number, y: number }) => void
}