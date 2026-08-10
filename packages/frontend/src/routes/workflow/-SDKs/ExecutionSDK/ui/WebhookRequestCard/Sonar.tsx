import type { CSSProperties } from 'react'

type SonarProps = {
    rings?: number
    period?: number
    sweep?: number
    className?: string
}

const C = 100
const R = 84

const polar = (deg: number, radius: number) => {
    const rad = ((deg - 90) * Math.PI) / 180

    return [C + radius * Math.cos(rad), C + radius * Math.sin(rad)] as const
}

const Sonar = ({ rings = 5, period = 4, sweep = 60, className }: SonarProps) => {
    const ticks = Array.from({ length: 12 }, (_, i) => i * 30)

    const radii = Array.from({ length: rings }, (_, i) => (R * (i + 1)) / rings)

    return (
        <div className={`relative aspect-square overflow-hidden ${className ?? ''}`}>
            <svg viewBox='0 0 200 200' width='100%' height='100%'>
                <g
                    fill='none'
                    stroke='currentColor'
                    strokeOpacity={0.3}
                    strokeWidth={0.4}
                >
                    {radii.map(r => (
                        <circle key={r} cx={C} cy={C} r={r} />
                    ))}

                    <line x1={C - R} y1={C} x2={C + R} y2={C} />
                    <line x1={C} y1={C - R} x2={C} y2={C + R} />
                </g>

                <g
                    fill='currentColor'
                    fillOpacity={0.6}
                    fontSize={5}
                    className='font-mono'
                >
                    {ticks.map(deg => {
                        const [x, y] = polar(deg, R + 9)

                        return (
                            <text
                                key={deg}
                                x={x}
                                y={y}
                                textAnchor='middle'
                                dominantBaseline='middle'
                            >
                                {deg}°
                            </text>
                        )
                    })}
                </g>

                <circle
                    cx={C}
                    cy={C}
                    r={1.2}
                    fill='currentColor'
                    fillOpacity={0.7}
                />
            </svg>

            <div
                className='absolute opacity-50 top-1/2 left-1/2 rounded-full dark:mix-blend-screen will-change-transform animate-sonar-sweep motion-reduce:animate-none'
                style={
                    {
                        '--sonar-duration': period,
                        width: `${R}%`,
                        height: `${R}%`,
                        background: `conic-gradient(from 0deg, transparent 0deg, transparent ${360 - sweep}deg, color-mix(in srgb, currentColor 80%, transparent) 360deg)`,
                    } as CSSProperties
                }
            />
        </div>
    )
}

export default Sonar
