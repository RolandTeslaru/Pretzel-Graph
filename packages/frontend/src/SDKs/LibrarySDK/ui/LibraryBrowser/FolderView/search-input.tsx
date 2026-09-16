import type { ComponentProps } from 'react'
import { SearchInput as BaseSearchInput } from '@pretzel-graph/standard-ui/foundations'
import { useLibraryBrowser } from '../root'

export const SearchInput = (props: Omit<ComponentProps<typeof BaseSearchInput>, 'onSearch'>) => {
    const { setSearchQuery } = useLibraryBrowser()

    return <BaseSearchInput {...props} onSearch={setSearchQuery} />
}
