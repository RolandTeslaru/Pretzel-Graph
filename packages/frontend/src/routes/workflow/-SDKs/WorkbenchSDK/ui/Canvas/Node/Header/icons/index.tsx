const SpinnerSvg = ({ fill = 'currentColor', className = '' }: { fill?: string, className?: string }) => (
  <svg className={`overflow-visible ${className}`} width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <g fill={fill}>
      <rect x="11" y="1" width="2" height="5" opacity=".14" rx="1" />
      <rect x="11" y="1" width="2" height="5" transform="rotate(30 12 12)" opacity=".29" rx="1" />
      <rect x="11" y="1" width="2" height="5" transform="rotate(60 12 12)" opacity=".43" rx="1" />
      <rect x="11" y="1" width="2" height="5" transform="rotate(90 12 12)" opacity=".57" rx="1" />
      <rect x="11" y="1" width="2" height="5" transform="rotate(120 12 12)" opacity=".71" rx="1" />
      <rect x="11" y="1" width="2" height="5" transform="rotate(150 12 12)" opacity=".86" rx="1" />
      <rect x="11" y="1" width="2" height="5" transform="rotate(180 12 12)" rx="1" />
    </g>
  </svg>
)

export const GlowingWaitingClock = () => {
  return (
    <svg
      width="36"
      height="36"
      viewBox="-6 -6 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="cursor-pointer overflow-visible"
      style={{ margin: '-6px' }}
    >
      <defs>
        <filter id="clock-glow-far" x="-150%" y="-150%" width="400%" height="400%">
          <feFlood floodColor="#eab308" floodOpacity="1" result="color" />
          <feComposite in="color" in2="SourceAlpha" operator="in" result="colored" />
          <feGaussianBlur in="colored" stdDeviation="9" result="blur1" />
          <feMerge>
            <feMergeNode in="blur1" />
            <feMergeNode in="blur1" />
            <feMergeNode in="blur1" />
          </feMerge>
        </filter>
        <filter id="clock-glow-mid" x="-100%" y="-100%" width="300%" height="300%">
          <feFlood floodColor="#facc15" floodOpacity="1" result="color" />
          <feComposite in="color" in2="SourceAlpha" operator="in" result="colored" />
          <feGaussianBlur in="colored" stdDeviation="2.5" result="blur2" />
          <feMerge>
            <feMergeNode in="blur2" />
            <feMergeNode in="blur2" />
          </feMerge>
        </filter>
        <filter id="clock-glow-tight" x="-50%" y="-50%" width="200%" height="200%">
          <feFlood floodColor="#fde047" floodOpacity="0.9" result="color" />
          <feComposite in="color" in2="SourceAlpha" operator="in" result="colored" />
          <feGaussianBlur in="colored" stdDeviation="1" result="blur3" />
          <feMerge>
            <feMergeNode in="blur3" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <style>{`
        @keyframes clockGlowPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
      {/* Layer 1: far yellow glow */}
      <g filter="url(#clock-glow-far)" style={{ animation: 'clockGlowPulse 2s ease-in-out infinite' }}>
        <circle cx="12" cy="12" r="9" stroke="#eab308" strokeWidth="2" />
        <polyline points="12,7 12,12 15.5,14" stroke="#eab308" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      {/* Layer 2: mid glow */}
      <g filter="url(#clock-glow-mid)">
        <circle cx="12" cy="12" r="9" stroke="#facc15" strokeWidth="1.5" />
        <polyline points="12,7 12,12 15.5,14" stroke="#facc15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      {/* Layer 3: tight glow */}
      <g filter="url(#clock-glow-tight)">
        <circle cx="12" cy="12" r="9" stroke="#fde047" strokeWidth="1.5" />
        <polyline points="12,7 12,12 15.5,14" stroke="#fde047" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      {/* Layer 4: crisp core */}
      <circle cx="12" cy="12" r="9" stroke="#fef9c3" strokeWidth="1.5" fill="none" />
      <polyline points="12,7 12,12 15.5,14" stroke="#fef9c3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  )
}

export const GlowingFailedX = () => {
  return (
    <svg
      width="36"
      height="36"
      viewBox="-6 -6 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="cursor-pointer overflow-visible"
      style={{ margin: '-6px' }}
    >
      <defs>
        <filter id="x-glow-far" x="-150%" y="-150%" width="400%" height="400%">
          <feFlood floodColor="#ef4444" floodOpacity="1" result="color" />
          <feComposite in="color" in2="SourceAlpha" operator="in" result="colored" />
          <feGaussianBlur in="colored" stdDeviation="9" result="blur1" />
          <feMerge>
            <feMergeNode in="blur1" />
            <feMergeNode in="blur1" />
            <feMergeNode in="blur1" />
          </feMerge>
        </filter>
        <filter id="x-glow-mid" x="-100%" y="-100%" width="300%" height="300%">
          <feFlood floodColor="#f87171" floodOpacity="1" result="color" />
          <feComposite in="color" in2="SourceAlpha" operator="in" result="colored" />
          <feGaussianBlur in="colored" stdDeviation="2.5" result="blur2" />
          <feMerge>
            <feMergeNode in="blur2" />
            <feMergeNode in="blur2" />
          </feMerge>
        </filter>
        <filter id="x-glow-tight" x="-50%" y="-50%" width="200%" height="200%">
          <feFlood floodColor="#fca5a5" floodOpacity="0.9" result="color" />
          <feComposite in="color" in2="SourceAlpha" operator="in" result="colored" />
          <feGaussianBlur in="colored" stdDeviation="1" result="blur3" />
          <feMerge>
            <feMergeNode in="blur3" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <style>{`
        @keyframes xGlowPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>
      {/* Layer 1: far red glow */}
      <g filter="url(#x-glow-far)" style={{ animation: 'xGlowPulse 1.5s ease-in-out infinite' }}>
        <line x1="6" y1="6" x2="18" y2="18" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
        <line x1="18" y1="6" x2="6" y2="18" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
      </g>
      {/* Layer 2: mid glow */}
      <g filter="url(#x-glow-mid)">
        <line x1="6" y1="6" x2="18" y2="18" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="18" y1="6" x2="6" y2="18" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round" />
      </g>
      {/* Layer 3: tight glow */}
      <g filter="url(#x-glow-tight)">
        <line x1="6" y1="6" x2="18" y2="18" stroke="#fca5a5" strokeWidth="2" strokeLinecap="round" />
        <line x1="18" y1="6" x2="6" y2="18" stroke="#fca5a5" strokeWidth="2" strokeLinecap="round" />
      </g>
      {/* Layer 4: crisp core */}
      <line x1="6" y1="6" x2="18" y2="18" stroke="#fecaca" strokeWidth="2" strokeLinecap="round" />
      <line x1="18" y1="6" x2="6" y2="18" stroke="#fecaca" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export const GlowingAlertTriangle = () => {
  return (
    <svg
      width="36"
      height="36"
      viewBox="-6 -4 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="cursor-pointer overflow-visible"
      style={{ margin: '-6px' }}
    >
      <defs>
        <filter id="alert-glow-far" x="-150%" y="-150%" width="400%" height="400%">
          <feFlood floodColor="#f59e0b" floodOpacity="1" result="color" />
          <feComposite in="color" in2="SourceAlpha" operator="in" result="colored" />
          <feGaussianBlur in="colored" stdDeviation="9" result="blur1" />
          <feMerge>
            <feMergeNode in="blur1" />
            <feMergeNode in="blur1" />
            <feMergeNode in="blur1" />
          </feMerge>
        </filter>
        <filter id="alert-glow-mid" x="-100%" y="-100%" width="300%" height="300%">
          <feFlood floodColor="#fbbf24" floodOpacity="1" result="color" />
          <feComposite in="color" in2="SourceAlpha" operator="in" result="colored" />
          <feGaussianBlur in="colored" stdDeviation="2.5" result="blur2" />
          <feMerge>
            <feMergeNode in="blur2" />
            <feMergeNode in="blur2" />
          </feMerge>
        </filter>
        <filter id="alert-glow-tight" x="-50%" y="-50%" width="200%" height="200%">
          <feFlood floodColor="#fde68a" floodOpacity="0.9" result="color" />
          <feComposite in="color" in2="SourceAlpha" operator="in" result="colored" />
          <feGaussianBlur in="colored" stdDeviation="1" result="blur3" />
          <feMerge>
            <feMergeNode in="blur3" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <mask id="alert-mark-cutout" maskUnits="userSpaceOnUse">
          <rect width="24" height="24" fill="white" />
          <rect x="10.25" y="7" width="3.5" height="7.5" rx="1.75" fill="black" />
          <circle cx="12" cy="17.5" r="1.85" fill="black" />
        </mask>
      </defs>
      <style>{`
        @keyframes alertGlowPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes alertPing {
          0% { transform: scale(1); opacity: 0.8; }
          75%, 100% { transform: scale(1.6); opacity: 0; }
        }
      `}</style>
      {/* Ping layer: expands outward and fades */}
      <g style={{ animation: 'alertPing 1.2s cubic-bezier(0, 0, 0.2, 1) infinite', transformOrigin: '12px 14px' }}>
        <path d="M12 1.67c.955 0 1.845 .467 2.39 1.247l.105 .16l8.114 13.548a2.914 2.914 0 0 1 -2.307 4.363l-.195 .008h-16.225a2.914 2.914 0 0 1 -2.582 -4.2l.099 -.185l8.11 -13.538a2.914 2.914 0 0 1 2.491 -1.403z" mask="url(#alert-mark-cutout)" fill="#f59e0b" />
      </g>
      {/* Triangle path + exclamation mark (filled alert-triangle) */}
      {/* Layer 1: far amber glow */}
      <g filter="url(#alert-glow-far)" style={{ animation: 'alertGlowPulse 1.2s ease-in-out infinite' }}>
        <path d="M12 1.67c.955 0 1.845 .467 2.39 1.247l.105 .16l8.114 13.548a2.914 2.914 0 0 1 -2.307 4.363l-.195 .008h-16.225a2.914 2.914 0 0 1 -2.582 -4.2l.099 -.185l8.11 -13.538a2.914 2.914 0 0 1 2.491 -1.403z" mask="url(#alert-mark-cutout)" fill="#f59e0b" />
      </g>
      {/* Layer 2: mid glow */}
      <g filter="url(#alert-glow-mid)">
        <path d="M12 1.67c.955 0 1.845 .467 2.39 1.247l.105 .16l8.114 13.548a2.914 2.914 0 0 1 -2.307 4.363l-.195 .008h-16.225a2.914 2.914 0 0 1 -2.582 -4.2l.099 -.185l8.11 -13.538a2.914 2.914 0 0 1 2.491 -1.403z" mask="url(#alert-mark-cutout)" fill="#fbbf24" />
      </g>
      {/* Layer 3: tight glow */}
      <g filter="url(#alert-glow-tight)">
        <path d="M12 1.67c.955 0 1.845 .467 2.39 1.247l.105 .16l8.114 13.548a2.914 2.914 0 0 1 -2.307 4.363l-.195 .008h-16.225a2.914 2.914 0 0 1 -2.582 -4.2l.099 -.185l8.11 -13.538a2.914 2.914 0 0 1 2.491 -1.403z" mask="url(#alert-mark-cutout)" fill="#fde68a" />
      </g>
      {/* Layer 4: crisp core */}
      <path d="M12 1.67c.955 0 1.845 .467 2.39 1.247l.105 .16l8.114 13.548a2.914 2.914 0 0 1 -2.307 4.363l-.195 .008h-16.225a2.914 2.914 0 0 1 -2.582 -4.2l.099 -.185l8.11 -13.538a2.914 2.914 0 0 1 2.491 -1.403z" mask="url(#alert-mark-cutout)" fill="#fef3c7" />
    </svg>
  )
}

export const GlowingAlertTriangleRed = () => {
  return (
    <svg
      width="36"
      height="36"
      viewBox="-6 -4 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="cursor-pointer overflow-visible"
      style={{ margin: '-6px' }}
    >
      <defs>
        <filter id="alert-red-glow-far" x="-150%" y="-150%" width="400%" height="400%">
          <feFlood floodColor="#ef4444" floodOpacity="1" result="color" />
          <feComposite in="color" in2="SourceAlpha" operator="in" result="colored" />
          <feGaussianBlur in="colored" stdDeviation="9" result="blur1" />
          <feMerge>
            <feMergeNode in="blur1" />
            <feMergeNode in="blur1" />
            <feMergeNode in="blur1" />
          </feMerge>
        </filter>
        <filter id="alert-red-glow-mid" x="-100%" y="-100%" width="300%" height="300%">
          <feFlood floodColor="#f87171" floodOpacity="1" result="color" />
          <feComposite in="color" in2="SourceAlpha" operator="in" result="colored" />
          <feGaussianBlur in="colored" stdDeviation="2.5" result="blur2" />
          <feMerge>
            <feMergeNode in="blur2" />
            <feMergeNode in="blur2" />
          </feMerge>
        </filter>
        <filter id="alert-red-glow-tight" x="-50%" y="-50%" width="200%" height="200%">
          <feFlood floodColor="#fca5a5" floodOpacity="0.9" result="color" />
          <feComposite in="color" in2="SourceAlpha" operator="in" result="colored" />
          <feGaussianBlur in="colored" stdDeviation="1" result="blur3" />
          <feMerge>
            <feMergeNode in="blur3" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <mask id="alert-red-mark-cutout" maskUnits="userSpaceOnUse">
          <rect width="24" height="24" fill="white" />
          <rect x="10.25" y="7" width="3.5" height="7.5" rx="1.75" fill="black" />
          <circle cx="12" cy="17.5" r="1.85" fill="black" />
        </mask>
      </defs>
      <style>{`
        @keyframes alertRedGlowPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes alertRedPing {
          0% { transform: scale(1); opacity: 0.8; }
          75%, 100% { transform: scale(1.6); opacity: 0; }
        }
      `}</style>
      <g style={{ animation: 'alertRedPing 1.2s cubic-bezier(0, 0, 0.2, 1) infinite', transformOrigin: '12px 14px' }}>
        <path d="M12 1.67c.955 0 1.845 .467 2.39 1.247l.105 .16l8.114 13.548a2.914 2.914 0 0 1 -2.307 4.363l-.195 .008h-16.225a2.914 2.914 0 0 1 -2.582 -4.2l.099 -.185l8.11 -13.538a2.914 2.914 0 0 1 2.491 -1.403z" mask="url(#alert-red-mark-cutout)" fill="#ef4444" />
      </g>
      <g filter="url(#alert-red-glow-far)" style={{ animation: 'alertRedGlowPulse 1.2s ease-in-out infinite' }}>
        <path d="M12 1.67c.955 0 1.845 .467 2.39 1.247l.105 .16l8.114 13.548a2.914 2.914 0 0 1 -2.307 4.363l-.195 .008h-16.225a2.914 2.914 0 0 1 -2.582 -4.2l.099 -.185l8.11 -13.538a2.914 2.914 0 0 1 2.491 -1.403z" mask="url(#alert-red-mark-cutout)" fill="#ef4444" />
      </g>
      <g filter="url(#alert-red-glow-mid)">
        <path d="M12 1.67c.955 0 1.845 .467 2.39 1.247l.105 .16l8.114 13.548a2.914 2.914 0 0 1 -2.307 4.363l-.195 .008h-16.225a2.914 2.914 0 0 1 -2.582 -4.2l.099 -.185l8.11 -13.538a2.914 2.914 0 0 1 2.491 -1.403z" mask="url(#alert-red-mark-cutout)" fill="#f87171" />
      </g>
      <g filter="url(#alert-red-glow-tight)">
        <path d="M12 1.67c.955 0 1.845 .467 2.39 1.247l.105 .16l8.114 13.548a2.914 2.914 0 0 1 -2.307 4.363l-.195 .008h-16.225a2.914 2.914 0 0 1 -2.582 -4.2l.099 -.185l8.11 -13.538a2.914 2.914 0 0 1 2.491 -1.403z" mask="url(#alert-red-mark-cutout)" fill="#fca5a5" />
      </g>
      <path d="M12 1.67c.955 0 1.845 .467 2.39 1.247l.105 .16l8.114 13.548a2.914 2.914 0 0 1 -2.307 4.363l-.195 .008h-16.225a2.914 2.914 0 0 1 -2.582 -4.2l.099 -.185l8.11 -13.538a2.914 2.914 0 0 1 2.491 -1.403z" mask="url(#alert-red-mark-cutout)" fill="#fee2e2" />
    </svg>
  )
}

export const GlowingCompletedCheck = () => {
  return (
    <svg
      width="36"
      height="36"
      viewBox="-6 -6 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="cursor-pointer overflow-visible"
      style={{ margin: '-6px' }}
    >
      <defs>
        {/* Outer glow: flood-fill green, blurred wide */}
        <filter id="check-glow-far" x="-150%" y="-150%" width="400%" height="400%">
          <feFlood floodColor="#22c55e" floodOpacity="1" result="color" />
          <feComposite in="color" in2="SourceAlpha" operator="in" result="colored" />
          <feGaussianBlur in="colored" stdDeviation="9" result="blur1" />
          <feMerge>
            <feMergeNode in="blur1" />
            <feMergeNode in="blur1" />
            <feMergeNode in="blur1" />
          </feMerge>
        </filter>
        {/* Mid glow: tighter, brighter green */}
        <filter id="check-glow-mid" x="-100%" y="-100%" width="300%" height="300%">
          <feFlood floodColor="#4ade80" floodOpacity="1" result="color" />
          <feComposite in="color" in2="SourceAlpha" operator="in" result="colored" />
          <feGaussianBlur in="colored" stdDeviation="2.5" result="blur2" />
          <feMerge>
            <feMergeNode in="blur2" />
            <feMergeNode in="blur2" />
          </feMerge>
        </filter>
        {/* Tight glow hugging the shape */}
        <filter id="check-glow-tight" x="-50%" y="-50%" width="200%" height="200%">
          <feFlood floodColor="#86efac" floodOpacity="0.9" result="color" />
          <feComposite in="color" in2="SourceAlpha" operator="in" result="colored" />
          <feGaussianBlur in="colored" stdDeviation="1" result="blur3" />
          <feMerge>
            <feMergeNode in="blur3" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <style>{`
        @keyframes checkGlowPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>
      {/* Checkmark path (Lucide check icon) */}
      {/* Layer 1: far green glow */}
      <g filter="url(#check-glow-far)" style={{ animation: 'checkGlowPulse 2s ease-in-out infinite' }}>
        <polyline
          points="4,12 9,17 20,6"
          stroke="#22c55e"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      {/* Layer 2: mid glow */}
      <g filter="url(#check-glow-mid)">
        <polyline
          points="4,12 9,17 20,6"
          stroke="#4ade80"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      {/* Layer 3: tight glow */}
      <g filter="url(#check-glow-tight)">
        <polyline
          points="4,12 9,17 20,6"
          stroke="#86efac"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      {/* Layer 4: crisp white-green core */}
      <polyline
        points="4,12 9,17 20,6"
        stroke="#bbf7d0"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export const GlowingRunningSpinner = () => {
  return (
    <div className="relative flex items-center justify-center w-6 h-6">
      <style>{`
        @keyframes glowSpin {
          to { transform: rotate(360deg); }
        }
        .glow-spin {
          animation: glowSpin 0.75s steps(12) infinite;
        }
        .glow-spinner-root {
          --glow-far: #30A2DF;
          --glow-mid: #0284c7;
          --glow-tight: #0369a1;
          --glow-bar: #3593CA;
        }
        .dark .glow-spinner-root {
          --glow-far: #0ea5e9;
          --glow-mid: #0ea5e9;
          --glow-tight: #38bdf8;
          --glow-bar: #bae6fd;
        }
      `}</style>
      <div className="glow-spinner-root contents">
        {/* Glow layer 1: far, intense */}
        <div
          className="absolute inset-0 flex items-center justify-center glow-spin"
          style={{ filter: 'blur(10px) brightness(5)' }}
        >
          <SpinnerSvg fill="var(--glow-far)" />
        </div>
        {/* Glow layer 2: duplicate far for extra power */}
        <div
          className="absolute inset-0 flex items-center justify-center glow-spin"
          style={{ filter: 'blur(10px) brightness(2)' }}
        >
          <SpinnerSvg fill="var(--glow-far)" />
        </div>
        {/* Glow layer 3: mid */}
        <div
          className="absolute inset-0 flex items-center justify-center glow-spin"
          style={{ filter: 'blur(6px) brightness(1.5)' }}
        >
          <SpinnerSvg fill="var(--glow-mid)" />
        </div>
        {/* Glow layer 4: tight hug */}
        <div
          className="absolute inset-0 flex items-center justify-center glow-spin"
          style={{ filter: 'blur(3px) brightness(1.5)' }}
        >
          <SpinnerSvg fill="var(--glow-tight)" />
        </div>
        {/* Crisp foreground spinner */}
        <div className="relative glow-spin">
          <SpinnerSvg fill="var(--glow-bar)" />
        </div>
      </div>
    </div>
  )
}
