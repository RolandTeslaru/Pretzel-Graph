import { useState } from 'react'
import { Button, Dialog, Spinner } from '@pretzel-graph/standard-ui/foundations'
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
            contentClassName='p-0!'
            sidebarRenderer={() => (
                <DialogSDK.SplitTemplate.Header>
                    <DialogSDK.SplitTemplate.Icon icon={SystemIcons.ArrowBigUpDash} />
                    <DialogSDK.SplitTemplate.Title>Dependency Updater</DialogSDK.SplitTemplate.Title>
                    <DialogSDK.SplitTemplate.Description>
                        Dependencies are embeded in this workflow. Updating them replaces the snapshots.
                    </DialogSDK.SplitTemplate.Description>
                </DialogSDK.SplitTemplate.Header>
            )}
        >
            <Dialog.Description className='hidden'>Update the dependencies embedded in this workflow</Dialog.Description>
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
            <Dialog.FloatingHeader title={title} />

            <Dialog.MaskedScrollArea className='h-[360px] w-[420px]'>
                {updates.map(update => (
                    <UpdateRow key={`${update.kind}:${update.id}`} update={update} />
                ))}
            </Dialog.MaskedScrollArea>

            <Dialog.FloatingFooter>
                <Dialog.Cancel>
                    Close
                </Dialog.Cancel>
                <Dialog.Action onClick={updateAll} loading={isUpdatingAll}>
                    {!isUpdatingAll && <SystemIcons.RefreshCcw />}
                    Update all
                </Dialog.Action>
            </Dialog.FloatingFooter>
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
