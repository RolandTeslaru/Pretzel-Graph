import { ScrollArea, Spinner } from '@vx-agent-editor/vx-ui/foundations'
import { useMemo, memo, useEffect } from 'react'
import { WorkbenchSDK } from '../../sdk'
import { StackSDK } from '@/SDKs/StackSDK'
import { Foundations, Workflow } from '@vx-agent-editor/shared/domain';
import { Accordion } from '@vx-agent-editor/vx-ui/foundations/accordion';
import { LazyIcon } from '@vx-agent-editor/vx-ui/icons/LazyIcon';
import { FieldRenderer } from '../FieldRenderer';
import { InputRenderer } from '../InputRenderer';
import { PortBadge } from '../PortBadge';


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
            <div className='flex flex-row pt-2 gap-2 mb-2 px-4 relative'>
                <LazyIcon className='text-primary my-auto h-5 w-5' name={node.icon as string} />
                <h4 className='text-primary font-mono font-semibold text-xl'>
                    {node.displayName}
                </h4>
            </div>
            {node.description && (
                <div className='border-t border-b border-border py-2 px-4'>
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
                        <Accordion.Item value='inputs'>
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
                        <Accordion.Item value='fields'>
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
                        <Accordion.Item value='connected'>
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