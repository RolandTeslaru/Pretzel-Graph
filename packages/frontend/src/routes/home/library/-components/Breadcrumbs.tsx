import { Link } from '@tanstack/react-router'
import { Breadcrumb } from '@pretzel-graph/standard-ui/foundations'
import { Fragment } from 'react'
import { Library } from '@pretzel-graph/shared/domain'
import { LibrarySDK } from '@/SDKs/LibrarySDK/sdk'

interface Props {
  cwd: Library.Folder.Id,
  finalFileName?: string
  className?: string
  linkClassName?: string
  setCwd?: (folderId: Library.Folder.Id) => void
}

const Breadcrumbs = ({ cwd, finalFileName, className, linkClassName, setCwd }: Props) => {
  const breadCrumbs = LibrarySDK.useStore(s => s.selectors.getBreadcrumbs(s, cwd))
  return (
    <Breadcrumb.Root className={className}>
      <Breadcrumb.List>
        {breadCrumbs.map((item, index) => (
          <Fragment key={item.key}>
            <Breadcrumb.Item>
              <Breadcrumb.Link className={"cursor-pointer " + linkClassName} onClick={() => setCwd?.(item.key as Library.Folder.Id)}>
                  {item.name}
              </Breadcrumb.Link>
            </Breadcrumb.Item>
            {index !== cwd.length - 1 && <Breadcrumb.Separator />}
          </Fragment>
        ))}
        {finalFileName && (
          <Fragment>
            {/* <Breadcrumb.Separator /> */}
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
