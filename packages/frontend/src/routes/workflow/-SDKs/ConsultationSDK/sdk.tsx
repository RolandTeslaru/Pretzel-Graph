import React, { memo } from "react";
import { immer } from "zustand/middleware/immer"
import { enableMapSet } from 'immer';
import { createWithEqualityFn } from "zustand/traditional";
import { shallow } from "zustand/shallow";
import { AnimatePresence, motion } from "motion/react";
import { Consultation } from "@pretzel-graph/shared/domain";
import { TimeoutRing } from "@pretzel-graph/standard-ui/components/TimeoutRing";
import { BaseSDK } from "@/SDKs/Base";
import { SDK } from "@/SDKs/SDKManager";
import { ExecutionSDK } from "../ExecutionSDK/sdk";
import { isLiveStatus } from "../ExecutionSDK/observe";
import { _createConsultationActions_, type _ConsultationSDKActions_ } from "./actions";
import { consultationReducers } from "./reducers";

enableMapSet()

// Memo boundary per card so a stack mutation stops cascading into every card's content.
const ConsultationEntry = memo(({ consultation, stackSize, index }: {
    consultation: Consultation.Request
    stackSize: number
    index: number
}) => {
    const render = ConsultationSDK.getRenderer(consultation.variant)
    return <>{render({ consultation, stackSize, index })}</>
})

@SDK("Consultation")
export class ConsultationSDKImpl extends BaseSDK<ConsultationSDK.State> {

    constructor() { super() }

    // A view of session.pending_consultations — insertion order is stack order, so the LAST
    // consultation is the front card. Requests are held by value: a card keeps rendering its
    // content through the AnimatePresence exit, after the session has already dropped it.
    public readonly useStore: BaseSDK.Store<ConsultationSDK.State> = createWithEqualityFn(
        immer<ConsultationSDK.State>(() => ({
            consultations: new Map()
        })),
        shallow
    )

    public readonly reducers: ConsultationSDK.Reducers = consultationReducers;
    public readonly actions: ConsultationSDK.Actions = _createConsultationActions_(this);
    public readonly selectors = {};

    // Consultation.Variant is an open registry, so cards are looked up rather than switched
    // on. A node shipping a new variant registers here; nothing in this file changes.
    private readonly renderers = new Map<Consultation.Variant, ConsultationSDK.Renderer>()

    public register(variant: Consultation.Variant, renderer: ConsultationSDK.Renderer) {
        this.renderers.set(variant, renderer)
    }

    public getRenderer(variant: Consultation.Variant): ConsultationSDK.Renderer {
        return this.renderers.get(variant) ?? ConsultationSDKImpl.UnknownVariant
    }

    // A frontend older than the worker can meet a variant it has no card for. Render a plain
    // waiting card rather than crashing the stack — the consultation is real either way.
    private static readonly UnknownVariant: ConsultationSDK.Renderer = props => (
        <ConsultationSDK.Template {...props}>
            <div className="p-2.5 text-white dark:text-black flex flex-col gap-1">
                <div className="font-semibold">Waiting on this workflow</div>
                <div className="text-xs opacity-70 font-mono">{props.consultation.variant}</div>
            </div>
        </ConsultationSDK.Template>
    )

    public readonly UIOverlay: ConsultationSDK.UILayer = memo(() => {

        // Object.is instead of shallow — shallow compares Map contents (ignoring insertion
        // order), so bringToFront reorders wouldn't trigger a re-render.
        const consultationsMap = (this.useStore as any)(
            (state: ConsultationSDK.State) => state.consultations, Object.is,
        ) as ConsultationSDK.State['consultations']

        const consultations = Array.from(consultationsMap)
        const stackSize = consultations.length

        return (
            <AnimatePresence>
                {consultations.map(([consultationId, consultation], index) => (
                    <ConsultationEntry
                        key={consultationId}
                        consultation={consultation}
                        stackSize={stackSize}
                        index={index}
                    />
                ))}
            </AnimatePresence>
        )
    })

    // Bottom-centred card chrome. Stack position derives from `index` (last = front).
    // Passing `timeout` opts the card into the depleting countdown ring.
    public readonly Template: ConsultationSDK.Template = ({ children, consultation, stackSize, index, className, timeout }) => {

        const depth = index - (stackSize - 1)          // 0 = front, -1 behind, …
        const yOffset = depth * 37
        const scale = 1 + depth * 0.03
        const brightnessBase = depth === 0 ? 1 : 1 / -(depth - 1)
        const brightness = 1 - (1 - brightnessBase) * 0.3
        const isFront = depth === 0

        const handleClick = () => {
            if (!isFront)
                ConsultationSDK.actions.bringToFront(consultation.id)
        }

        return (
            <motion.div
                layout
                initial={{ y: "100%", opacity: 0 }}
                animate={{ y: yOffset, opacity: 1, scale, filter: `brightness(${brightness})` }}
                exit={{ y: "100%", opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                style={{ zIndex: 20 + index }}
                onClick={handleClick}
                className={`
                    overflow-hidden fixed flex flex-col left-1/2 -translate-x-1/2 bottom-22 w-87.5 backdrop-blur-md bg-black/90 dark:bg-white/90
                    rounded-2xl shadow-lg dark:shadow-black/30 light:shadow-black/10
                    ${!isFront ? "cursor-pointer" : ""}
                    ${className || ''}
                `}
            >
                {timeout && (
                    <TimeoutRing
                        className="absolute top-3 right-3 text-white dark:text-black"
                        createdAt={timeout.createdAt}
                        timeoutMs={timeout.timeoutMs}
                        onExpire={timeout.onExpire}
                    />
                )}

                {children}
            </motion.div>
        )
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
