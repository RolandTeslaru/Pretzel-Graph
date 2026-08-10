import { useEffect, useRef } from "react";
import { cn } from "../utils/cn";

const RING_R = 10;
const RING_C = 2 * Math.PI * RING_R;

interface TimeoutRingProps {
    createdAt: number;
    timeoutMs: number;
    onExpire: () => void;
    className?: string;
}

// Depleting countdown ring over the createdAt → createdAt + timeoutMs window.
// Driven by rAF mutating the circle via ref — no per-frame state, no re-renders.
export const TimeoutRing = ({ createdAt, timeoutMs, onExpire, className }: TimeoutRingProps) => {
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
        <div className={cn("w-4 h-4 -rotate-90", className)}>
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
