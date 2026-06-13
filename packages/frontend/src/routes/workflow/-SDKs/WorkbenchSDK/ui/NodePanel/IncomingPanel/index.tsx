import { PortDataTree } from '../PortDataTree'
import { projectionsToTree } from '@/components/Tree/toTree'
import { ExecutionSDK } from '@/routes/workflow/-SDKs/ExecutionSDK/sdk'
import { WorkbenchSDK } from '../../../sdk'
import type { Execution, Foundations, Workflow } from '@pretzel-graph/shared/domain'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { useMemo } from 'react'

const IncomingPanel = () => {
  const node = WorkbenchSDK.useStore(s => s.selectors.getClickedNode(s))
  const execution = ExecutionSDK.useStore(s => s.currentExecution)
  return (
    <div className='p-2 h-full overflow-auto relative'>
      <div className=' w-full border-b border-border/50 px-2 pt-0.5 pb-2 flex flex-row gap-2 '>
        <SystemIcons.LogIn size={20} />
        <p className='h-auto my-auto text-sm'>Incoming Data</p>
      </div>
      {node && execution && <Content node={node} execution={execution} />}
    </div>
  )
}

export default IncomingPanel


const Content = ({ node, execution }: { node: Workflow.Node; execution: Execution }) => {
  const [cache, edges] = WorkbenchSDK.useStore(s => [s.cache, s.data.edges])

  const keyNameMap = useMemo(
    () => Object.fromEntries(node.inputs.map(i => [i.id, i.displayName])),
    [node.inputs]
  )

  const portVariantMap = useMemo(
    () => Object.fromEntries(node.inputs.map(i => [i.id, i.variant])),
    [node.inputs]
  )

  const root = useMemo(() => {
    const inputHandles = cache.inputHandlesMap[node.id] ?? {}
    const incomingData: Record<string, Record<string, unknown>> = {}

    Object.entries(inputHandles).forEach(([targetPortId, edgeId]) => {
      const edge = edges[edgeId as Workflow.Edge.Id]
      if (!edge) return

      const sourceProjection = execution.session.node_output_projections[edge.source.nodeId]
      if (!sourceProjection) return

      const value = sourceProjection[edge.source.portId as Foundations.Port.Output.Id]
      if (value === undefined) return

      incomingData[targetPortId] = value as Record<string, unknown>
    })

    return projectionsToTree(incomingData)
  }, [cache, edges, node.id, execution])

  const hasData = Object.values(cache.inputHandlesMap[node.id] ?? {}).some(edgeId => {
    const edge = edges[edgeId as Workflow.Edge.Id]
    return edge && !!execution.session.node_output_projections[edge.source.nodeId]
  })

  if (!hasData) {
    return (
      <div className='mt-2 text-xs text-muted-foreground px-1'>
        No incoming data yet.
      </div>
    )
  }

  return (
    <div className='mt-2 pt-8'>
      <PortDataTree root={root} keyNameMap={keyNameMap} portVariantMap={portVariantMap} />
    </div>
  )
}
