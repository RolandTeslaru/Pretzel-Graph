import type React from "react";
import { immer } from "zustand/middleware/immer"
import { enableMapSet } from 'immer';
import { createWithEqualityFn } from "zustand/traditional";
import { shallow } from "zustand/shallow";
import { Consultation } from "@pretzel-graph/shared/domain";
import { BaseSDK } from "@pretzel-graph/standard-ui/SDKs/Base";
import { SDK } from "@pretzel-graph/standard-ui/SDKs/SDKManager";
import { ExecutionSDK } from "../ExecutionSDK/sdk";
import { isLiveStatus } from "../ExecutionSDK/observe";
import { _createConsultationActions_, type _ConsultationSDKActions_ } from "./actions";
import { consultationReducers } from "./reducers";
import { ConsultationOverlay } from "./ui/Overlay";
import { ConsultationTemplate } from "./ui/Template";

enableMapSet()

@SDK("Consultation")
export class ConsultationSDKImpl extends BaseSDK<ConsultationSDK.State> {

    constructor() { super() }
    
    public readonly useStore: BaseSDK.Store<ConsultationSDK.State> = createWithEqualityFn(
        immer<ConsultationSDK.State>(() => ({
            consultations: new Map()
        })),
        shallow
    )

    public readonly reducers: ConsultationSDK.Reducers = consultationReducers;
    public readonly actions: ConsultationSDK.Actions = _createConsultationActions_(this);
    public readonly selectors = {};

    // Card chrome and the stack layer live in ./ui and are surfaced here.
    public readonly UIOverlay: ConsultationSDK.UILayer = ConsultationOverlay
    public readonly Template: ConsultationSDK.Template = ConsultationTemplate

    // Consultation.Variant is an open registry, so cards are looked up rather than switched
    // on. A node shipping a new variant registers here; nothing in this file changes.
    private readonly renderers = new Map<Consultation.Variant, ConsultationSDK.Renderer>()

    public register(variant: Consultation.Variant, renderer: ConsultationSDK.Renderer) {
        this.renderers.set(variant, renderer)
    }

    // Undefined for a variant with no card — the stack layer falls back to a waiting card.
    public getRenderer(variant: Consultation.Variant): ConsultationSDK.Renderer | undefined {
        return this.renderers.get(variant)
    }
}

export const ConsultationSDK = SDK.get<ConsultationSDKImpl>("Consultation")


// ─── Sync ───────────────────────────────────────────────────────────────────
// The session is the source of truth; the stack is a projection of it.

// Identity and lifecycle edges. `immediate` replays onAttach for whatever is already in
// state, which is what rebuilds the stack when the workflow page is re-entered mid-run.
ExecutionSDK.observeCurrent({
    onAttach: (execution, { isLive }) => {
        // A finished run can still carry entries if the worker died before its finally ran —
        // they're history, not something to answer.
        if (isLive)
            ConsultationSDK.actions.reconcile(execution.session.pending_consultations)
        else
            ConsultationSDK.actions.clear()
    },
    onDetach: () => ConsultationSDK.actions.clear(),
    onStop:   () => ConsultationSDK.actions.clear(),
}, { immediate: true })

// Consultations open and close while identity and status hold still, so observeCurrent can't
// see them — those edges arrive as session patches.
ExecutionSDK.subscribe((state, prev) => {
    const next     = state.currentExecution?.session.pending_consultations
    const previous = prev.currentExecution?.session.pending_consultations

    if (next === previous) return

    const execution = state.currentExecution
    if (!execution || !isLiveStatus(execution.status)) return

    ConsultationSDK.actions.reconcile(next ?? {})
})


export namespace ConsultationSDK {
    export type State = {
        consultations: Map<Consultation.Id, Consultation.Request>
    }

    export interface Timeout {
        createdAt: number
        timeoutMs: number
        onExpire: () => void
    }

    export interface TemplateProps {
        className?: string
        children?: React.ReactNode
        consultation: Consultation.Request
        stackSize: number
        index: number
        timeout?: Timeout
    }

    export type Renderer = (props: TemplateProps) => React.ReactNode

    export type UILayer = React.FC
    export type Template = React.FC<TemplateProps>
    export type Actions = _ConsultationSDKActions_
    export type Reducers = typeof consultationReducers
}
