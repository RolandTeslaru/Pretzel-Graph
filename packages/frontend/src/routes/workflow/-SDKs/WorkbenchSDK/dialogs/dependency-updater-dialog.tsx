import { useState } from 'react'
import { Button, ScrollArea, Spinner } from '@pretzel-graph/standard-ui/foundations'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { IconRenderer } from '@pretzel-graph/standard-ui/icons/IconRenderer'
import { DialogSDK } from '@pretzel-graph/standard-ui/SDKs/DialogSDK'
import { WorkbenchSDK } from '../sdk'
import type { Dependency } from '@pretzel-graph/shared/domain'
import { getDependencyDisplay } from '../utils/dependency'

const DIALOG_ID = 'dependency-updater'

interface Props {
    dialogId: string
    title:    string
    updates:  Dependency.Update[]
}

export function openDependencyUpdaterDialog(updates: Dependency.Update[], title: string) {
    DialogSDK.actions.push(DIALOG_ID, (props) => (
        <DialogSDK.SplitTemplate
            {...props}
            sidebarClassName='w-[260px]'
            contentClassName='p-0! relative'
            sidebarRenderer={() => (
                <div className='flex flex-col gap-2'>
                    <div className='flex flex-row items-center gap-2'>
                        <SystemIcons.ArrowBigUpDash className='size-5 shrink-0' />
                        <p className='text-md font-semibold text-foreground'>Dependency Updater</p>
                    </div>

                    <p className='text-xs text-muted-foreground'>
                        Dependencies are embeded in this workflow. Updating them replaces the snapshots.
                    </p>
                </div>
            )}
        >
            <DependencyUpdaterContent dialogId={DIALOG_ID} title={title} updates={updates} />
        </DialogSDK.SplitTemplate>
    ))
}

const DependencyUpdaterContent = ({ dialogId, title, updates }: Props) => {
    const [isUpdatingAll, setIsUpdatingAll] = useState(false)

    // Applies the updates still pending; closes once they all land.
    const updateAll = async () => {
        const document = WorkbenchSDK.document
        const pending  = updates.filter(update => document.selectors.dependency.hasUpdate(document, update))

        setIsUpdatingAll(true)

        const results = await Promise.all(pending.map(update => WorkbenchSDK.actions.dependency.update(update)))

        setIsUpdatingAll(false)

        if (results.every(Boolean))
            DialogSDK.actions.pop(dialogId)
    }

    return (
        <>
            {/* Header */}
            <div className='pointer-events-none absolute top-0 w-full left-0 z-90 flex flex-row gap-2 items-center px-4 pt-5 pb-4'>
                <p className='text-sm font-medium text-foreground'>{title}</p>
            </div>

            {/* Content */}
            <ScrollArea.Root className='h-[360px] w-[420px] [mask-image:linear-gradient(to_bottom,transparent_0,transparent_0px,black_80px)]'>
                <div className='relative min-h-full pt-16 pb-20 px-4 flex flex-col gap-3'>
                    {updates.map(update => (
                        <UpdateRow key={`${update.kind}:${update.id}`} update={update} />
                    ))}
                </div>
            </ScrollArea.Root>

            {/* Footer */}
            <div className='pointer-events-none absolute bottom-0 left-0 right-0 px-4 pb-4 pt-2 w-full flex'>
                <div className='ml-auto gap-2 flex'>
                    <Button type='button' variant='outline' className='pointer-events-auto rounded-full' onClick={() => DialogSDK.actions.pop(dialogId)}>
                        Close
                    </Button>
                    <Button type='button' className='pointer-events-auto rounded-full' onClick={updateAll} disabled={isUpdatingAll}>
                        {isUpdatingAll ? <Spinner className='size-3.5' /> : <SystemIcons.RefreshCcw className='size-3.5' />}
                        Update all
                    </Button>
                </div>
            </div>
        </>
    )
}

const UpdateRow = ({ update }: { update: Dependency.Update }) => {
    const [isUpdating, setIsUpdating] = useState(false)

    const [dependency, isPending] = WorkbenchSDK.useDocument(d => [
        d.selectors.dependency.get(d, update),
        d.selectors.dependency.hasUpdate(d, update),
    ])

    const iconColor       = dependency?.accent ? `var(--${dependency.accent}-foreground)` : undefined
    const backgroundColor = dependency?.accent ? `color-mix(in srgb, var(--${dependency.accent}) 25%, transparent)` : 'var(--muted)'

    const handleUpdate = async () => {
        setIsUpdating(true)

        try {
            await WorkbenchSDK.actions.dependency.update(update)
        } finally {
            setIsUpdating(false)
        }
    }

    return (
        <div className=' flex items-center gap-3'>

            <div className='flex-1 min-w-0'>
                <p className='text-xs font-medium truncate'>{dependency ? getDependencyDisplay(dependency).name : 'Unknown dependency'}</p>
                <p className='text-xs text-muted-foreground truncate'>{describeUpdate(update)}</p>
            </div>

            {isPending ? (
                <Button variant="ghost-active" size='xs' className='shrink-0 gap-1.5' onClick={handleUpdate} disabled={isUpdating}>
                    {isUpdating ? <Spinner className='size-3.5' /> : <SystemIcons.RefreshCcw className='size-3.5' />}
                    Update
                </Button>
            ) : (
                <span className='text-xs text-muted-foreground shrink-0'>Updated</span>
            )}
        </div>
    )
}

// What the update brings, in one line.
function describeUpdate(update: Dependency.Update): string {
    switch (update.kind) {
        case 'draftWorkflow':
            return 'Draft saved with changes'

        case 'publishedWorkflow':
        case 'listing':
            return `${update.name} · v${update.version}`

        case 'skill':
            return 'Skill saved with changes'
    }
}
