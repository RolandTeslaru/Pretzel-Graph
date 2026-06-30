import { memo, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { HumanReview } from "@pretzel-graph/shared/domain";
import { HumanReviewSDK } from "../../sdk";
import { ConfirmationCard } from "./Cards/ConfirmationCard";
import { ChoiceCard } from "./Cards/ChoiceCard";
import { FormCard } from "./Cards/FormCard";

const RING_R = 10;
const RING_C = 2 * Math.PI * RING_R;

// Depleting countdown ring tied to the request's createdAt → createdAt + timeoutMs window.
// Driven by rAF mutating the circle via ref — no per-frame state, no re-renders.
// Fires onExpire once when the window closes.
const TimeoutRing = ({ createdAt, timeoutMs, onExpire }: { createdAt: number; timeoutMs: number; onExpire: () => void }) => {
    const circleRef = useRef<SVGCircleElement>(null);
    const onExpireRef = useRef(onExpire);
    onExpireRef.current = onExpire;

    useEffect(() => {
        let raf = 0;
        const tick = () => {
            const remaining = Math.max(0, 1 - (Date.now() - createdAt) / timeoutMs);
            circleRef.current?.style.setProperty("stroke-dashoffset", `${RING_C * (1 - remaining)}`);
            if (remaining > 0) raf = requestAnimationFrame(tick);
            else onExpireRef.current();
        };
        tick();
        return () => cancelAnimationFrame(raf);
    }, [createdAt, timeoutMs]);

    return (
        <div className="absolute top-3 right-3 w-4 h-4 -rotate-90">
            <svg viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r={RING_R} stroke="currentColor" strokeWidth="4" fill="none" />
                <circle
                    ref={circleRef}
                    className="opacity-75"
                    cx="12" cy="12" r={RING_R}
                    stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round"
                    strokeDasharray={RING_C}
                />
            </svg>
        </div>
    );
};

interface CardProps {
    request: HumanReview.Request
    index: number
    stackSize: number
}

// One request card. Stack position is derived from `index` (last = front).
const Card = ({ request, index, stackSize }: CardProps) => {
    const depth   = index - (stackSize - 1)        // 0 = front, -1 behind, …
    const yOffset = depth * 37
    const scale   = 1 + depth * 0.03
    const brightnessBase = depth === 0 ? 1 : 1 / -(depth - 1)
    const brightness = 1 - (1 - brightnessBase) * 0.3
    const isFront = depth === 0

    const handleClick = () => {
        if (!isFront) HumanReviewSDK.actions.bringToFront(request.id)
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
            `}
        >
            <div className="p-2.5  text-white dark:text-black gap-3 flex flex-col">
                <div className="font-semibold">{request.title}</div>
                {request.message && <div className="text-xs opacity-70">{request.message}</div>}

                {request.variant === "confirm" && <ConfirmationCard request={request} />}
                {request.variant === "choice"  && <ChoiceCard request={request} />}
                {request.variant === "form"    && <FormCard request={request} />}

                <TimeoutRing createdAt={request.createdAt} timeoutMs={request.timeoutMs} onExpire={() => HumanReviewSDK.actions.removeRequest(request.id)} />
            </div>
        </motion.div>
    )
}

// Stacked overlay of pending review requests (newest in front).
export const RequestStacker = memo(() => {
    // Object.is (not shallow): bringToFront builds a NEW Map, so a pure reorder re-renders.
    const requestsMap = (HumanReviewSDK.useStore as any)(
        (s: HumanReviewSDK.State) => s.requests, Object.is,
    ) as HumanReviewSDK.State["requests"]

    const requests  = Array.from(requestsMap)
    const stackSize = requests.length

    return (
        <AnimatePresence>
            {requests.map(([id, request], index) => (
                <Card key={id} request={request} index={index} stackSize={stackSize} />
            ))}
        </AnimatePresence>
    )
})
