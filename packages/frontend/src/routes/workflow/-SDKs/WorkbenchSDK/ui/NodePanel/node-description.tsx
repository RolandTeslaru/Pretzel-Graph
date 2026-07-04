import { Input } from '@pretzel-graph/standard-ui/foundations'
import { Workflow } from '@pretzel-graph/shared/domain'
import { WorkbenchSDK } from '../../sdk'

interface NodeDescriptionProps {
    node: Workflow.Node
    isEditing: boolean
}

export const NodeDescription = ({ node, isEditing }: NodeDescriptionProps) => {
    if (!node.ui.description && !isEditing) return null

    return (
        <div className='py-2 px-2 pt-14'>
            {isEditing ? (
                <Input
                    className='text-xs bg-transparent shadow-none focus-visible:ring-0 text-muted-foreground placeholder:text-muted-foreground/50'
                    defaultValue={node.ui.description as string}
                    placeholder='Add a description...'
                    onBlur={e => WorkbenchSDK.actions.node.setDescription(node.id, e.target.value)}
                />
            ) : (
                <p className='text-muted-foreground text-xs'>
                    {node.ui.description}
                </p>
            )}
        </div>
    )
}

