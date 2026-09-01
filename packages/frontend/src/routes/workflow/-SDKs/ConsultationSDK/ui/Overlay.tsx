import { memo } from "react";
import { AnimatePresence } from "motion/react";
import { Consultation } from "@pretzel-graph/shared/domain";
import { SDK } from "@pretzel-graph/standard-ui/SDKs/SDKManager";
import type { ConsultationSDK, ConsultationSDKImpl } from "../sdk";
import { ConsultationTemplate } from "./Template";

// Resolved through the container at call time — the SDK is never imported at runtime here,
// so the SDK can re-export this component without the two modules importing each other.
const sdk = () => SDK.get<ConsultationSDKImpl>("Consultation")

// A frontend older than the worker can meet a variant it has no card for. Render a plain
// waiting card rather than crashing the stack — the consultation is real either way.
const UnknownVariant: ConsultationSDK.Renderer = props => (
    <ConsultationTemplate {...props}>
        <div className="p-2.5 text-white dark:text-black flex flex-col gap-1">
            <div className="font-semibold">Waiting on this workflow</div>
            <div className="text-xs opacity-70 font-mono">{props.consultation.variant}</div>
        </div>
    </ConsultationTemplate>
)

// Memo boundary per card so a stack mutation stops cascading into every card's content.
const ConsultationEntry = memo(({ consultation, stackSize, index }: {
    consultation: Consultation.Request
    stackSize: number
    index: number
}) => {
    const render = sdk().getRenderer(consultation.variant) ?? UnknownVariant
    return <>{render({ consultation, stackSize, index })}</>
})

export const ConsultationOverlay: ConsultationSDK.UILayer = memo(() => {

    // Object.is instead of shallow — shallow compares Map contents (ignoring insertion
    // order), so bringToFront reorders wouldn't trigger a re-render.
    const consultationsMap = (sdk().useStore as any)(
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
