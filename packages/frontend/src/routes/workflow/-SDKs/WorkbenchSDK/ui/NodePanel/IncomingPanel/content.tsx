import { PortProjectionsView } from '../PortDataTree'
import { WorkbenchSDK } from '../../../sdk'
import type { Execution, Foundations, Workflow } from '@pretzel-graph/shared/domain'
import { useCallback, useMemo } from 'react'
import { DialogSDK } from '@pretzel-graph/standard-ui/SDKs/DialogSDK'
import { AlertDialog } from '@pretzel-graph/standard-ui/foundations'

interface Props {
  nodeId: Workflow.Node.Id
  inputs: Foundations.Port.Input[]
  nodeOutputProjections: Execution.Session["node_output_projections"]
}

export const Content = ({ nodeId, inputs, nodeOutputProjections }: Props) => {
  const cache = WorkbenchSDK.useDocument(d => d.cache)

  const projections = useMemo(() => {
    const result: Execution.Session["node_output_projections"] = {}

    const inputEdgesByPort = cache.inputEdgesByPort[nodeId] ?? {}

    Object.entries(inputEdgesByPort).forEach(([targetPortId, edgeId]) => {
      const edge = cache.edges[edgeId as Workflow.Edge.Id]
      if (!edge)
        return
      
      const sourceProjection = nodeOutputProjections[edge.source.nodeId]
      
      const value = sourceProjection?.[edge.source.portId as Foundations.Port.Output.Id]
      
      if (value !== undefined)
        // @ts-expect-error 
        result[targetPortId] = value
    })
    return result
  }, [cache, nodeId, nodeOutputProjections])

  const removePort = useCallback((portId: string) => {
    const dialogId = `remove-input-port-${nodeId}-${portId}`
    const label = inputs.find(p => p.id === portId)?.displayName ?? portId

    DialogSDK.actions.push(dialogId, (props) => (
      <DialogSDK.AlertTemplate
        {...props}
        type='danger'
        approveLabel='Remove'
        onApprove={() => {
          WorkbenchSDK.actions.port.removeInput(nodeId, portId as Foundations.Port.Input.Id)
          DialogSDK.actions.pop(dialogId)
        }}
        onCancel={() => DialogSDK.actions.pop(dialogId)}
      >
        <AlertDialog.Title>Remove input port?</AlertDialog.Title>
        <AlertDialog.Description>
          <span className='font-semibold text-destructive'>{label}</span> and any edge connected to it will be removed.
        </AlertDialog.Description>
      </DialogSDK.AlertTemplate>
    ))
  }, [nodeId, inputs])

  const editPort = useCallback((portId: string) => {
    const port = inputs.find(p => p.id === portId)
    if (port)
      WorkbenchSDK.dialogs.openEditInputPort(nodeId, port)
  }, [nodeId, inputs])

  return (
    <PortProjectionsView
      ports={inputs}
      projections={projections}
      emptyMessage="No input ports."
      onRemovePort={removePort}
      onEditPort={editPort}
    />
  )
}
