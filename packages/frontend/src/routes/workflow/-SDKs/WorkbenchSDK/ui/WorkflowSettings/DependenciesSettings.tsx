import { useState } from 'react'
import { Button, Spinner } from '@pretzel-graph/standard-ui/foundations'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { LazyIcon } from '@pretzel-graph/standard-ui/icons/LazyIcon'
import { WorkbenchSDK } from '../../sdk'
import type { Workflow } from '@pretzel-graph/shared/domain'

export const DependenciesSettings = () => {
    const dependencies       = WorkbenchSDK.useStore(s => Object.values(s.data.dependencies ?? {}))
    const draftDependencies  = WorkbenchSDK.useStore(s => Object.values(s.data.draftDependencies ?? {}))
    const dependencyUpdates      = WorkbenchSDK.useStore(s => s.dependencyUpdates)
    const draftDependencyUpdates = WorkbenchSDK.useStore(s => s.draftDependencyUpdates)
    const [updatingAll, setUpdatingAll] = useState(false)

    const hasAnyUpdate =
        Object.keys(dependencyUpdates).length > 0 ||
        Object.keys(draftDependencyUpdates).length > 0

    const updateAll = async () => {
        setUpdatingAll(true)
        try {
            await WorkbenchSDK.actions.dependency.updateAll()
        } finally {
            setUpdatingAll(false)
        }
    }

    const isEmpty = dependencies.length === 0 && draftDependencies.length === 0

    return (
        <>
            {hasAnyUpdate && (
                <div className='p-0.5 bg-card rounded-full absolute top-2 right-2 z-100 border border-border shadow-lg shadow-black/10 gap-1 inline-flex'>
                    <Button variant='ghost' size='sm' className='rounded-full gap-1.5' onClick={updateAll} disabled={updatingAll}>
                        {updatingAll ? <Spinner className='size-3.5' /> : <SystemIcons.RefreshCcw className='size-3.5' />}
                        Update all
                    </Button>
                </div>
            )}

            {isEmpty ? (
                <div className='absolute top-1/2 -translate-y-1/2 w-full text-center text-sm text-muted-foreground'>
                    No dependencies
                </div>
            ) : (
                <div className='flex flex-col gap-2'>
                    {dependencies.map(dep => (
                        <PublishedDependencyRow
                            key={dep.workflow_id}
                            dep={dep}
                            updateInfo={dependencyUpdates[dep.workflow_id as Workflow.Id] ?? null}
                        />
                    ))}
                    {draftDependencies.map(dep => (
                        <DraftDependencyRow
                            key={dep.workflow_id}
                            dep={dep}
                            updateInfo={draftDependencyUpdates[dep.workflow_id as Workflow.Id] ?? null}
                        />
                    ))}
                </div>
            )}
        </>
    )
}

function PublishedDependencyRow({ dep, updateInfo }: {
    dep: Workflow.Dependency
    updateInfo: Workflow.Dependency.UpdateInfo | null
}) {
    const [isUpdating, setIsUpdating] = useState(false)

    const iconColor = dep.accent ? `var(--${dep.accent}-foreground)` : undefined
    const backgroundColor = dep.accent ? `color-mix(in srgb, var(--${dep.accent}) 25%, transparent)` : 'var(--muted)'

    const handleUpdate = async () => {
        if (!updateInfo) return
        setIsUpdating(true)
        try {
            await WorkbenchSDK.actions.dependency.published.update(updateInfo)
        } finally {
            setIsUpdating(false)
        }
    }

    return (
        <div className='rounded-md border border-border/50 bg-card/50 p-2.5 flex items-center gap-3'>
            <span
                className='flex size-7 shrink-0 items-center justify-center rounded-full'
                style={{ backgroundColor }}
            >
                <LazyIcon name='Graph' className='size-3.5' style={{ color: iconColor }} />
            </span>

            <div className='flex-1 min-w-0'>
                <p className='text-sm font-medium truncate'>{dep.display_name}</p>
                <p className='text-xs text-muted-foreground'>{dep.publication_name} · v{dep.version}</p>
            </div>

            {updateInfo ? (
                <Button variant='outline' size='sm' className='shrink-0 gap-1.5' onClick={handleUpdate} disabled={isUpdating}>
                    {isUpdating ? <Spinner className='size-3.5' /> : <SystemIcons.RefreshCcw className='size-3.5' />}
                    v{updateInfo.version}
                </Button>
            ) : (
                <span className='text-xs text-muted-foreground shrink-0'>Up to date</span>
            )}
        </div>
    )
}

function DraftDependencyRow({ dep, updateInfo }: {
    dep: Workflow.DraftDependency
    updateInfo: Workflow.DraftDependency.UpdateInfo | null
}) {
    const [isUpdating, setIsUpdating] = useState(false)

    const iconColor = dep.accent ? `var(--${dep.accent}-foreground)` : undefined
    const backgroundColor = dep.accent ? `color-mix(in srgb, var(--${dep.accent}) 25%, transparent)` : 'var(--muted)'

    const handleUpdate = async () => {
        if (!updateInfo) return
        setIsUpdating(true)
        try {
            await WorkbenchSDK.actions.dependency.draft.update(updateInfo)
        } finally {
            setIsUpdating(false)
        }
    }

    return (
        <div className='rounded-md border border-border/50 bg-card/50 p-2.5 flex items-center gap-3'>
            <span
                className='flex size-7 shrink-0 items-center justify-center rounded-full'
                style={{ backgroundColor }}
            >
                <LazyIcon name='Graph' className='size-3.5' style={{ color: iconColor }} />
            </span>

            <div className='flex-1 min-w-0'>
                <p className='text-sm font-medium truncate'>{dep.display_name}</p>
                <p className='text-xs text-muted-foreground'>draft</p>
            </div>

            {updateInfo ? (
                <Button variant='outline' size='sm' className='shrink-0 gap-1.5' onClick={handleUpdate} disabled={isUpdating}>
                    {isUpdating ? <Spinner className='size-3.5' /> : <SystemIcons.RefreshCcw className='size-3.5' />}
                    Update
                </Button>
            ) : (
                <span className='text-xs text-muted-foreground shrink-0'>Up to date</span>
            )}
        </div>
    )
}
