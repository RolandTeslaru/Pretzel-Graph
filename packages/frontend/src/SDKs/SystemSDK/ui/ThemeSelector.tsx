import { Tabs } from '@vx-agent-editor/vx-ui/foundations'
import { SystemIcons } from '@vx-agent-editor/vx-ui/icons'
import { SystemSDK } from '../sdk'

const ThemeSelector = () => {
    const theme = SystemSDK.useStore(s => s.theme);

    return (
        <Tabs.Root defaultValue="light" value={theme}
            onValueChange={(value) => {
                SystemSDK.actions.setTheme(value as "light" | "dark")
            }}
        >
            <Tabs.List size="sm" variant="primary">
                <Tabs.Trigger value="light" className="gap-2">
                    <SystemIcons.Sun size={15} />
                    Light
                </Tabs.Trigger>
                <Tabs.Trigger value="dark" className="gap-2">
                    <SystemIcons.Moon size={15} />
                    Dark
                </Tabs.Trigger>
            </Tabs.List>
        </Tabs.Root>
    )
}

export default ThemeSelector