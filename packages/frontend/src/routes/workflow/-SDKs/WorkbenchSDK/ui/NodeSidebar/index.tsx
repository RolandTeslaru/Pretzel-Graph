import { ScrollArea } from '@pretzel-graph/standard-ui/foundations'
import { useMemo, memo, useEffect, useState } from 'react'
import { WorkbenchSDK } from '../../sdk'
import { StackSDK } from '@/routes/workflow/-SDKs/StackSDK'
import { Foundations, Workflow } from '@pretzel-graph/shared/domain';
import { Accordion } from '@pretzel-graph/standard-ui/foundations/accordion';
import { FieldRenderer } from '../FieldRenderer';
import { INPUT_RENDERER_MAP } from '../InputRenderer';
import { NodeSidebarHeader } from './Header';
import { NodeSidebarFooter } from './Footer';
import WebhookRenderer from './webhook-renderer';
import { InputItem } from './input-renderer';
import { NodeDescription } from './node-description';


const NodeSidebar = () => {

    const clickedNode = WorkbenchSDK.useStore(WorkbenchSDK.selectors.getClickedNode);

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


const Content = memo(({ clickedNode: node }: { clickedNode: Workflow.Node }) => {
    const [isEditing, setIsEditing] = useState(false)
    const connectedPorts = WorkbenchSDK.useStore(s => WorkbenchSDK.selectors.node.getConnectedPorts(s, node.id))

    const [ fields, executionStrategyFields, inputs, connectedInputs, webhooks ] = useMemo(() => {
        const connectedInputs: Foundations.Port.Input[] = [];
        const inputs: Foundations.Port.Input[] = [];

        node.inputs.filter(inp => !inp.internal).forEach(input => {
            if (connectedPorts[input.id])
                connectedInputs.push(input);
            else if(input.variant in INPUT_RENDERER_MAP)
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
            node.webhooks || []
        ];
    }, [connectedPorts, node.inputs, node.fields]);

    const defaultOpen = useMemo(() => {
        const sections: string[] = ["execution-strategy", "output", "webhooks"];

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
                <NodeDescription node={node} isEditing={isEditing} />
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
                            <Accordion.Content className='flex flex-col gap-1 bg-background/60 py-2'>
                                {inputs.map(input => (
                                    <InputItem key={input.id} input={input} nodeId={node.id} />
                                ))}
                            </Accordion.Content>
                        </Accordion.Item>
                    )}
                    {/* Webhooks */}
                    {webhooks.length > 0 && (
                        <Accordion.Item value='webhooks' className='border-none'>
                            <Accordion.Trigger className='px-3 cursor-pointer hover:no-underline'>
                                <h4 className='text-sm font-semibold text-foreground tracking-tight'>Webhooks</h4>
                            </Accordion.Trigger>
                            <Accordion.Content className='flex flex-col gap-1 bg-background/60 py-2'>
                                {webhooks.map(webhook => 
                                    <div key={webhook.id} className='px-4 py-1 min-w-0'>
                                        <WebhookRenderer webhook={webhook} nodeId={node.id} />
                                    </div>
                                )}
                            </Accordion.Content>
                        </Accordion.Item>
                    )}
                    {/* Fields */}
                    {fields.length > 0 && (
                        <Accordion.Item value='fields' className='border-none'>
                            <Accordion.Trigger className='px-3 cursor-pointer hover:no-underline'>
                                <h4 className='text-sm font-semibold text-foreground tracking-tight'>Fields</h4>
                            </Accordion.Trigger>
                            <Accordion.Content className='flex flex-col gap-1 bg-background/60 py-2'>
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
                        <Accordion.Content className='flex flex-col gap-1 bg-background/60 py-2'>
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
