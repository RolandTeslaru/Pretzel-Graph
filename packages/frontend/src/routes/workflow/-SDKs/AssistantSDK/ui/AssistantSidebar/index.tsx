import { memo, useEffect } from 'react'
import { AssistantSDK } from '../../sdk'
import { StackSDK } from '@/routes/workflow/-SDKs/StackSDK'
import AssistantPanel from '../AssistantPanel'
import AssistantSidebarHeader from './header'
import Aurora from '@/components/Aurora/Aurora'
import { createAuroraCtx } from '@/components/Aurora/createAuroraCtx'

// Created once outside the component so the WebGL renderer/canvas survive the
// frequent mount/unmount cycles of the Assistant sidebar.
const auroraCtx = createAuroraCtx()

const AssistantSidebar = () => {
    const isSidebarVisible = AssistantSDK.useStore(s => s.isSidebarVisible)

    useEffect(() => {
        if (isSidebarVisible) {
            StackSDK.actions.push("assistantSidebar", (props) => (
                <StackSDK.Template {...props}>
                    <AssistantSidebarContent />
                </StackSDK.Template>
            ))
        } else {
            StackSDK.actions.pop("assistantSidebar")
        }
    }, [isSidebarVisible])

    return null
}

export default AssistantSidebar

const AssistantSidebarContent = memo(() => {
    return (
        <div className='flex flex-col h-full relative'>
            <div className='pointer-events-none absolute top-0 left-0 w-full h-2/3 opacity-50 z-0'>
                <Aurora
                    ctx={auroraCtx}
                    colorStops={["#E879F9", "#A855F7", "#6366F1"]}
                    blend={0.4}
                    amplitude={0.6}
                    speed={0.5}
                />
            </div>
            <AssistantSidebarHeader />
            <AssistantPanel messagesAreaClassname='pt-[60px]' />
        </div>
    )
})
