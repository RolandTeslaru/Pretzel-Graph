import { Kanban } from '@pretzel-graph/standard-ui/components/kanban'
import { useMemo } from 'react'
import { ActivitySDK } from '../sdk'
import type { Execution, Workflow } from '@pretzel-graph/shared/domain'
import WorkflowColumn from './WorkflowColumn'


/**
 * What a column shows first. Paused and suspended sit with running — all three
 * have not finished — and terminated joins the settled runs.
 */
const STATUS_TIER = {
    running: 0,
    paused: 0,
    suspended: 0,
    pending: 1,
    completed: 2,
    failed: 2,
    terminated: 2,
} satisfies Record<Execution.Status, number>

const SETTLED = 2

/** Settled runs are ordered by when they finished, the rest by when they started. */
const byActivity = (a: Execution.Meta, b: Execution.Meta) => {
    const tier = STATUS_TIER[a.status] - STATUS_TIER[b.status]

    if (tier !== 0)
        return tier

    const stamp = (execution: Execution.Meta) =>
        Date.parse(STATUS_TIER[execution.status] === SETTLED ? execution.updated_at : execution.created_at)

    return stamp(b) - stamp(a)
}


const ActivityKanban = () => {

    ActivitySDK.useActivityBootstrapQuery()

    const activity = ActivitySDK.useStore(s => s.activity)

    const columns = useMemo(
        () => Object.fromEntries(
            Object.entries(activity.workflows).map(([id, column]) => [id, [...column.executions].sort(byActivity)])
        ) as Record<string, Execution.Meta[]>,
        [activity.workflows],
    )

    // Most recently active first, read off each column's own top row.
    const columnIds = useMemo(
        () => Object.keys(columns).sort((a, b) =>
            Date.parse(columns[b][0]?.created_at ?? '') - Date.parse(columns[a][0]?.created_at ?? '')
        ),
        [columns],
    )

    return (
        <Kanban.Root
            value={columns}
            onValueChange={() => { }}
            getItemValue={(task) => task.id}
            onValueCommit={(next, meta) => console.log(meta.kind, next)}
        >
            <Kanban.Board className='flex overflow-x-auto [&>*]:w-[220px] [&>*]:shrink-0'>
                {columnIds.map((columnId) => {
                    const workflow = activity.workflows[columnId as Workflow.Id]
                    return <WorkflowColumn key={columnId} workflow={workflow} />
                })}
            </Kanban.Board>

            <Kanban.Overlay>
                {({ value }) => {
                    const workflow = activity.workflows[value as Workflow.Id]
                    return (
                        <WorkflowColumn workflow={workflow} />
                    )
                }}
            </Kanban.Overlay>
        </Kanban.Root>
    )
}

export default ActivityKanban
