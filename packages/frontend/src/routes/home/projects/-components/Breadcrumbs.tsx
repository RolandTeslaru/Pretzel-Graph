import { Breadcrumb } from '@vx-agent-editor/vx-ui/foundations'

interface Props {
  cwd: {
    key: string,
    name: string
  }[]
}

const Breadcrumbs = ({ cwd }: Props) => {
  return (
    <Breadcrumb.Root>
      <Breadcrumb.List>
        {cwd.map((item, index) => {

          if (index !== cwd.length - 1) {
            return (
              <Breadcrumb.Item>
                <Breadcrumb.Link key={item.key}>
                  {item.name}
                </Breadcrumb.Link>
                <Breadcrumb.Separator />
              </Breadcrumb.Item>
            )
          }
          return (
            <Breadcrumb.Item>
              <Breadcrumb.Link key={item.key}>
                {item.name}
              </Breadcrumb.Link>
            </Breadcrumb.Item>
          )
        })}
      </Breadcrumb.List>
    </Breadcrumb.Root>
  )
}

export default Breadcrumbs
