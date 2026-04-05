import { Button, ScrollArea, Spinner } from '@vx-agent-editor/vx-ui/foundations'
import { useMemo, memo, useEffect } from 'react'
import { WorkbenchSDK } from '../../sdk'
import { StackSDK } from '@/SDKs/StackSDK'
import { Foundations, Workflow } from '@vx-agent-editor/shared/domain';
import { Accordion } from '@vx-agent-editor/vx-ui/foundations/accordion';
import { LazyIcon } from '@vx-agent-editor/vx-ui/icons/LazyIcon';
import { FieldRenderer } from '../FieldRenderer';
import { InputRenderer } from '../InputRenderer';
import { PortBadge } from '../PortBadge';
import JsonView from 'react18-json-view';
import { ExecutionSessionSDK } from '@/SDKs/ExecutionSessionSDK/sdk';
import { SystemIcons } from '@vx-agent-editor/vx-ui/icons';


const NodeSidebar = () => {
    const clickedNode = WorkbenchSDK.useStore(s => s.clickedNodeId ? s.workflow.data.nodes[s.clickedNodeId] : null);

    useEffect(() => {
        if (clickedNode)
            StackSDK.actions.push("nodeSidebar", (props) => (
                <StackSDK.Template {...props}>
                    <Content clickedNode={clickedNode} />
                </StackSDK.Template>
            ))
        else
            StackSDK.actions.pop("nodeSidebar")
    }, [clickedNode])

    return null
}

export default NodeSidebar


const EMPTY_OBJECT = {}

const Content = memo(({ clickedNode: node }: { clickedNode: Workflow.Node }) => {
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
            fields: node.fields,
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
            {/* Header */}
            <div className='absolute top-2 left-2 flex flex-row bg-card w-[calc(100%-16px)] p-1 rounded-full border border-border shadow-sm shadow-black/10'>
                <div
                    className='flex items-center gap-2 px-3 py-1 rounded-full'
                    style={{
                        backgroundColor: node.accent ? `color-mix(in srgb, var(--${node.accent}) 25%, transparent)` : 'var(--muted)',
                    }}
                >
                    <LazyIcon
                        className='my-auto h-4 w-4'
                        name={node.icon as string}
                        style={{ color: node.accent ? `var(--${node.accent}-foreground)` : undefined }}
                    />
                    <h4
                        className='text-sm font-semibold'
                        style={{ color: node.accent ? `var(--${node.accent}-foreground)` : undefined }}
                    >
                        {node.displayName}
                    </h4>
                </div>
                <div className='flex flex-row gap-2 ml-auto my-auto h-auto px-1'>
                    <Button size="icon-xs" variant="ghost" >
                        <SystemIcons.Wrench className='text-secondary-foreground' />
                    </Button>
                    <Button size="icon-xs" variant="ghost" >
                        <SystemIcons.Ellipsis className='text-secondary-foreground' />
                    </Button>
                </div>
            </div>
            {node.description && (
                <div className=' py-2 px-2 pt-14'>
                    <p className='text-muted-foreground text-xs'>
                        {node.description}
                    </p>
                </div>
            )}

            {/* Sections */}
            <ScrollArea.Root>
                <Accordion.Root
                    type="multiple"
                    defaultValue={defaultOpen}
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

                    {/* Connected Inputs */}
                    {/* {connectedInputs.length > 0 && (
                        <Accordion.Item value='connected' className='border-none'>
                            <Accordion.Trigger className='px-4 cursor-pointer hover:no-underline'>
                                <h4 className='text-md font-medium'>Connected</h4>
                            </Accordion.Trigger>
                            <Accordion.Content className='flex flex-col gap-1 bg-background/50'>
                                {connectedInputs.map(input => (
                                    <div key={input.id} className='px-4 py-2 flex items-center gap-2 opacity-60'>
                                        <PortBadge portVariant={input.variant} />
                                        <span className='text-sm font-medium'>{input.displayName}</span>
                                        {input.required && <span className="text-red-500 text-xs">*</span>}
                                        <span className='ml-auto text-xs text-muted-foreground'>connected</span>
                                    </div>
                                ))}
                            </Accordion.Content>
                        </Accordion.Item>
                    )} */}
                    
                    <Accordion.Item value='input' className='border-none'>
                        <Accordion.Trigger className='px-4 cursor-pointer hover:no-underline'>
                            <h4 className='text-md font-medium'>Input</h4>
                        </Accordion.Trigger>
                        <Accordion.Content className='flex flex-col gap-1 bg-background/50 w-0 min-w-full'>
                            <div className='overflow-x-auto whitespace-nowrap'>
                                <IncomingData nodeId={node.id}/>
                            </div>
                        </Accordion.Content>
                    </Accordion.Item>
                    <Accordion.Item value='output' className='border-none'>
                        <Accordion.Trigger className='px-4 cursor-pointer hover:no-underline'>
                            <h4 className='text-md font-medium'>Output</h4>
                        </Accordion.Trigger>
                        <Accordion.Content className='flex flex-col gap-1 bg-background/50 w-0 min-w-full'>
                            <div className='p-1 overflow-x-auto whitespace-nowrap'>
                                <NodeOutputs nodeId={node.id}/>
                            </div>
                        </Accordion.Content>
                    </Accordion.Item>

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
