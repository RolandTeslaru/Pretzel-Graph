import { Input, ScrollArea, Spinner } from '@vx-agent-editor/vx-ui/foundations'
import { useMemo, memo, useEffect, useState } from 'react'
import { WorkbenchSDK } from '../../sdk'
import { StackSDK } from '@/SDKs/StackSDK'
import { Foundations, Workflow } from '@vx-agent-editor/shared/domain';
import { Accordion } from '@vx-agent-editor/vx-ui/foundations/accordion';
import { FieldRenderer } from '../FieldRenderer';
import { INPUT_RENDERER_MAP } from '../InputRenderer';
import { NodeSidebarHeader } from './header';
import { NodeSidebarFooter } from './footer';


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

    const [ fields, executionStrategyFields, inputs, connectedInputs ] = useMemo(() => {
        const connectedInputs: Foundations.Port.Input[] = [];
        const inputs: Foundations.Port.Input[] = [];

        node.inputs.filter(inp => !inp.internal).forEach(input => {
            if (connectedPorts[input.id])
                connectedInputs.push(input);
            else
                inputs.push(input);
        });

        const fields: Foundations.Field[] = []
        const executionStrategyFields: Foundations.Field[] = []

        node.fields.forEach(field => {
            if (field.id === "signalDependency" || field.id === "dataDependency"){
                executionStrategyFields.push(field)
                return
            }
                
            fields.push(field)
        })


        return [
            fields,
            executionStrategyFields,
            inputs,
            connectedInputs,
        ];
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
                            <Accordion.Trigger className='px-3 cursor-pointer hover:no-underline'>
                                <h4 className='text-sm font-semibold text-foreground tracking-tight'>Inputs</h4>
                            </Accordion.Trigger>
                            <Accordion.Content className='flex flex-col gap-1 bg-background/50 py-2'>
                                {inputs.map(input => (
                                    <InputItem key={input.id} input={input} nodeId={node.id} />
                                ))}
                            </Accordion.Content>
                        </Accordion.Item>
                    )}
                    {/* Fields */}
                    {fields.length > 0 && (
                        <Accordion.Item value='fields' className='border-none'>
                            <Accordion.Trigger className='px-3 cursor-pointer hover:no-underline'>
                                <h4 className='text-sm font-semibold text-foreground tracking-tight'>Fields</h4>
                            </Accordion.Trigger>
                            <Accordion.Content className='flex flex-col gap-1 bg-background/60'>
                                {fields.map(field => field.hidden ? null : (
                                    <div key={field.id} className='px-4 py-1 min-w-0'>
                                        <FieldRenderer field={field} nodeId={node.id} />
                                    </div>
                                ))}
                            </Accordion.Content>
                        </Accordion.Item>
                    )}
                    <Accordion.Item value='execution-strategy' className='border-none'>
                        <Accordion.Trigger className='px-3 cursor-pointer hover:no-underline'>
                            <h4 className='text-sm font-semibold text-foreground tracking-tight'>Execution Strategy</h4>
                        </Accordion.Trigger>
                        <Accordion.Content className='flex flex-col gap-1 bg-background/60'>
                            {executionStrategyFields.map(field => field.hidden ? null : (
                                <div key={field.id} className='px-4 py-2'>
                                    <FieldRenderer field={field} nodeId={node.id} />
                                </div>
                            ))}
                        </Accordion.Content>
                    </Accordion.Item>
                </Accordion.Root>
            </ScrollArea.Root>
        </>
    )
})


const InputItem = memo(({ input, nodeId }: { input: Foundations.Port.Input, nodeId: Workflow.Node.Id }) => {
    
    const Component = INPUT_RENDERER_MAP[input.variant] as React.ComponentType<{
        input: Foundations.Port.Input
        nodeId: Workflow.Node.Id
        className?: string
        isFlipped?: boolean
    }> | undefined
    
    if(Component)
        return (
            <div className='px-4'>
                <Component input={input} nodeId={nodeId} />
            </div>
        )

    return null
})