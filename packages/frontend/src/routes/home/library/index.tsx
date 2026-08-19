import { createFileRoute } from '@tanstack/react-router'
import { FolderBrowser } from './-components/FolderBrowser'


export const Route = createFileRoute('/home/library/')({
    component: LibraryRoute,
})


function LibraryRoute() {
    return <FolderBrowser folderId={null} />
}
