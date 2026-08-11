import type { Consultation } from "@pretzel-graph/shared/domain";
import type { ConsultationSDK } from "./sdk";

export const consultationReducers = {
    // Mirrors session.pending_consultations onto the stack. Idempotent: entries already
    // present keep their slot (and so their stack position), new ids append, and anything
    // no longer pending is dropped. Used for both the initial seed and every later change.
    reconcile: (s, pending) => {
        for (const id of s.consultations.keys())
            if (!pending[id])
                s.consultations.delete(id)

        for (const [id, request] of Object.entries(pending))
            if (!s.consultations.has(id as Consultation.Id))
                s.consultations.set(id as Consultation.Id, request)
    },
    remove: (s, consultationId) => {
        s.consultations.delete(consultationId)
    },
    clear: (s) => {
        s.consultations.clear()
    },
    // Rebuild the Map with `consultationId` last → it becomes the front card. New Map ref so
    // the Object.is-subscribed overlay re-renders on a pure reorder.
    bringToFront: (s, consultationId) => {
        const entry = s.consultations.get(consultationId)
        if (!entry) return

        const reordered = new Map<Consultation.Id, Consultation.Request>()
        s.consultations.forEach((v, k) => { if (k !== consultationId) reordered.set(k, v) })
        reordered.set(consultationId, entry)
        s.consultations = reordered
    },
} satisfies ConsultationSDKReducers


interface ConsultationSDKReducers {
    reconcile:    (state: ConsultationSDK.State, pending: Record<Consultation.Id, Consultation.Request>) => void
    remove:       (state: ConsultationSDK.State, consultationId: Consultation.Id) => void
    clear:        (state: ConsultationSDK.State) => void
    bringToFront: (state: ConsultationSDK.State, consultationId: Consultation.Id) => void
}
