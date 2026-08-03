import { DialogSDK } from '@/SDKs/DialogSDK'
import { ScrollArea, Separator } from '@pretzel-graph/standard-ui/foundations'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import React, { useState } from 'react'
import { CredentialsSettings } from './CredentialsSettings'
import { DependenciesSettings } from './DependenciesSettings'
import { GeneralSettings } from './GeneralSettings'
import { GlobalFieldsSettings } from './GlobalFieldsSettings'
import { VersionControlSettings } from './VersionControlSettings'
import { cn } from '@/utils/styleUtils'

const DIALOG_ID = 'workflow-configuration'

export function openWorkflowSettingsDialog() {
    DialogSDK.actions.push(DIALOG_ID, (props) => (
        <DialogSDK.Template {...props} className={'sm:max-w-[680px] w-full'}>
            <WorkflowSettings />
        </DialogSDK.Template>
    ))
}

type ItemId = 'general' | 'globalFields' | 'version-control' | 'dependencies' | 'credentials'

const ITEMS: { id: ItemId; icon: React.FC<React.SVGProps<SVGSVGElement>>; label: string }[] = [
    { id: 'general', icon: SystemIcons.Settings, label: 'General' },
    { id: 'globalFields', icon: SystemIcons.SlidersHorizontal, label: 'Global Fields' },
    { id: 'version-control', icon: SystemIcons.History, label: 'Version Control' },
    { id: 'dependencies', icon: SystemIcons.Link, label: 'Dependencies' },
    { id: 'credentials', icon: SystemIcons.Key, label: 'Credentials' },
]

const LABELS: Record<ItemId, string> = {
    'general': 'General',
    'globalFields': 'Global Fields',
    'version-control': 'Version Control',
    'dependencies': 'Dependencies',
    'credentials': 'Credentials',
}

const PANELS: Record<ItemId, React.FC> = {
    'general': GeneralSettings,
    'globalFields': GlobalFieldsSettings,
    'version-control': VersionControlSettings,
    'dependencies': DependenciesSettings,
    'credentials': CredentialsSettings,
}

const WorkflowSettings = () => {
    const [activeId, setActiveId] = useState<ItemId | null>(null)
    const ActivePanel = activeId ? PANELS[activeId] : null

    return (
        <div className='pl-2 flex flex-row gap-4 !overflow-hidden'>
            <div className='p-0.5 py-2 w-50  shrink-0 border-r border-border'>
                <div className='inline-flex items-center px-1'>
                    <SystemIcons.Cog className='size-4 m-2' />
                    <p className='font-medium text-sm'>Workflow Settings</p>
                </div>
                <Separator className='w-[calc(100%-0.5rem)]! mx-auto' />
                <div className='py-2 px-1 flex flex-col gap-1'>
                    {ITEMS.map(item => (
                        <div
                            key={item.id}
                            onClick={() => setActiveId(item.id)}
                            className={cn(
                                'flex flex-row items-center gap-2 px-2 py-1 rounded-md cursor-pointer hover:bg-accent/30',
                                activeId === item.id && 'bg-accent/50'
                            )}
                        >
                            <item.icon className='size-4' />
                            <p className='text-sm'>{item.label}</p>
                        </div>
                    ))}
                </div>
            </div>
            <ScrollArea.Root className='flex-1 min-h-[600px] max-h-[600px] pr-2'>
                <div className='inline-flex z-100 items-center absolute w-full top-0 left-0 gap-2 h-9 mt-2 shrink-0'>
                    <p className='text-sm font-medium'>{activeId && LABELS[activeId]}</p>
                </div>
                {ActivePanel ? <>
                    <div className='content-[" "] h-12'></div>
                    <ActivePanel />

                </> : (
                    <div className='absolute top-1/2 -translate-1/2 left-1/2 w-[300px] flex flex-col gap-2 p-6 h-full justify-center items-center text-center'>
                        <SystemIcons.Cog className='size-8 text-muted-foreground/50' />
                        <p className='text-sm font-medium'>Workflow Settings</p>
                        <p className='text-xs text-muted-foreground max-w-55'>
                            Configure your workflow — set global fields, manage credentials, control versioning, and more.
                        </p>
                    </div>
                )}
            </ScrollArea.Root>
        </div>
    )
}

export default WorkflowSettings
