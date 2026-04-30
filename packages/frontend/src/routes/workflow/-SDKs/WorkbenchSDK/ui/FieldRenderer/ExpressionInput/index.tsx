import { Workflow } from '@pretzel-graph/shared/domain'
import { Input, Tooltip } from '@pretzel-graph/standard-ui/foundations'
import { cn } from '@pretzel-graph/standard-ui/utils/cn'
import { TooltipContent } from './TooltipContent'

interface Props {
    value: string
    nodeId: Workflow.Node.Id
    onChange: (value: string) => void
    onCommit: (value: string) => void
    side?: React.ComponentProps<typeof Tooltip.Content>['side']
    className?: string
    placeholder?: string
}

export const ExpressionInput = ({
    value,
    nodeId,
    onChange,
    onCommit,
    side = 'left',
    className,
    placeholder,
}: Props) => {
    return (
        <Tooltip.Root>
            <Tooltip.Trigger asChild>
                <div className='relative flex items-center w-full'>
                    <Input
                        value={value}
                        variant='ghost-no-focus'
                        size='xs'
                        placeholder={placeholder}
                        className={cn(className)}
                        onChange={(e) => onChange(e.currentTarget.value)}
                        onBlur={() => onCommit(value)}
                    />
                </div>
            </Tooltip.Trigger>
            <Tooltip.Content side={side} align='center'>
                <TooltipContent nodeId={nodeId} value={value} />
            </Tooltip.Content>
        </Tooltip.Root>
    )
}
