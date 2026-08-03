import { memo } from 'react'
import { Foundations, Workflow } from '@pretzel-graph/shared/domain'
import { INPUT_RENDERER_MAP } from '../InputsRenderer'

export const InputItem = memo(({ input, nodeId }: { input: Foundations.Port.Input, nodeId: Workflow.Node.Id }) => {

    const Component = INPUT_RENDERER_MAP[input.variant] as React.ComponentType<{
        input: Foundations.Port.Input
        nodeId: Workflow.Node.Id
        className?: string
        isFlipped?: boolean
    }> | undefined

    if (Component)
        return (
            <div className='px-4'>
                <Component input={input} nodeId={nodeId} />
            </div>
        )

    return null
})
