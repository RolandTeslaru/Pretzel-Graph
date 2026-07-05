import { PortProjectionsView } from '../PortDataTree'
import { WorkbenchSDK } from '../../../sdk'
import type { Execution, Foundations, Workflow } from '@pretzel-graph/shared/domain'
import { useMemo } from 'react'

interface Props {
  nodeId: Workflow.Node.Id
  inputs: Foundations.Port.Input[]
  nodeOutputProjections: Execution.Session["node_output_projections"]
}

export const Content = ({ nodeId, inputs, nodeOutputProjections }: Props) => {
  const cache = WorkbenchSDK.useStore(s => s.cache)

  const projections = useMemo(() => {
    const result: Execution.Session["node_output_projections"] = {}

    const inputHandlesMap = cache.inputHandlesMap[nodeId] ?? {}

    Object.entries(inputHandlesMap).forEach(([targetPortId, edgeId]) => {
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

  return (
    <PortProjectionsView
      ports={inputs}
      projections={projections}
      emptyMessage="No incoming data yet."
    />
  )
}
