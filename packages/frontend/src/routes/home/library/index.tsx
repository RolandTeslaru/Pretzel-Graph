import { createFileRoute, redirect } from '@tanstack/react-router'
import { Library } from '@pretzel-graph/shared/domain'


export const Route = createFileRoute('/home/library/')({
    beforeLoad: () => {
        throw redirect({ to: '/home/library/$folderId', params: { folderId: Library.Folder.ROOT_ID } })
    },
})
