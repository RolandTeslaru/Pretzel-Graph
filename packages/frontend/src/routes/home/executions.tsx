import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import {
    columnFacetingFeature,
    columnFilteringFeature,
    createColumnHelper,
    createFacetedUniqueValues,
    createFilteredRowModel,
    createSortedRowModel,
    rowSortingFeature,
    type ColumnDef,
    sortFn_basic,
    sortFn_datetime,
    tableFeatures,
    useTable,
} from '@tanstack/react-table'
import { Badge, Button, DropdownMenu, ScrollArea, Select, Table } from '@pretzel-graph/standard-ui/foundations'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { Execution, type Workflow } from '@pretzel-graph/shared/domain'
import { api } from '@/SDKs/ApiInterceptorSDK/sdk'
import { LibrarySDK } from '@/SDKs/LibrarySDK/sdk'
import { QuerySDK } from '@/SDKs/QuerySDK/sdk'
import WorkflowPicker from '@/SDKs/LibrarySDK/ui/WorkflowPicker'
import { WorkflowGlyph } from '@pretzel-graph/standard-ui/brands/workflowGlyph'


export const Route = createFileRoute('/home/executions')({
    component: ExecutionsRoute,
})


const STATUS_VARIANT: Record<Execution.Status, 'success' | 'destructive' | 'secondary' | 'outline'> = {
    pending: 'outline',
    running: 'secondary',
    paused: 'secondary',
    suspended: 'secondary',
    completed: 'success',
    failed: 'destructive',
    terminated: 'destructive',
}


const features = tableFeatures({
    rowSortingFeature,
    sortedRowModel: createSortedRowModel(),
    sortFns: { datetime: sortFn_datetime, basic: sortFn_basic },

    columnFilteringFeature,
    filteredRowModel: createFilteredRowModel(),

    columnFacetingFeature,
    facetedUniqueValues: createFacetedUniqueValues(),
})


const includesSome = (row: { getValue: (id: string) => unknown }, columnId: string, selected: unknown[]) =>
    selected.length === 0 || selected.includes(row.getValue(columnId))


const columnHelper = createColumnHelper<typeof features, Execution.Meta>()

// TValue must stay loose — the column defs have mixed value types (string union,
// Date, number, boolean) and v9's ColumnDef union won't unify them otherwise.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const columns: ColumnDef<typeof features, Execution.Meta, any>[] = [
    columnHelper.accessor('status', {
        id: 'status',
        header: 'Status',
        enableSorting: false,
        filterFn: includesSome,
        cell: ({ getValue }) => {
            const status = getValue() as Execution.Status

            return (
                <Badge variant={STATUS_VARIANT[status]} size='sm'>
                    {status}
                </Badge>
            )
        },
    }),

    columnHelper.accessor(row => row.igniter.variant, {
        id: 'trigger',
        header: 'Trigger',
        enableSorting: false,
        filterFn: includesSome,
        cell: ({ getValue }) => (
            <span className='text-xs text-muted-foreground font-mono'>{getValue()}</span>
        ),
    }),

    columnHelper.accessor(row => new Date(row.created_at), {
        id: 'created_at',
        header: 'Started',
        sortFn: 'datetime',
        enableColumnFilter: false,
        cell: ({ getValue }) => (
            <span className='text-xs'>{getValue().toLocaleString()}</span>
        ),
    }),

    columnHelper.accessor('duration', {
        id: 'duration',
        header: 'Duration',
        sortFn: 'basic',
        enableColumnFilter: false,
        cell: ({ getValue }) => (
            <span className='text-xs font-mono'>{formatDuration(getValue())}</span>
        ),
    }),

    columnHelper.accessor('has_recording', {
        id: 'has_recording',
        header: 'Recording',
        enableSorting: false,
        filterFn: includesSome,
        cell: ({ getValue }) => (
            getValue() ? <SystemIcons.Activity size={14} className='opacity-60' /> : null
        ),
    }),
]


function ExecutionsRoute() {
    const [workflowId, setWorkflowId] = useState<Workflow.Id>()

    return (
        <ScrollArea.Root className='h-[calc(100vh-60px)] pr-10'>
            <div className='flex flex-col gap-4 pb-10'>

                {workflowId
                    ? (
                        <>

                            <div className='flex items-center gap-3'>
                                <WorkflowPicker selectedWorkflowId={workflowId} selectWorkflow={(id) => setWorkflowId(id)} />
                            </div>
                            <ExecutionsTable key={workflowId} workflowId={workflowId} />
                        </>
                    )
                    : (
                        <>
                            <div className='flex items-center gap-3'>
                                <WorkflowPicker selectedWorkflowId={workflowId} selectWorkflow={(id) => setWorkflowId(id)} />
                                
                            </div>
                            <div className='absolute top-1/2 left-1/2 -translate-1/2'>
                                <WorkflowGlyph className='size-20 text-primary mx-auto opacity-20'/>
                                <p className='text-muted-foreground'>Select a Workflow</p>
                            </div>
                        </>
                    )
                }

            </div>
        </ScrollArea.Root>
    )
}


function ExecutionsTable({ workflowId }: { workflowId: Workflow.Id }) {
    const { data, isPending, isError } = QuerySDK.useQuery(
        ['executions', 'meta', workflowId],
        () => Execution.API.Meta.list(api, { workflowId }),
    )

    const executions = useMemo(() => data?.executions ?? [], [data])

    const table = useTable(
        {
            features,
            columns,
            data: executions,
            initialState: { sorting: [{ id: 'created_at', desc: true }] },
        },
        s => ({ sorting: s.sorting, columnFilters: s.columnFilters }),
    )

    const rows = table.getRowModel().rows
    const hasFilters = table.state.columnFilters.length > 0

    const emptyMessage =
        isError ? 'Could not load executions.'
            : isPending ? 'Loading executions…'
                : executions.length === 0 ? 'This workflow has no executions yet.'
                    : rows.length === 0 ? 'No executions match these filters.'
                        : null

    return (
        <div className='flex flex-col gap-3'>

            <div className='flex items-center gap-2 h-8'>
                {hasFilters && (
                    <Button
                        variant='ghost'
                        size='sm'
                        className='h-8 text-xs'
                        onClick={() => table.resetColumnFilters()}
                    >
                        Reset filters
                    </Button>
                )}

                {executions.length > 0 && (
                    <span className='ml-auto text-xs text-muted-foreground'>
                        {rows.length} of {executions.length}
                    </span>
                )}
            </div>

            <Table.Root>
                <Table.Header>
                    {table.getHeaderGroups().map(group => (
                        <Table.Row key={group.id}>
                            {group.headers.map(header => (
                                <Table.Head key={header.id} className={HEAD_WIDTH[header.column.id]}>
                                    {header.column.getCanFilter()
                                        ? <FilterHeader column={header.column} filters={table.state.columnFilters} />
                                        : header.column.getCanSort()
                                            ? (
                                                <button
                                                    className='flex items-center gap-1 hover:text-foreground transition-colors'
                                                    onClick={header.column.getToggleSortingHandler()}
                                                >
                                                    <table.FlexRender header={header} />
                                                    <SortIcon direction={header.column.getIsSorted()} />
                                                </button>
                                            )
                                            : <table.FlexRender header={header} />
                                    }
                                </Table.Head>
                            ))}
                        </Table.Row>
                    ))}
                </Table.Header>

                <Table.Body>
                    {emptyMessage
                        ? (
                            <Table.Row className='hover:bg-transparent'>
                                <Table.Cell colSpan={columns.length}>
                                    <Placeholder text={emptyMessage} />
                                </Table.Cell>
                            </Table.Row>
                        )
                        : rows.map(row => (
                            <Table.Row key={row.id}>
                                {row.getAllCells().map(cell => (
                                    <Table.Cell key={cell.id}>
                                        <table.FlexRender cell={cell} />
                                    </Table.Cell>
                                ))}
                            </Table.Row>
                        ))
                    }
                </Table.Body>
            </Table.Root>

        </div>
    )
}


const HEAD_WIDTH: Record<string, string> = {
    status: 'w-[110px]',
    created_at: 'w-[180px]',
    duration: 'w-[100px]',
    has_recording: 'w-[90px]',
}


type FilterColumn = {
    id: string
    columnDef: { header?: unknown }
    setFilterValue: (value: unknown) => void
    getFacetedUniqueValues: () => Map<unknown, number>
}

type ColumnFilter = { id: string, value: unknown }

const FACET_LABEL: Record<string, (value: unknown) => string> = {
    has_recording: value => value ? 'With recording' : 'No recording',
}

// `selected` comes from table.state (the subscribed selector), not column.getFilterValue().
// The latter reads a render-phase atom snapshot that lags a render, so the checkmarks
// never caught up with the filter that was already applied to the rows.
function FilterHeader({ column, filters }: { column: FilterColumn, filters: ColumnFilter[] }) {
    const selected = (filters.find(f => f.id === column.id)?.value as unknown[]) ?? []
    const facets = column.getFacetedUniqueValues()
    const label = String(column.columnDef.header ?? column.id)
    const format = FACET_LABEL[column.id] ?? String

    const options = useMemo(
        () => [...facets.entries()].sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
        [facets],
    )

    const toggle = (value: unknown) => {
        const next = selected.includes(value)
            ? selected.filter(v => v !== value)
            : [...selected, value]

        column.setFilterValue(next.length > 0 ? next : undefined)
    }

    return (
        <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
                <button
                    data-filtered={selected.length > 0 || undefined}
                    className='flex items-center gap-1 hover:text-foreground transition-colors data-[filtered]:text-foreground'
                >
                    {label}

                    {selected.length > 0 && (
                        <Badge variant='secondary' size='xs'>
                            {selected.length}
                        </Badge>
                    )}

                    <SystemIcons.ChevronDown size={12} className='opacity-40' />
                </button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Content align='start' className='min-w-[180px]'>
                {options.length === 0 && (
                    <div className='px-2 py-1.5 text-xs text-muted-foreground'>
                        No values
                    </div>
                )}

                {options.map(([value, count]) => (
                    <DropdownMenu.CheckboxItem
                        key={String(value)}
                        checked={selected.includes(value)}
                        onCheckedChange={() => toggle(value)}
                        onSelect={e => e.preventDefault()}
                        className='text-xs data-[state=checked]:text-foreground data-[state=checked]:font-medium'
                    >
                        <span>{format(value)}</span>
                        <span className='ml-auto text-muted-foreground'>{count}</span>
                    </DropdownMenu.CheckboxItem>
                ))}
            </DropdownMenu.Content>
        </DropdownMenu.Root>
    )
}


function SortIcon({ direction }: { direction: false | 'asc' | 'desc' }) {
    if (!direction)
        return null

    return direction === 'asc'
        ? <SystemIcons.ChevronUp size={12} className='opacity-70' />
        : <SystemIcons.ChevronDown size={12} className='opacity-70' />
}


function Placeholder({ text }: { text: string }) {
    return (
        <div className='text-sm text-muted-foreground py-10 text-center'>
            {text}
        </div>
    )
}


function formatDuration(ms: number) {
    if (ms < 1000)
        return `${ms}ms`

    return `${(ms / 1000).toFixed(1)}s`
}
