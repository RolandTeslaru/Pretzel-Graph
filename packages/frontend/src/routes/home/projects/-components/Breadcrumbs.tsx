import { Link } from '@tanstack/react-router'
import { Breadcrumb } from '@vx-agent-editor/vx-ui/foundations'

interface Props {
  cwd: {
    key: string,
    name: string
  }[],
  finalFileName?: string
  className?: string
}

const Breadcrumbs = ({ cwd, finalFileName, className }: Props) => {
  return (
    <Breadcrumb.Root className={className}>
      <Breadcrumb.List>
        {cwd.map((item, index) => {

          if (index !== cwd.length - 1) {
            return (
              <Breadcrumb.Item>
                <Breadcrumb.Link key={item.key} asChild>
                  <Link to={`/home/projects/$folderId`} params={{ folderId: item.key }}>
                    {item.name}
                  </Link>
                </Breadcrumb.Link>
                <Breadcrumb.Separator />
              </Breadcrumb.Item>
            )
          }
          return (
            <Breadcrumb.Item>
              <Breadcrumb.Link key={item.key} asChild>
                <Link to={`/home/projects/$folderId`} params={{ folderId: item.key }}>
                  {item.name}
                </Link>
              </Breadcrumb.Link>
            </Breadcrumb.Item>
          )
        })}
        {finalFileName && (
          <Breadcrumb.Item>
            <Breadcrumb.Separator />
            <Breadcrumb.Link>
              {finalFileName}
            </Breadcrumb.Link>
          </Breadcrumb.Item>
        )}
      </Breadcrumb.List>
    </Breadcrumb.Root>
  )
}

export default Breadcrumbs
