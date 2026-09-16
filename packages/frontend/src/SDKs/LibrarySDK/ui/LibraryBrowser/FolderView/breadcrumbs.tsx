import { LibraryCwdBreadcrumbs } from '@/SDKs/LibrarySDK/ui/LibraryCwdBreadcrumbs'
import { useFolderView } from './root'

export const Breadcrumbs = ({ className, linkClassName }: { className?: string, linkClassName?: string }) => {
    const { cwd, setCwd } = useFolderView()

    return <LibraryCwdBreadcrumbs cwd={cwd} setCwd={setCwd} className={className} linkClassName={linkClassName} />
}
