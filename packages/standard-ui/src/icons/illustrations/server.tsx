import { useId, type CSSProperties } from "react"
import { cn } from "../../utils/cn"

export interface ServerIllustrationProps {
    /** Body color of the units — shades derive from it. Defaults to silver. */
    color?: string
    className?: string
    style?: CSSProperties
}

// Two stacked rack units on a dark rail; defs are scoped per instance so icons of different colors can share a page.
export function ServerIllustration({ color = "#c9ced4", className, style }: ServerIllustrationProps) {
    const id = useId()

    return (
        <svg
            viewBox="24 136 552 372"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={cn("shrink-0", className)}
            style={{ ["--server-color" as string]: color, ...style }}
        >
            <defs>
                <linearGradient id={`serverBody${id}`} x1="300" y1="392" x2="300" y2="508" gradientUnits="userSpaceOnUse">
                    <stop offset="0" stopColor="color-mix(in srgb, var(--server-color) 70%, white)" />
                    <stop offset="1" stopColor="color-mix(in srgb, var(--server-color) 82%, black)" />
                </linearGradient>
                <linearGradient id={`serverPort${id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#5c6674" />
                    <stop offset="1" stopColor="#2c323b" />
                </linearGradient>
                <pattern id={`serverMesh${id}`} width="12" height="12" patternUnits="userSpaceOnUse">
                    <rect width="12" height="12" fill="#4a525c" />
                    <circle cx="6" cy="6" r="3.2" fill="#1c2128" />
                </pattern>
                <pattern id={`serverVents${id}`} width="300" height="9" patternUnits="userSpaceOnUse">
                    <rect width="300" height="9" fill="#3a414a" />
                    <rect y="2" width="300" height="4" rx="2" fill="#1c2128" />
                    <rect y="6" width="300" height="1" fill="#ffffff" fillOpacity="0.07" />
                </pattern>
                <linearGradient id={`serverRail${id}`} x1="300" y1="280" x2="300" y2="320" gradientUnits="userSpaceOnUse">
                    <stop offset="0" stopColor="#3a414a" />
                    <stop offset="1" stopColor="#1c2128" />
                </linearGradient>
                <filter id={`serverShadow${id}`} x="-20%" y="-60%" width="140%" height="220%">
                    <feDropShadow dx="0" dy="14" stdDeviation="12" floodColor="#000000" floodOpacity="0.35" />
                </filter>
                <filter id={`serverGlow${id}`} x="-100%" y="-100%" width="300%" height="300%">
                    <feGaussianBlur stdDeviation="4" />
                </filter>

                <g id={`serverUnit${id}`}>
                    <rect x="86" y="392" width="428" height="116" rx="16" fill={`url(#serverBody${id})`} />
                    <rect x="87.5" y="393.5" width="425" height="113" rx="15" stroke="#ffffff" strokeWidth="1.5" opacity="0.7" />
                    <rect x="86" y="392" width="428" height="116" rx="16" stroke="#000000" strokeWidth="2" opacity="0.35" />

                    <rect x="100" y="406" width="210" height="40" rx="4" fill={`url(#serverMesh${id})`} />
                    <rect x="100" y="406" width="210" height="40" rx="4" stroke="#000000" strokeWidth="2" opacity="0.4" />

                    <rect x="326" y="412" width="40" height="28" rx="3" fill={`url(#serverPort${id})`} stroke="#1c2128" strokeWidth="2" />
                    <rect x="332" y="418" width="28" height="14" rx="2" fill="#1c2128" />
                    <rect x="336" y="421" width="20" height="3" rx="1.5" fill="#58a6ff" opacity="0.9" />
                    <rect x="378" y="412" width="40" height="28" rx="3" fill={`url(#serverPort${id})`} stroke="#1c2128" strokeWidth="2" />
                    <rect x="384" y="418" width="28" height="14" rx="2" fill="#1c2128" />
                    <rect x="388" y="421" width="20" height="3" rx="1.5" fill="#58a6ff" opacity="0.9" />

                    <rect x="430" y="414" width="70" height="24" rx="12" fill="#1c2128" />
                    <rect x="430" y="414" width="70" height="24" rx="12" stroke="#000000" strokeWidth="2" opacity="0.4" />
                    <circle cx="444" cy="426" r="8" fill="#5be37a" filter={`url(#serverGlow${id})`} opacity="0.8" />
                    <circle cx="444" cy="426" r="5" fill="#5be37a" />
                    <circle cx="465" cy="426" r="8" fill="#5be37a" filter={`url(#serverGlow${id})`} opacity="0.8" />
                    <circle cx="465" cy="426" r="5" fill="#5be37a" />
                    <circle cx="486" cy="426" r="8" fill="#ffb454" filter={`url(#serverGlow${id})`} opacity="0.8" />
                    <circle cx="486" cy="426" r="5" fill="#ffb454" />

                    <rect x="100" y="451" width="400" height="1.5" fill="#000000" opacity="0.7" />
                    <rect x="100" y="452.5" width="400" height="1" fill="#ffffff" opacity="0.08" />

                    <rect x="100" y="458" width="304" height="36" rx="4" fill={`url(#serverVents${id})`} />
                    <rect x="100" y="458" width="304" height="36" rx="4" stroke="#000000" strokeWidth="2" opacity="0.4" />

                    <rect x="420" y="462" width="80" height="28" rx="5" fill={`url(#serverPort${id})`} stroke="#1c2128" strokeWidth="2" />
                    <rect x="430" y="472" width="36" height="8" rx="4" fill="#1c2128" />
                    <circle cx="486" cy="476" r="8" fill="#58a6ff" filter={`url(#serverGlow${id})`} opacity="0.8" />
                    <circle cx="486" cy="476" r="5" fill="#58a6ff" />
                </g>
            </defs>

            <rect x="64" y="280" width="472" height="40" rx="8" fill={`url(#serverRail${id})`} />
            <rect x="64" y="280" width="472" height="40" rx="8" stroke="#000000" strokeWidth="2" opacity="0.4" />
            <rect x="84" y="298" width="432" height="4" rx="2" fill="#0c0e11" opacity="0.6" />
            <rect x="84" y="302" width="432" height="1" fill="#ffffff" opacity="0.1" />

            <g filter={`url(#serverShadow${id})`} transform="translate(40 149) scale(1.215) translate(-86 -392)">
                <use href={`#serverUnit${id}`} />
            </g>
            <g filter={`url(#serverShadow${id})`} transform="translate(40 310) scale(1.215) translate(-86 -392)">
                <use href={`#serverUnit${id}`} />
            </g>
        </svg>
    )
}
