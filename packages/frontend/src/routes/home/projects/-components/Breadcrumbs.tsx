import { Link } from '@tanstack/react-router'
import { Breadcrumb } from '@vx-agent-editor/vx-ui/foundations'
import { Fragment } from 'react'

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
        {cwd.map((item, index) => (
          <Fragment key={item.key}>
            <Breadcrumb.Item>
              {item.key ? (
                <Breadcrumb.Link asChild>
                  <Link to="/home/projects/$folderId" params={{ folderId: item.key }}>
                    {item.name}
                  </Link>
                </Breadcrumb.Link>
              ) : (
                <Breadcrumb.Link asChild>
                  <Link to="/home/projects">
                    {item.name}
                  </Link>
                </Breadcrumb.Link>
              )}
            </Breadcrumb.Item>
            {index !== cwd.length - 1 && <Breadcrumb.Separator />}
          </Fragment>
        ))}
        {finalFileName && (
          <Fragment>
            <Breadcrumb.Separator />
            <Breadcrumb.Item>
              <Breadcrumb.Page className="text-muted-foreground">
                {finalFileName}
              </Breadcrumb.Page>
            </Breadcrumb.Item>
          </Fragment>
        )}
      </Breadcrumb.List>
    </Breadcrumb.Root>
  )
}

export default Breadcrumbs
