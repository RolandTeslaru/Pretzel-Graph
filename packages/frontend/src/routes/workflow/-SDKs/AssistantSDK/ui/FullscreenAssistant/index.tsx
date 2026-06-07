import { Button } from '@pretzel-graph/standard-ui/foundations'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { AssistantSDK } from '../../sdk'
import AssistantPanel from '../AssistantPanel'
import AssistantList from './AssistantList'
import Aurora from '@/components/Aurora/Aurora'
import { createAuroraCtx } from '@/components/Aurora/createAuroraCtx'

// Dedicated ctx so the fullscreen aurora never contends with the sidebar's
// canvas (the two can be mounted at the same time while the dialog opens).
const auroraCtx = createAuroraCtx()

const FullscreenAssistant = () => {
    return (
        <div className="flex flex-row gap-10 h-[90vh]">
            <div className='bg-card/80 border border-border/50 rounded-2xl shadow-sm shadow-black/10 w-[250px] p-0 backdrop-blur-lg overflow-hidden'>
                <AssistantList />
            </div>
            <div className='lg:w-[800px] bg-card/80 border border-border/50 rounded-2xl shadow-sm shadow-black/10 overflow-hidden backdrop-blur-lg relative'>
                <div className='pointer-events-none absolute top-0 left-0 w-full h-2/3 opacity-50 z-0'>
                    <Aurora
                        ctx={auroraCtx}
                        colorStops={["#E879F9", "#A855F7", "#6366F1"]}
                        blend={0.4}
                        amplitude={0.6}
                        speed={0.5}
                    />
                </div>
                <Header />
                <AssistantPanel />
            </div>
        </div>
    )
}

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
