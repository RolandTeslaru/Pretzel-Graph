import { Input, ScrollArea, Spinner } from '@vx-agent-editor/vx-ui/foundations'
import { useMemo, memo, useEffect, useState } from 'react'
import { WorkbenchSDK } from '../../sdk'
import { StackSDK } from '@/SDKs/StackSDK'
import { Foundations, Workflow } from '@vx-agent-editor/shared/domain';
import { Accordion } from '@vx-agent-editor/vx-ui/foundations/accordion';
import { FieldRenderer } from '../FieldRenderer';
import { InputRenderer } from '../InputRenderer';
import { PortBadge } from '../PortBadge';
import JsonView from 'react18-json-view';
import { ExecutionSessionSDK } from '@/SDKs/ExecutionSessionSDK/sdk';
import { NodeSidebarHeader } from './header';
import { NodeSidebarFooter } from './footer';
import IncomingPanel from './IncomingPanel';


const NodeSidebar = () => {
    const clickedNode = WorkbenchSDK.useStore(s => s.clickedNodeId ? s.workflow.data.nodes[s.clickedNodeId] : null);

    useEffect(() => {
        if (clickedNode) {
            StackSDK.actions.push("nodeSidebar", (props) => (
                <StackSDK.Template {...props}>
                    <Content clickedNode={clickedNode} />
                </StackSDK.Template>
            ))
        } else {
            StackSDK.actions.pop("nodeSidebar")
        }
    }, [clickedNode])

    return null
}

export default NodeSidebar


const EMPTY_OBJECT = {}

const Content = memo(({ clickedNode: node }: { clickedNode: Workflow.Node }) => {
    const [isEditing, setIsEditing] = useState(false)
    const connectedPorts = WorkbenchSDK.useStore(s => s.cache.inputHandlesMap[node.id] || EMPTY_OBJECT)

    const { fields, inputs, connectedInputs } = useMemo(() => {
        const connectedInputs: Foundations.Port.Input[] = [];
        const inputs: Foundations.Port.Input[] = [];

        node.inputs.filter(inp => !inp.internal).forEach(input => {
            if (connectedPorts[input.id])
                connectedInputs.push(input);
            else
                inputs.push(input);
        });

        return {
            fields: node.fields.filter(f => !f.hidden),
            inputs,
            connectedInputs,
        };
    }, [connectedPorts, node.inputs, node.fields]);

    const defaultOpen = useMemo(() => {
        const sections: string[] = [];
        sections.push("output");

        if (fields.length > 0)
            sections.push("fields");
        if (inputs.length > 0)
            sections.push("inputs");
        if (connectedInputs.length > 0)
            sections.push("connected");
        return sections;
    }, []);

    return (
        <>
            <NodeSidebarHeader
                node={node}
                isEditing={isEditing}
                onEditStart={() => setIsEditing(true)}
                onEditFinish={() => setIsEditing(false)}
            />

            <NodeSidebarFooter />

            {/* Sections */}
            <ScrollArea.Root className='mask-[linear-gradient(to_bottom,transparent,black_48px,black_calc(100%-48px),transparent)]'>
                {(node.description || isEditing) && (
                    <div className='py-2 px-2 pt-14'>
                        {isEditing ? (
                            <Input
                                className='text-xs bg-transparent shadow-none focus-visible:ring-0 text-muted-foreground placeholder:text-muted-foreground/50'
                                defaultValue={node.description as string}
                                placeholder='Add a description...'
                                onBlur={e => WorkbenchSDK.actions.node.setDescription(node.id, e.target.value)}
                            />
                        ) : (
                            <p className='text-muted-foreground text-xs'>
                                {node.description}
                            </p>
                        )}
                    </div>
                )}
                <Accordion.Root
                    type="multiple"
                    defaultValue={defaultOpen}
                    className='pb-14'
                >
                    {inputs.length > 0 && (
                        <Accordion.Item value='inputs' className='border-none'>
                            <Accordion.Trigger className='px-4 cursor-pointer hover:no-underline'>
                                <h4 className='text-md font-medium'>Inputs</h4>
                            </Accordion.Trigger>
                            <Accordion.Content className='flex flex-col gap-1 bg-background/50'>
                                {inputs.map(input => (
                                    <InputItem key={input.id} input={input} nodeId={node.id} />
                                ))}
                            </Accordion.Content>
                        </Accordion.Item>
                    )}
                    {/* Fields */}
                    {fields.length > 0 && (
                        <Accordion.Item value='fields' className='border-none'>
                            <Accordion.Trigger className='px-4 cursor-pointer hover:no-underline'>
                                <h4 className='text-md font-medium'>Fields</h4>
                            </Accordion.Trigger>
                            <Accordion.Content className='flex flex-col gap-1 bg-background/60'>
                                {fields.map(field => (
                                    <div key={field.id} className='px-4 py-2'>
                                        <FieldRenderer field={field} nodeId={node.id} />
                                    </div>
                                ))}
                            </Accordion.Content>
                        </Accordion.Item>
                    )}
                </Accordion.Root>
            </ScrollArea.Root>
        </>
    )
})


const InputItem = memo(({ input, nodeId }: { input: Foundations.Port.Input, nodeId: Workflow.Node.Id }) => {
    return (
        <div className='px-4 py-2'>
            <InputRenderer input={input} nodeId={nodeId} />
        </div>
    )
})


const IncomingData = memo(({ nodeId }: { nodeId: Workflow.Node.Id }) => {
    const session = ExecutionSessionSDK.useStore(s => s.session);
    const data = WorkbenchSDK.useStore(s => WorkbenchSDK.selectors.execution.getNodeIncomingData(s, nodeId, session));

    if (!data)
        return null;

    return (
        <JsonView src={data as Record<string, unknown>} className='text-xs' collapsed={3} />
    )
})

const NodeOutputs = memo(({ nodeId }: { nodeId: Workflow.Node.Id }) => {
    const output = ExecutionSessionSDK.useStore(s => s.session.node_output_projections[nodeId]);

    if (!output)
        return null;

    return (
        <JsonView src={output} className='text-xs' collapsed={3}   />
    )
})
