import { Input, ScrollArea } from '@pretzel-graph/standard-ui/foundations'
import React, { useMemo, memo, useEffect, useState } from 'react'
import { WorkbenchSDK } from '../../sdk'
import { ShelfSDK } from '@/routes/workflow/-SDKs/ShelfSDK/sdk'
import type { NodeUI } from '../../selectors/node'
import { StackSDK } from '@/routes/workflow/-SDKs/StackSDK'
import { DialogSDK } from '@/SDKs/DialogSDK'
import { Foundations, Workflow } from '@pretzel-graph/shared/domain';
import { Accordion } from '@pretzel-graph/standard-ui/foundations/accordion';
import { FieldRenderer } from '../FieldRenderer';
import { INPUT_RENDERER_MAP } from '../InputRenderer';
import { NodeSidebarHeader } from './Header';
import { NodeSidebarFooter } from './Footer';
import WebhookRenderer from './webhook-renderer';
import { InputItem } from './input-renderer';
import { CredentialPicker } from './CredentialPicker';
import { DependencySelector } from './DependencySelector'


interface SidebarAccordionItemProps {
    label: string
    value: string
    children: React.ReactNode
}

const SidebarAccordionItem = ({ label, value, children }: SidebarAccordionItemProps) => (
    <Accordion.Item value={value} className='border-none'>
        <Accordion.Trigger className='px-3 cursor-pointer hover:no-underline'>
            <h4 className='text-sm font-semibold text-foreground tracking-tight'>{label}</h4>
        </Accordion.Trigger>
        <Accordion.Content className='flex flex-col gap-1 bg-background/60 py-3'>
            {children}
        </Accordion.Content>
    </Accordion.Item>
)

const NodeSidebar = () => {

    const clickedNodeId = WorkbenchSDK.useStore(s => s.selectors.getClickedNode(s)?.id ?? "" as Workflow.Node.Id);
    const isFullscreen = DialogSDK.useStore(s => s.selectors.isDialogOpen(s, "fullscreen-node-panel"));

    const hyNode = WorkbenchSDK.useNode(clickedNodeId)

    useEffect(() => {
        if (clickedNodeId && hyNode && !isFullscreen) {
            StackSDK.actions.push("nodeSidebar" as StackSDK.Panel.Id, (props) => (
                <StackSDK.Template {...props}>
                    <Content hyNode={hyNode} />
                </StackSDK.Template>
            ))
        } else
            StackSDK.actions.pop("nodeSidebar" as StackSDK.Panel.Id)
            
    }, [clickedNodeId, isFullscreen])

    return null
}

export default NodeSidebar


interface ContentProps {
    hyNode: Workflow.HydratedNode
    showFooter?: boolean
}

export const Content = ({ hyNode, showFooter = true }: ContentProps) => {
    const [isEditing, setIsEditing] = useState(false)

    const [ fields, executionStrategyFields, inputs, connectedInputs ] = useMemo(() => {

        const connectedInputs: Foundations.Port.Input[] = [];
        const inputs: Foundations.Port.Input[] = [];

        hyNode.inputs.filter(inp => !inp.internal).forEach(input => {
            if (hyNode.connectedPorts[input.id])
                connectedInputs.push(input);
            else if(input.variant in INPUT_RENDERER_MAP)
                inputs.push(input);
        });

        const fields: Foundations.Field[] = []
        const executionStrategyFields: Foundations.Field[] = []

        hyNode.fields.forEach(field => {
            if (field.id === "signalDependency" || field.id === "dataDependency" || field.id === "onErrorStrategy"){
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
    }, [hyNode.connectedPorts, hyNode.blueprint, hyNode.inputs, hyNode.fields]);

    const credentials = hyNode.blueprint.credentials ?? []
    const webhooks = hyNode.blueprint.webhooks ?? []
    const flags = hyNode.blueprint.flags ?? {}

    const defaultOpen = useMemo(() => {
        const sections: string[] = ["execution-strategy", "output", "webhooks"];

        if (credentials.length > 0)
            sections.push("credentials");
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
                hyNode={hyNode}
                isEditing={isEditing}
                onEditStart={() => setIsEditing(true)}
                onEditFinish={() => setIsEditing(false)}
            />

            {/* Sections */}
            <ScrollArea.Root className='mask-[linear-gradient(to_bottom,transparent,black_48px,black_calc(100%-48px),transparent)]'>
                <NodeDescription nodeId={hyNode.id} description={hyNode.ui.description} isEditing={isEditing} />
                <Accordion.Root
                    type="multiple"
                    defaultValue={defaultOpen}
                    className='pb-14'
                >
                    {inputs.length > 0 && (
                        <SidebarAccordionItem label='Inputs' value='inputs'>
                            {inputs.map(input => (
                                <InputItem key={input.id} input={input} nodeId={hyNode.id} />
                            ))}
                        </SidebarAccordionItem>
                    )}
                    {webhooks.length > 0 && (
                        <SidebarAccordionItem label='Webhooks' value='webhooks'>
                            {webhooks.map(webhook => (
                                <div key={webhook.id} className='px-4 py-1 min-w-0'>
                                    <WebhookRenderer webhook={webhook} nodeId={hyNode.id} />
                                </div>
                            ))}
                        </SidebarAccordionItem>
                    )}
                    {credentials.length > 0 && (
                        <SidebarAccordionItem label='Credentials' value='credentials'>
                            {credentials.map(cred => (
                                <div key={cred.id} className='px-4 py-1 min-w-0'>
                                    <CredentialPicker credentialTemplate={cred} nodeId={hyNode.id} />
                                </div>
                            ))}
                        </SidebarAccordionItem>
                    )}
                        <SidebarAccordionItem label='Fields' value='fields'>
                            {flags?.SHOW_DEPENDENCY_SELECTOR ? <DependencySelector className="px-4" nodeId={hyNode.id} /> : null}

                            {fields.map(field => field.hidden ? null : (
                                <div key={field.id} className='px-4 py-1 min-w-0'>
                                    <FieldRenderer field={field} nodeId={hyNode.id} />
                                </div>
                            ))}
                        </SidebarAccordionItem>
                    <SidebarAccordionItem label='Execution Behavior' value='execution-strategy'>
                        {executionStrategyFields.map(field => field.hidden ? null : (
                            <div key={field.id} className='px-4 py-2'>
                                <FieldRenderer field={field} nodeId={hyNode.id} />
                            </div>
                        ))}
                    </SidebarAccordionItem>
                </Accordion.Root>
            </ScrollArea.Root>

            {showFooter && <NodeSidebarFooter hyNode={hyNode} />}
        </>
    )
}




export const NodeDescription = ({ nodeId, description, isEditing }: {
    nodeId: Workflow.Node.Id,
    description?: string
    isEditing: boolean
}) => {
    if (!description && !isEditing) return <div className='py-2 px-2 pt-10'></div>

    return (
        <div className='py-2 px-2 pt-14'>
            {isEditing ? (
                <Input
                    className='text-xs bg-transparent shadow-none focus-visible:ring-0 text-muted-foreground placeholder:text-muted-foreground/50'
                    defaultValue={description}
                    placeholder='Add a description...'
                    onBlur={e => WorkbenchSDK.actions.node.setDescription(nodeId, e.target.value)}
                />
            ) : (
                <p className='text-muted-foreground text-xs'>
                    {description}
                </p>
            )}
        </div>
    )
}

