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
  else if (executionStatus.status === "failed")
    return (
      <div className='relative'>
        <SystemIcons.X size={22} className={'text-red-500 cursor-pointer '} />
        <SystemIcons.X size={22} className={'text-red-500 cursor-pointer animate-ping absolute top-0 right-0'} />
      </div>
    )
  else if (executionStatus.status === "completed") {
    return (
      <SystemIcons.Check size={22} className={'text-green-400 dark:text-green-500 cursor-pointer'} />
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
