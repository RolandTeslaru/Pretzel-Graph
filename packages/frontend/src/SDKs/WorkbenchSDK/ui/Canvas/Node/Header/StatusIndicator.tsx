import { WorkbenchSDK } from '@/SDKs/WorkbenchSDK/sdk'
import { Popover } from '@/vx-ui/foundations'
import { SystemIcons } from '@/vx-ui/icons'
import type { ExecutionSession, Validation, Workflow } from '@vx-agent-editor/shared/domain'


const StatusIndicator = ({
  nodeId,
  className = "",
  executionStatus
}: {
  nodeId: Workflow.Node.Id,
  className?: string,
  executionStatus?: ExecutionSession.NodeStatus
}) => {
  const hasIssues = WorkbenchSDK.useStore(s => WorkbenchSDK.selectors.doesNodeHaveIssues(s, nodeId))



  if (hasIssues)
    return (
      <Popover.Root>
        <Popover.Trigger asChild>
          <div className={className}>
            <SystemIcons.PingingAlertTriangle size={22} className={'text-red-500 cursor-pointer '} />
          </div>
        </Popover.Trigger>
        <Popover.Content align="center" side="right" sideOffset={10}>
          <IssuesPopupContent nodeId={nodeId} />
        </Popover.Content>
      </Popover.Root>
    )

  if (!executionStatus || executionStatus.status === "idle")
    return null;

  if (executionStatus.status === "running")
    return (
      <GlowingRunningSpinner />
    )
  else if (executionStatus.status === "waiting")
    return (
      <SystemIcons.Clock size={22} className={'text-yellow-500 dark:text-yellow-400 animate-pulse cursor-pointer'} />
    )
  else if (executionStatus.status === "failed")
    return (
      <div className='relative'>
        <SystemIcons.X size={22} className={'text-red-500 cursor-pointer '} />
        <SystemIcons.X size={22} className={'text-red-500 cursor-pointer animate-ping absolute top-0 right-0'} />
      </div>
    )
  else if (executionStatus.status === "completed") {
    return (
      <GlowingCompletedCheck />
    )
  }

  return null;
}

export default StatusIndicator

const IssuesPopupContent = ({ nodeId }: { nodeId: Workflow.Node.Id }) => {
  const issues = WorkbenchSDK.useStore(s => s.issues[nodeId])
  if (!issues)
    return null;

  return (
    <div className='p-1'>
      <p className="text-md font-mono text-foreground font-semibold">Node has multiple issues:</p>
      <div className='flex flex-col p-1 text-sm'>
        {Object.entries(issues.inputs).map(([key, issue]) => (
          <div key={key}>
            {renderInputIssueMessage(issue)}
          </div>
        ))}
        {Object.entries(issues.fields).map(([key, issue]) => (
          <div key={key}>
            {renderFieldIssueMessage(issue)}
          </div>
        ))}
      </div>
    </div>
  )
}


const renderFieldIssueMessage = (issue: Validation.Issue.Field) => {
  switch (issue.type) {
    case "missing_value":
      return <p>Field <span className='text-destructive font-semibold'>{issue.field.id}</span> is required</p>;
  }
}

const renderInputIssueMessage = (issue: Validation.Issue.Input) => {
  switch (issue.type) {
    case "missing_connection":
      return <p>Input <span className='text-destructive font-semibold'>{issue.input.id}</span> is required. Ensure it has a connection</p>;
    case "missing_value_or_connection":
      return <p>Input <span className='text-destructive font-semibold'>{issue.input.id}</span> is required. Provide a value or a connection</p>;
  }
}


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

const GlowingCompletedCheck = () => {
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

const GlowingRunningSpinner = () => {
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
