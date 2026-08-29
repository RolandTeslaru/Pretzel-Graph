import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { CSSProperties } from "react"
import { motion, useAnimationFrame, useMotionValue, useTransform } from "motion/react"
import { cn } from "../../utils/cn"

// Background positions that park the highlight band just off each edge of the text.
const SHINE_ENTER = 150
const SHINE_EXIT = -50

export interface ShinyTextProps {
    text: string
    className?: string
    /** Base colour of the text. */
    color?: string
    /** Colour of the travelling highlight band. */
    shineColor?: string
    /** Seconds for one sweep across the text. */
    speed?: number
    /** Seconds the highlight rests off-screen between sweeps. */
    delay?: number
    /** Gradient angle in degrees. */
    spread?: number
    /** Edge the highlight travels towards. */
    direction?: "left" | "right"
    /** Sweep back instead of restarting from the same edge. */
    yoyo?: boolean
    pauseOnHover?: boolean
    disabled?: boolean
}

// Text-clipped gradient whose highlight band is swept across the glyphs on every frame.
export const ShinyText = ({
    text,
    className,
    color = "#b5b5b5",
    shineColor = "#ffffff",
    speed = 2,
    delay = 0,
    spread = 120,
    direction = "right",
    yoyo = false,
    pauseOnHover = false,
    disabled = false,
}: ShinyTextProps) => {
    const [isPaused, setIsPaused] = useState(false)

    const progress = useMotionValue(0)
    const elapsedRef = useRef(0)
    const lastTimeRef = useRef<number | null>(null)
    const signRef = useRef(direction === "right" ? 1 : -1)

    const sweepMs = speed * 1000
    const delayMs = delay * 1000

    useAnimationFrame((time) => {
        if (disabled || isPaused) {
            lastTimeRef.current = null
            return
        }

        if (lastTimeRef.current === null) {
            lastTimeRef.current = time
            return
        }

        elapsedRef.current += time - lastTimeRef.current
        lastTimeRef.current = time

        const cycleMs = sweepMs + delayMs
        const cycleTime = elapsedRef.current % (yoyo ? cycleMs * 2 : cycleMs)

        let sweep: number

        if (cycleTime < sweepMs) {
            sweep = (cycleTime / sweepMs) * 100
        }
        else if (cycleTime < cycleMs) {
            sweep = 100
        }
        else if (cycleTime < cycleMs + sweepMs) {
            sweep = 100 - ((cycleTime - cycleMs) / sweepMs) * 100
        }
        else {
            sweep = 0
        }

        progress.set(signRef.current === 1 ? sweep : 100 - sweep)
    })

    useEffect(() => {
        signRef.current = direction === "right" ? 1 : -1
        elapsedRef.current = 0
        progress.set(signRef.current === 1 ? 0 : 100)
    }, [direction, progress])

    const backgroundPosition = useTransform(progress, (value) => {
        return `${SHINE_ENTER + (value / 100) * (SHINE_EXIT - SHINE_ENTER)}% center`
    })

    const handleMouseEnter = useCallback(() => {
        if (pauseOnHover) {
            setIsPaused(true)
        }
    }, [pauseOnHover])

    const handleMouseLeave = useCallback(() => {
        if (pauseOnHover) {
            setIsPaused(false)
        }
    }, [pauseOnHover])

    const gradientStyle = useMemo<CSSProperties>(() => ({
        backgroundImage: `linear-gradient(${spread}deg, ${color} 0%, ${color} 35%, ${shineColor} 50%, ${color} 65%, ${color} 100%)`,
        backgroundSize: "200% auto",
        backgroundClip: "text",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
    }), [spread, color, shineColor])

    return (
        <motion.span
            className={cn("inline-block", className)}
            style={{ ...gradientStyle, backgroundPosition }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {text}
        </motion.span>
    )
}
