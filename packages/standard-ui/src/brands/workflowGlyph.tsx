export const WorkflowGlyph = (props: React.SVGProps<SVGSVGElement>) => (
    <svg
        xmlns='http://www.w3.org/2000/svg'
        viewBox='0 0 256 256'
        fill='none'
        role='img'
        aria-label='Workflow'
        {...props}
    >
        <defs>
            <linearGradient id='workflowGlyphFill' x1='58' y1='35' x2='188' y2='218' gradientUnits='userSpaceOnUse'>
                <stop offset='0' stopColor='currentColor' stopOpacity='0.9' />
                <stop offset='0.5' stopColor='currentColor' stopOpacity='1' />
                <stop offset='1' stopColor='currentColor' stopOpacity='1' />
            </linearGradient>

            <linearGradient id='workflowGlyphGleam' x1='36' y1='44' x2='168' y2='190' gradientUnits='userSpaceOnUse'>
                <stop offset='0' stopColor='#FFFFFF' stopOpacity='0.92' />
                <stop offset='0.3' stopColor='#FFFFFF' stopOpacity='0.45' />
                <stop offset='0.62' stopColor='#FFFFFF' stopOpacity='0.06' />
                <stop offset='1' stopColor='#FFFFFF' stopOpacity='0' />
            </linearGradient>

            <mask id='workflowGlyphShape' maskUnits='userSpaceOnUse' x='25' y='39' width='207' height='178'>
                <rect x='25' y='39' width='207' height='178' fill='black' />

                <rect x='29' y='97' width='62' height='62' rx='17' fill='white' />
                <rect x='45' y='113' width='30' height='30' rx='7' fill='black' />

                <path
                    d='M87 128H104C118.36 128 130 116.36 130 102V97C130 87.06 138.06 79 148 79H162'
                    stroke='white'
                    strokeWidth='14'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                />
                <path
                    d='M87 128H104C118.36 128 130 139.64 130 154V159C130 168.94 138.06 177 148 177H162'
                    stroke='white'
                    strokeWidth='14'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                />

                <rect x='157' y='43' width='72' height='72' rx='19' fill='white' />
                <rect x='174' y='60' width='38' height='38' rx='9' fill='black' />
                <rect x='157' y='141' width='72' height='72' rx='19' fill='white' />
                <rect x='174' y='158' width='38' height='38' rx='9' fill='black' />
            </mask>
        </defs>

        <g>
            <rect
                x='25'
                y='39'
                width='207'
                height='178'
                fill='url(#workflowGlyphFill)'
                mask='url(#workflowGlyphShape)'
            />
            <rect
                x='25'
                y='39'
                width='207'
                height='178'
                fill='url(#workflowGlyphGleam)'
                mask='url(#workflowGlyphShape)'
            />
        </g>
    </svg>
)
WorkflowGlyph.displayName = 'WorkflowGlyph'
