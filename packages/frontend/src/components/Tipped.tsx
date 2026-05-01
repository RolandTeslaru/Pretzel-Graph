import { Tooltip } from '@pretzel-graph/standard-ui/foundations'

const Tipped = ({ label, delay = 200, children }: { label: string; delay?: number; children: React.ReactNode }) => (
  <Tooltip.Root delayDuration={delay}>
    <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
    <Tooltip.Content><p>{label}</p></Tooltip.Content>
  </Tooltip.Root>
)

export default Tipped
