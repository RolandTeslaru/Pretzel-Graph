import { Button, Dialog } from '@pretzel-graph/standard-ui/foundations'
import { DialogSDK } from '@pretzel-graph/standard-ui/SDKs/DialogSDK'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { AssistantSDK } from '../../sdk'
import AssistantPanel from '../ConversationArea'
import AssistantList from './AssistantList'
import AuroraRays from '@/components/AuroraRays/AuroraRays'

const FullscreenAssistant = (props: DialogSDK.TemplateProps) => (
    <DialogSDK.SplitTemplate
        {...props}
        className='h-[90vh] w-[1050px]'
        sidebarClassName='w-[250px] shrink-0 p-0! gap-0!'
        contentClassName='relative p-0! gap-0!'
        sidebarRenderer={() => <AssistantList />}
    >
        <Dialog.Title className='hidden'>Assistant</Dialog.Title>
        <Dialog.Description className='hidden'>Chat with the workflow assistant</Dialog.Description>

        <div className='pointer-events-none absolute top-0 left-0 w-full h-2/3 z-[-1] -scale-x-100'>
            <AuroraRays />
        </div>
        <Header />
        <AssistantPanel />
    </DialogSDK.SplitTemplate>
)

export default FullscreenAssistant

const Header = () => {
    const currentAssistantName = AssistantSDK.useStore(s => s.assistants[s.currentAssistantId]?.name)

    return (
        <div className='flex flex-row gap-2 absolute top-2 w-[calc(100%-16px)] left-2 z-10'>
            <div
                className='flex items-center gap-2 py-1.5 px-2 rounded-full backdrop-blur-sm'
                style={{ backgroundColor: 'color-mix(in srgb, var(--port-LanguageModel) 25%, transparent)' }}
            >
                <SystemIcons.Sparkles className='my-auto h-4 w-4 fill-current' style={{ color: 'var(--port-LanguageModel-foreground)' }} />
                <p className='text-xs font-semibold text-(--port-LanguageModel-foreground)'>Assistant</p>
            </div>
            <p className='text-xs font-medium text-center h-auto p-1 my-auto truncate'>{currentAssistantName}</p>
            <div className='flex flex-row gap-2 border border-border bg-card-float rounded-full ml-auto my-auto h-auto p-0.5 shadow-md shadow-black/10'>
                <Button size="icon-xs" variant="ghost" onClick={() => AssistantSDK.actions.thread.new()}>
                    <SystemIcons.Plus className='text-secondary-foreground' />
                </Button>
                <Button size="icon-xs" variant="ghost" onClick={() => AssistantSDK.actions.ui.closeFullscreen()}>
                    <SystemIcons.Minimize2 className='text-secondary-foreground' />
                </Button>
            </div>
        </div>
    )
}
