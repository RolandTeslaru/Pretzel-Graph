import React from "react";
import { immer } from "zustand/middleware/immer"
import { enableMapSet } from 'immer';
import { createWithEqualityFn } from "zustand/traditional";
import { shallow } from "zustand/shallow";
import { Consultation, Gateway, HumanReview } from "@pretzel-graph/shared/domain";
import { BaseSDK } from "@pretzel-graph/standard-ui/SDKs/Base";
import { SDK } from "@pretzel-graph/standard-ui/SDKs/SDKManager";
import "../ExecutionSDK/sdk";
import type { ExecutionSDKImpl } from "../ExecutionSDK/sdk";
import { isLiveStatus } from "../ExecutionSDK/observe";
import { _createConsultationActions_, type _ConsultationSDKActions_ } from "./actions";
import { consultationReducers } from "./reducers";
import { ConsultationOverlay } from "./ui/Overlay";
import { ConsultationTemplate } from "./ui/Template";
import { reviewCardRenderer } from "./ui/cards/ReviewCard/renderer";
import { webhookCardRenderer } from "./ui/cards/WebhookCard/renderer";
import { GatewayListenerCard } from "./ui/cards/GatewayListenerCard";
import { Webhook } from "@pretzel-graph/shared/domain/Webhook";

enableMapSet()

@SDK("Consultation")
export class ConsultationSDKImpl extends BaseSDK<ConsultationSDK.State> {

    constructor() {
        super()

        const executionSDK = SDK.get<ExecutionSDKImpl>("Execution")

        this.register(HumanReview.Variant.Confirm, reviewCardRenderer)
        this.register(HumanReview.Variant.Choice,  reviewCardRenderer)
        this.register(HumanReview.Variant.Form,    reviewCardRenderer)
        this.register(Webhook.Test.Consultation.Variant, webhookCardRenderer)
        this.register(Gateway.Test.Consultation.Variant, props =>
            React.createElement(GatewayListenerCard, {
                ...props,
                request: props.consultation as Gateway.Test.Consultation.Request,
            }),
        )

        // The execution session is the source of truth; this SDK owns its projection into cards.
        executionSDK.observeCurrent({
            onAttach: (execution, { isLive }) => {
                if (isLive)
                    this.actions.reconcile(execution.session.pending_consultations)
                else
                    this.actions.clear()
            },
            // Consultations arrive as session patches, which leave the execution's identity alone.
            onUpdate: (execution, previous) => {
                if (execution.session.pending_consultations === previous.session.pending_consultations)
                    return

                if (!isLiveStatus(execution.status))
                    return

                this.actions.reconcile(execution.session.pending_consultations ?? {})
            },
            onDetach: () => this.actions.clear(),
            onStop:   () => this.actions.clear(),
        }, { immediate: true })
    }
    
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

    // Built-ins are installed in the constructor; extensions can register additional variants.
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
