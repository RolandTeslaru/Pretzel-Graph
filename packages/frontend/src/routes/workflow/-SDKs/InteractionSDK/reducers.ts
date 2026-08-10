import type { InteractionSDK } from "./sdk";

export const interactionReducers = {
    // Re-pushing an existing id re-inserts it last → it becomes the front card.
    push: (s, interactionId, renderer) => {
        const id = interactionId as InteractionSDK.Interaction.Id

        s.interactions.delete(id)
        s.interactions.set(id, { id, renderer })
    },
    pop: (s, interactionId) => {
        s.interactions.delete(interactionId as InteractionSDK.Interaction.Id)
    },
    popAll: (s) => {
        s.interactions.clear()
    },
    // Rebuild the Map with `interactionId` last. New Map ref so the Object.is-subscribed
    // overlay re-renders on a pure reorder.
    bringToFront: (s, interactionId) => {
        const entry = s.interactions.get(interactionId)
        if (!entry) return

        const reordered = new Map<InteractionSDK.Interaction.Id, InteractionSDK.Interaction>()
        s.interactions.forEach((v, k) => { if (k !== interactionId) reordered.set(k, v) })
        reordered.set(interactionId, entry)
        s.interactions = reordered
    },
} satisfies InteractionSDKReducers


interface InteractionSDKReducers {
    push:         (state: InteractionSDK.State, interactionId: string, renderer: InteractionSDK.Interaction.Renderer) => void
    pop:          (state: InteractionSDK.State, interactionId: string) => void
    popAll:       (state: InteractionSDK.State) => void
    bringToFront: (state: InteractionSDK.State, interactionId: InteractionSDK.Interaction.Id) => void
}
