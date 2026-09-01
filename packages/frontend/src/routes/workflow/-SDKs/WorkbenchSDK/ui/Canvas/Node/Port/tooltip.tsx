import { Foundations, Workflow } from '@pretzel-graph/shared/domain';
import React from 'react'
import { WorkbenchSDK } from '@/routes/workflow/-SDKs/WorkbenchSDK/sdk';
import { PortBadge } from './port-badge';

interface Props {
  direction: 'target' | 'source'
  port: Foundations.Port.Input | Foundations.Port.Output
  nodeId: Workflow.Node.Id
  isDraggedPortCompatible: boolean
  draggedPort: WorkbenchSDK.PortRef | null
}

const PortTooltip: React.FC<Props> = ({
  direction,
  port,
  nodeId,
  isDraggedPortCompatible,
  draggedPort
}) => {
  const isInput = direction === 'target'
  const isConnecting = !!draggedPort && draggedPort.nodeId !== nodeId

  if (draggedPort?.port === port)
    return <div className="font-medium">A port cannot connect to itself</div>

  return (
    <div className="font-medium">
      <div className="flex items-center gap-1.5">
        <Lead isInput={isInput} isConnecting={isConnecting} isCompatible={isDraggedPortCompatible} />
        <PortBadge portVariant={port.variant} />
        {isConnecting && <span>{isInput ? 'input' : 'output'}</span>}
      </div>
      {!isConnecting && <Hints isInput={isInput} />}
    </div>
  )
}

export default PortTooltip

// The phrase introducing the port's type badge, which changes while a drag is in flight.
function Lead({ isInput, isConnecting, isCompatible }: {
  isInput: boolean
  isConnecting: boolean
  isCompatible: boolean
}) {
  if (!isConnecting)
    return <span className="text-xs">{isInput ? 'Accepts' : 'Emits'}</span>

  return isCompatible
    ? <span><span className="font-semibold">Connects</span> to</span>
    : <span>Will not accept</span>
}

// Shown only at rest, to explain what this port responds to.
function Hints({ isInput }: { isInput: boolean }) {
  return (
    <div className="mt-2 flex flex-col gap-0.5 text-xs leading-6">
      <div><b>Drag</b> to wire this port to a compatible {isInput ? 'output' : 'input'}</div>
      <div><b>Click</b> the type badge to filter the shelf by that type</div>
    </div>
  )
}
