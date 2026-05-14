import { WorkbenchSDK } from '@/routes/workflow/-SDKs/WorkbenchSDK/sdk'
import { LibrarySDK } from '@/SDKs/LibrarySDK/sdk'
import { SystemSDK } from '@/SDKs/SystemSDK/sdk'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { DropdownMenu } from '@pretzel-graph/standard-ui/foundations'
import Breadcrumbs from '@/routes/home/projects/-components/Breadcrumbs'

export const PathPanel = () => {
    const workflowId = WorkbenchSDK.useStore(s => s.workflowId)
    const [folder_id, display_name] = LibrarySDK.useStore(s => {
        const meta = s.workflowMetas[workflowId]
        return [meta?.folder_id, meta?.display_name] as const
    })
    const breadCrumbs = LibrarySDK.useStore(s => {
        return LibrarySDK.selectors.getBreadcrumbs(s, folder_id);
    });

    return (
        <div className='fixed top-5 left-5 flex gap-3 text-sm font-medium'>
            <PretzelLogoDropdown />
            <Breadcrumbs className='my-auto' cwd={breadCrumbs} finalFileName={display_name} />
        </div>
    )
}

const PretzelLogoDropdown = () => {
    const theme = SystemSDK.useStore(s => s.theme);

    return (
        <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
                <SystemIcons.Pretzel size={30} className='text-primary cursor-pointer' />
            </DropdownMenu.Trigger>
            <DropdownMenu.Content align='start'>
                <h4 className='px-2 py-1 text-md font-medium text-primary'>
                    PretzelGraph.ai
                </h4>
                <DropdownMenu.Item>
                    <SystemIcons.User />
                    Account
                </DropdownMenu.Item>
                <DropdownMenu.Item>
                    <SystemIcons.Settings />
                    Settings
                </DropdownMenu.Item>
                <DropdownMenu.Separator />
                <DropdownMenu.RadioGroup value={theme} onValueChange={(value) => SystemSDK.actions.setTheme(value as "light" | "dark")}>
                    <p className='px-2 py-1 text-sm text-muted-foreground'>
                        Theme
                    </p>
                    <DropdownMenu.RadioItem value="light">
                        <SystemIcons.Sun />
                        Light
                    </DropdownMenu.RadioItem>
                    <DropdownMenu.RadioItem value="dark">
                        <SystemIcons.Moon />
                        Dark
                    </DropdownMenu.RadioItem>
                    <DropdownMenu.RadioItem value="system">
                        <SystemIcons.Monitor />
                        System
                    </DropdownMenu.RadioItem>
                </DropdownMenu.RadioGroup>
            </DropdownMenu.Content>
        </DropdownMenu.Root>
    )
}
