import { memo, useEffect, useMemo, useState } from 'react'
import { debounce } from 'lodash'
import { Foundations, Workbench, Workflow } from '@pretzel-graph/shared/domain'
import { Input } from '@pretzel-graph/standard-ui/foundations/input'
import { WorkbenchSDK } from '../../../sdk'
import { QuerySDK } from '@pretzel-graph/standard-ui/SDKs/QuerySDK/sdk'
import { api } from '@/SDKs/ApiInterceptorSDK'
import { cn } from '@pretzel-graph/standard-ui/utils/cn'
import { Separator } from '@pretzel-graph/standard-ui/foundations'

type Option = Foundations.Field.ResourceLoader.OptionItem

interface Props {
    nodeId: Workflow.Node.Id
    field: Foundations.Field.ResourceLoader
    selectedValue: string
    onSelect: (option: Option) => void
}

export const PopoverContent = memo<Props>(({ nodeId, field, selectedValue, onSelect }) => {
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const debouncedSetSearch = useMemo(() => debounce(setDebouncedSearch, 300), [])

    useEffect(() => {
        return () => debouncedSetSearch.cancel()
    }, [debouncedSetSearch])

    const query = QuerySDK.useQuery<Workbench.API.Field.ResourceLoader.LoadOptions.Response>(
        ['resource-loader', nodeId, field.id, debouncedSearch],
        async () => {
            const s = WorkbenchSDK.document
            return Workbench.API.Field.ResourceLoader.loadOptions(api, {
                blueprintId: s.data.nodes[nodeId].blueprintId,
                loaderId: field.loaderId,
                fieldValues: s.data.staticValues[nodeId] ?? {},
                credentialInstanceIds: s.data.credentialInstanceIds[nodeId] ?? {},
                searchQuery: debouncedSearch || undefined,
            })
        },
        { staleTime: 30_000 },
    )

    const options: Option[] = query.data?.options ?? []

    return (
        <>
            <div className="p-1 pb-2">
                <Input
                    autoFocus
                    placeholder="Search…"
                    onChange={e => debouncedSetSearch(e.target.value)}
                    className="h-6 text-xs"
                />
            </div>
            <Separator className="mx-auto mb-2 w-[calc(100%-16px)]!" />
            <div className="max-h-48 overflow-y-auto">
                {query.isError && (
                    <div className="px-2 py-3 text-xs text-destructive text-center">
                        {query.error instanceof Error ? query.error.message : 'Failed to load options'}
                    </div>
                )}
                {!query.isError && query.isFetching && options.length === 0 && (
                    <div className="px-2 py-3 text-xs text-muted-foreground text-center">Loading…</div>
                )}
                {!query.isError && !query.isFetching && options.length === 0 && (
                    <div className="px-2 py-3 text-xs text-muted-foreground text-center">No results</div>
                )}
                {options.map(opt => (
                    <button
                        key={opt.value}
                        onClick={() => onSelect(opt)}
                        className={cn(
                            'w-full flex flex-col px-2 py-1 text-left text-xs hover:bg-muted transition-colors',
                            selectedValue === opt.value && 'bg-muted font-medium',
                        )}
                    >
                        <span>{opt.label}</span>
                        {opt.description && (
                            <span className="text-muted-foreground text-[10px]">{opt.description}</span>
                        )}
                    </button>
                ))}
            </div>
        </>
    )
})
PopoverContent.displayName = 'ResourceLoaderPopoverContent'
