export const VaultGlyph = (props: React.SVGProps<SVGSVGElement>) => (
    <svg
        xmlns='http://www.w3.org/2000/svg'
        viewBox='0 0 512 512'
        fill='none'
        role='img'
        aria-label='Vault'
        {...props}
    >
        <defs>
            <linearGradient id='vaultPlate' x1='256' y1='52' x2='256' y2='460' gradientUnits='userSpaceOnUse'>
                <stop offset='0' stopColor='#FCFDFD' />
                <stop offset='0.16' stopColor='#B9BEC1' />
                <stop offset='0.34' stopColor='#F5F6F6' />
                <stop offset='0.52' stopColor='#92989C' />
                <stop offset='0.7' stopColor='#E3E5E6' />
                <stop offset='0.86' stopColor='#A4AAAD' />
                <stop offset='1' stopColor='#F8F9F9' />
            </linearGradient>

            <linearGradient id='vaultPlateEdge' x1='80' y1='72' x2='432' y2='446' gradientUnits='userSpaceOnUse'>
                <stop stopColor='#FFFFFF' />
                <stop offset='0.23' stopColor='#666C70' />
                <stop offset='0.53' stopColor='#E6E9EA' />
                <stop offset='0.76' stopColor='#555B5F' />
                <stop offset='1' stopColor='#F7F8F8' />
            </linearGradient>

            <linearGradient id='vaultBrace' x1='128' y1='128' x2='384' y2='384' gradientUnits='userSpaceOnUse'>
                <stop stopColor='#555B5E' />
                <stop offset='0.28' stopColor='#F0F2F2' />
                <stop offset='0.52' stopColor='#8A9094' />
                <stop offset='0.77' stopColor='#F8F9F9' />
                <stop offset='1' stopColor='#50565A' />
            </linearGradient>

            <radialGradient
                id='vaultCenterPivot'
                cx='0'
                cy='0'
                r='1'
                gradientUnits='userSpaceOnUse'
                gradientTransform='translate(246 244) rotate(48) scale(42)'
            >
                <stop stopColor='#FFFFFF' />
                <stop offset='0.26' stopColor='#D8DBDC' />
                <stop offset='0.58' stopColor='#8A9093' />
                <stop offset='0.82' stopColor='#C9CDCF' />
                <stop offset='1' stopColor='#5F6569' />
            </radialGradient>

            <radialGradient
                id='vaultBolt'
                cx='0'
                cy='0'
                r='1'
                gradientTransform='translate(0.34 0.28) rotate(48) scale(0.83)'
            >
                <stop stopColor='#FFFFFF' />
                <stop offset='0.28' stopColor='#D9DCDE' />
                <stop offset='0.62' stopColor='#858B8F' />
                <stop offset='1' stopColor='#3D4347' />
            </radialGradient>

            <filter
                id='vaultShadow'
                x='28'
                y='34'
                width='456'
                height='462'
                filterUnits='userSpaceOnUse'
                colorInterpolationFilters='sRGB'
            >
                <feDropShadow dx='0' dy='12' stdDeviation='11' floodColor='#0B0E10' floodOpacity='0.42' />
            </filter>

            <filter id='vaultSoftHighlight' x='-30%' y='-30%' width='160%' height='160%'>
                <feDropShadow dx='0' dy='-2' stdDeviation='1.5' floodColor='#FFFFFF' floodOpacity='0.85' />
                <feDropShadow dx='0' dy='3' stdDeviation='2' floodColor='#111416' floodOpacity='0.65' />
            </filter>

            <filter id='vaultGrain' x='0' y='0' width='100%' height='100%'>
                <feTurbulence type='fractalNoise' baseFrequency='0.012 0.8' numOctaves='2' seed='17' result='noise' />
                <feColorMatrix in='noise' values='1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 .11 0' />
            </filter>

            <clipPath id='vaultPlateClip'>
                <rect x='56' y='56' width='400' height='400' rx='55' />
            </clipPath>
        </defs>

        <g filter='url(#vaultShadow)'>
            <rect x='53' y='53' width='406' height='406' rx='59' fill='#353A3D' />
            <rect
                x='56'
                y='56'
                width='400'
                height='400'
                rx='55'
                fill='url(#vaultPlate)'
                stroke='url(#vaultPlateEdge)'
                strokeWidth='6'
            />
            <rect x='66' y='66' width='380' height='380' rx='45' stroke='#FFFFFF' strokeOpacity='0.57' strokeWidth='2' />
            <rect x='69' y='69' width='374' height='374' rx='42' stroke='#454B4F' strokeOpacity='0.55' />
            <rect
                x='56'
                y='56'
                width='400'
                height='400'
                rx='55'
                filter='url(#vaultGrain)'
                opacity='0.62'
                clipPath='url(#vaultPlateClip)'
            />

            <g filter='url(#vaultSoftHighlight)' opacity='0.98'>
                <path d='M112 112L400 400' stroke='#3D4347' strokeWidth='27' strokeLinecap='round' />
                <path d='M112 400L400 112' stroke='#3D4347' strokeWidth='27' strokeLinecap='round' />
                <path d='M112 112L400 400' stroke='url(#vaultBrace)' strokeWidth='17' strokeLinecap='round' />
                <path d='M112 400L400 112' stroke='url(#vaultBrace)' strokeWidth='17' strokeLinecap='round' />
                <path d='M112 112L400 400' stroke='#FFFFFF' strokeOpacity='0.58' strokeWidth='3' strokeLinecap='round' />
                <path d='M112 400L400 112' stroke='#FFFFFF' strokeOpacity='0.58' strokeWidth='3' strokeLinecap='round' />
            </g>

            <g filter='url(#vaultSoftHighlight)'>
                {([[112, 112], [400, 112], [112, 400], [400, 400]] as const).map(([x, y]) => (
                    <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
                        <circle r='20' fill='#4B5155' />
                        <circle r='16' fill='url(#vaultBolt)' stroke='#E9EBEC' strokeWidth='1.5' />
                        <circle cx='-5' cy='-6' r='4.5' fill='#FFFFFF' fillOpacity='0.74' />
                    </g>
                ))}
            </g>

            <g filter='url(#vaultSoftHighlight)'>
                <circle cx='256' cy='256' r='31' fill='#3D4347' />
                <circle cx='256' cy='256' r='25' fill='url(#vaultCenterPivot)' stroke='#F1F3F3' strokeWidth='2' />
                <circle cx='248' cy='247' r='7' fill='#FFFFFF' fillOpacity='0.55' />
            </g>
        </g>
    </svg>
)
VaultGlyph.displayName = 'VaultGlyph'
