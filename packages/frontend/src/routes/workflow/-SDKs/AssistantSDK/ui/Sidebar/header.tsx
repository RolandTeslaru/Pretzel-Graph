import { AssistantSDK } from '../../sdk'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { Button } from '@pretzel-graph/standard-ui/foundations'
import FloatContainer from '@/components/FloatContainer'

const Header = () => {
    return (
        <div className='flex flex-row gap-2 absolute top-2 w-[calc(100%-16px)] left-2 z-20'>
            <div
                className='flex items-center gap-2 px-2 py-1 rounded-full'
                style={{ backgroundColor: 'color-mix(in srgb, var(--port-LanguageModel) 25%, transparent)' }}
            >
                <SystemIcons.Sparkles className='my-auto h-4 w-4 fill-current' style={{ color: 'var(--port-LanguageModel-foreground)' }} />
                <h4
                    className='text-sm h-auto my-auto truncate font-semibold pr-1'
                    style={{ color: 'var(--port-LanguageModel-foreground)' }}
                >
                    Assistant
                </h4>
            </div>
            <FloatContainer className='ml-auto'>
                <Button size="icon-xs" variant="ghost" onClick={() => AssistantSDK.actions.thread.new()}>
                    <SystemIcons.Plus className='text-secondary-foreground' />
                </Button>
                <Button size="icon-xs" variant="ghost" onClick={() => AssistantSDK.actions.ui.openFullscreen()}>
                    <SystemIcons.Maximize2 className='text-secondary-foreground' />
                </Button>
            </FloatContainer>
        </div>
    )
}

export default Header
