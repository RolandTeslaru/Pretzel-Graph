import { PortProjectionsView } from '../PortDataTree'
import type { Execution, Foundations, Workflow } from '@pretzel-graph/shared/domain'

interface Props {
  outputs: Foundations.Port.Output[]
  outputProjections: Execution.Session["node_output_projections"]
}

export const Content = ({ outputs, outputProjections }: Props) => {

  return (
    <PortProjectionsView
      ports={outputs}
      projections={outputProjections}
      emptyMessage="No output data yet."
    />
  )
}
