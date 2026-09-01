import { Tooltip } from '@pretzel-graph/standard-ui/foundations'

const Tipped = ({ label, delay = 200, children }: { label: React.ReactNode; delay?: number; children: React.ReactNode }) => (
  <Tooltip.Root delayDuration={delay}>
    <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
    <Tooltip.Content>{typeof label === 'string' ? <p>{label}</p> : label}</Tooltip.Content>
  </Tooltip.Root>
)

export default Tipped
