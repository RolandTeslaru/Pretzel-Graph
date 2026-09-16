import { LibraryCwdBreadcrumbs } from '@/SDKs/LibrarySDK/ui/LibraryCwdBreadcrumbs'
import { useLibraryBrowser } from '../root'

export const Breadcrumbs = ({ className, linkClassName }: { className?: string, linkClassName?: string }) => {
    const { cwd, setCwd } = useLibraryBrowser()

    return <LibraryCwdBreadcrumbs cwd={cwd} setCwd={setCwd} className={className} linkClassName={linkClassName} />
}
