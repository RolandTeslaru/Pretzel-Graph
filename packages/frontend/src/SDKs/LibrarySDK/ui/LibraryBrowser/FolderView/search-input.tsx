import type { ComponentProps } from 'react'
import { SearchInput as BaseSearchInput } from '@pretzel-graph/standard-ui/foundations'
import { useFolderView } from './root'

export const SearchInput = (props: Omit<ComponentProps<typeof BaseSearchInput>, 'onSearch'>) => {
    const { setSearchQuery } = useFolderView()

    return <BaseSearchInput {...props} onSearch={setSearchQuery} />
}
