import type { CSSProperties } from 'react'
import { DialogSDK } from '@pretzel-graph/standard-ui/SDKs/DialogSDK'
import { SidebarTabs } from '@pretzel-graph/standard-ui/components/SidebarTabs'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { CredentialsSettings } from './CredentialsSettings'
import { DependenciesSettings } from './DependenciesSettings'
import { GeneralSettings } from './GeneralSettings'
import { GlobalFieldsSettings } from './GlobalFieldsSettings'
import { VersionControlSettings } from './VersionControlSettings'

const DIALOG_ID = 'workflow-configuration'

export function openWorkflowSettingsDialog() {
    DialogSDK.actions.push(DIALOG_ID, (props) => (
        <DialogSDK.UnstyledTemplate {...props} className={'sm:max-w-[680px] w-full'}>
            <WorkflowSettings surfaceStyle={props.surfaceStyle} blockTransparency={props.blockTransparency} />
        </DialogSDK.UnstyledTemplate>
    ))
}

const ITEMS: SidebarTabs.Item[] = [
    { id: 'general',         label: 'General',         icon: SystemIcons.Settings,          panel: <GeneralSettings /> },
    { id: 'globalFields',    label: 'Global Fields',   icon: SystemIcons.SlidersHorizontal, panel: <GlobalFieldsSettings /> },
    { id: 'version-control', label: 'Version Control', icon: SystemIcons.History,           panel: <VersionControlSettings /> },
    { id: 'dependencies',    label: 'Dependencies',    icon: SystemIcons.Link,              panel: <DependenciesSettings /> },
    { id: 'credentials',     label: 'Credentials',     icon: SystemIcons.Key,               panel: <CredentialsSettings /> },
]

type SurfaceProps = { surfaceStyle: CSSProperties; blockTransparency: boolean }

const WorkflowSettings = ({ surfaceStyle, blockTransparency }: SurfaceProps) => (
    <SidebarTabs
        surfaceStyle={surfaceStyle}
        blockTransparency={blockTransparency}
        header={{ icon: SystemIcons.Cog, title: 'Workflow Settings' }}
        items={ITEMS}
        empty={{
            icon: <SystemIcons.Cog className='size-8 text-muted-foreground/50' />,
            title: 'Workflow Settings',
            description: 'Configure your workflow — set global fields, manage credentials, control versioning, and more.',
        }}
    />
)

export default WorkflowSettings
