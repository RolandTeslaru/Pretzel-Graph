import { Button, Spinner } from '@pretzel-graph/standard-ui/foundations'

interface Props extends React.ComponentProps<typeof Button> {
  loading: boolean
  icon: React.FC<{ className?: string }>
  iconClassName?: string
  label?: string
}

export const ControlButton = ({ loading, icon: Icon, iconClassName, label, ...rest }: Props) => (
  <Button disabled={loading} className='my-auto' {...rest}>
    {loading ? <Spinner /> : <><Icon className={iconClassName} />{label}</>}
  </Button>
)
