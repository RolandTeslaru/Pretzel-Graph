import { motion } from "motion/react";
import { TimeoutRing } from "@pretzel-graph/standard-ui/components/TimeoutRing";
import { SDK } from "@pretzel-graph/standard-ui/SDKs/SDKManager";
import type { ConsultationSDK, ConsultationSDKImpl } from "../sdk";

// Resolved through the container at call time — the SDK is never imported at runtime here,
// so the SDK can re-export this component without the two modules importing each other.
const sdk = () => SDK.get<ConsultationSDKImpl>("Consultation")

// Bottom-centred card chrome. Stack position derives from `index` (last = front).
// Passing `timeout` opts the card into the depleting countdown ring.
export const ConsultationTemplate: ConsultationSDK.Template = ({ children, consultation, stackSize, index, className, timeout }) => {

    const depth = index - (stackSize - 1)          // 0 = front, -1 behind, …
    const yOffset = depth * 37
    const scale = 1 + depth * 0.03
    const brightnessBase = depth === 0 ? 1 : 1 / -(depth - 1)
    const brightness = 1 - (1 - brightnessBase) * 0.3
    const isFront = depth === 0

    const handleClick = () => {
        if (!isFront)
            sdk().actions.bringToFront(consultation.id)
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
                    className="absolute top-3 right-3 text-dark dark:text-white"
                    createdAt={timeout.createdAt}
                    timeoutMs={timeout.timeoutMs}
                    onExpire={timeout.onExpire}
                />
            )}

            {children}
        </motion.div>
    )
}
