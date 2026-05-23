import { PortDataTree } from '../PortDataTree'
import { jsonToTree } from '@/components/Tree/toTree'
import { ExecutionSDK } from '@/routes/workflow/-SDKs/ExecutionSDK/sdk'
import { WorkbenchSDK } from '../../../sdk'
import type { Execution, Workflow } from '@pretzel-graph/shared/domain'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { useMemo } from 'react'

const OutgoingPanel = () => {
  const node = WorkbenchSDK.useStore(s => s.selectors.getClickedNode(s))
  const execution = ExecutionSDK.useStore(s => s.currentExecution)
  return (
    <div className="p-2 h-full overflow-y-auto">
      <div className='bg-card-float border border-border rounded-full p-1 flex flex-row gap-2 shadow-md shadow-black/10'>
        <SystemIcons.LogOut size={20} />
        <p className='h-auto my-auto text-sm'>Outgoing Data</p>
      </div>
      {node && execution && <Content node={node} execution={execution} />}
    </div>
  )
}

export default OutgoingPanel


const Content = ({ node, execution }: { node: Workflow.Node; execution: Execution }) => {
  const outgoingProjection = execution.session.node_output_projections[node.id]

  const keyNameMap = useMemo(
    () => Object.fromEntries(node.outputs.map(o => [o.id, o.displayName])),
    [node.outputs]
  )

  const portVariantMap = useMemo(
    () => Object.fromEntries(node.outputs.map(o => [o.id, o.variant])),
    [node.outputs]
  )

  const root = useMemo(() => {
    const tree = jsonToTree(outgoingProjection ?? {})
    if (tree.childBranches) {
      Object.values(tree.childBranches).forEach(branch => {
        branch.isExpandedByDefault = true
      })
    }
    return tree
  }, [outgoingProjection])

  if (!outgoingProjection || Object.keys(outgoingProjection).length === 0) {
    return (
      <div className='mt-2 text-xs text-muted-foreground px-1'>
        No output data yet.
      </div>
    )
  }

  return (
    <div className='mt-2 overflow-x-auto'>
      <PortDataTree root={root} keyNameMap={keyNameMap} portVariantMap={portVariantMap} />
    </div>
  )
}
