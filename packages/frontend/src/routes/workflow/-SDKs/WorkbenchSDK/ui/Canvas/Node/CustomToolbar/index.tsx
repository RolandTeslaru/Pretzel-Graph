import { WorkbenchSDK } from '@/routes/workflow/-SDKs/WorkbenchSDK/sdk'
import { Button } from '@pretzel-graph/standard-ui/foundations'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import type { Workflow } from '@pretzel-graph/shared/domain'
import React, { memo } from 'react'
import type { Field } from '@pretzel-graph/shared/domain/Foundations/Field'
import { useRouter } from '@tanstack/react-router'
import { OptionsDropdown } from './OptionsDropdown'

interface Props {
    node: Workflow.Node
}

export const NodeCustomToolbar: React.FC<Props> = memo(({ node }) => {
    const router = useRouter()
    const isSubWorkflowNode = node.blueprintId === "Core.SubWorkflow.Execute"

    return (
        <div className='bg-card border border-border rounded-lg p-0.5 gap-1 flex flex-row shadow-md shadow-black/10'>
            <Button variant="ghost" size="icon-xs" className='h-6!'
                onClick={() => {
                    WorkbenchSDK.actions.node.setMinimized(node.id, !node.isMinimized)
                }}
            >
                {node.isMinimized ?
                    <SystemIcons.Maximize2 />
                    :
                    <SystemIcons.Minimize2 />
                }
            </Button>
            <Button variant="ghost" size="icon-xs" className='h-6!'
                onClick={() => {
                    WorkbenchSDK.actions.node.setFlipped(node.id, !node.isFlipped)
                }}
            >
                <SystemIcons.ArrowLeftRight />
            </Button>
            {isSubWorkflowNode && (
                <Button variant="ghost-active" size="icon-xs" className='h-6!'
                    onClick={() => {
                        const state = WorkbenchSDK.state;
                        const workflowId =WorkbenchSDK.selectors.field.getValue(state, node.id, "workflowId" as Field.Id) as Workflow.Id | null
                        const href = router.buildLocation({ to: "/workflow/$workflowid", params: { workflowid: workflowId || ""  } }).href;
                        window.open(href, "_blank");
                    }}
                >
                    <SystemIcons.Graph/>
                </Button>
            )}
            <Button variant="ghost-success" size="icon-xs" className='text-xs'>
                <SystemIcons.Play />
            </Button>
            {node.toolCompatible && (
                <ToolButton node={node} />
            )}
            <OptionsDropdown node={node} />
        </div>
    )
})


const ToolButton: React.FC<Props> = memo(({ node }) => {
    const isTool = WorkbenchSDK.useStore(s => WorkbenchSDK.selectors.node.isTool(s, node.id));

    return (
        <Button variant="ghost" size="icon-xs" className={`h-6! ${isTool ? 'bg-(--port-Tool)/20 text-(--port-Tool) ' : ''}`}
            onClick={() => {
                if (isTool) WorkbenchSDK.actions.tool.revert(node.id);
                else WorkbenchSDK.actions.tool.convert(node.id);
            }}
        >
            <SystemIcons.Hammer />
        </Button>
    );
});
