import React, { createContext, useContext, useState } from 'react'
import type { Workflow } from '@pretzel-graph/shared/domain'
import { Button, Input, Tabs, Textarea } from '@pretzel-graph/standard-ui/foundations'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { DialogSDK } from '@/SDKs/DialogSDK'
import { WorkbenchSDK } from '../../sdk'
import { ExpressionEditor } from '../ExpressionEditor'

interface Props {
    value: string
    isExpression: boolean
    onToggleExpression: (isExpression: boolean) => void
    onChange: (value: string) => void
    onCommit: () => void
    nodeId: Workflow.Node.Id
    displayName: string
    className?: string
    children: React.ReactNode
}

interface ExpressionContextValue {
    value: string
    onChange: (value: string) => void
    onCommit: () => void
    node: Workflow.Node | null
    displayName: string
}

const ExpressionContext = createContext<ExpressionContextValue | null>(null)

function useExpressionContext() {
    const ctx = useContext(ExpressionContext)
    if (!ctx) throw new Error("WithExpression.Input must be rendered inside <WithExpression>")
    return ctx
}

function ExpressionInput({ multiline, placeholder, className }: {
    multiline?: boolean
    placeholder?: string
    className?: string
}) {
    const { value, onChange, onCommit, node, displayName } = useExpressionContext()

    return (
        <div className='relative input-default rounded-sm overflow-hidden'>
            <SystemIcons.MathFunction className="size-3.5 absolute left-1.5 top-1/2 -translate-y-1/2" />
            <Button variant="input" size="icon-xs" className="size-5 right-0 bottom-0 rounded-none! rounded-tl-sm! absolute"
                onClick={() => {
                    if (!node) return;

                    DialogSDK.actions
                        .push("ExpressionEditorDialog", (dialogProps) => (
                            <DialogSDK.Template {...dialogProps} className='overflow-hidden! border-none! bg-white/0! shadow-none! flex flex-row gap-4'>
                                <ExpressionEditor node={node} displayName={displayName} onChange={onChange} onClose={onCommit} initialValue={value} />
                            </DialogSDK.Template>
                        ))
                }}
            >
                <SystemIcons.Maximize2 className="size-3.5"/>
            </Button>
            <Input
                size="sm"
                variant="ghost"
                value={value}
                placeholder={placeholder}
                onChange={(e) => onChange(e.currentTarget.value)}
                onBlur={onCommit}
                className={className + " pl-8"}
            />
        </div>
    )
}

export function WithExpression({ value, isExpression, onToggleExpression, onChange, onCommit, nodeId, displayName, className, children }: Props) {
    const [isHovered, setIsHovered] = useState(false)
    const node = WorkbenchSDK.state.selectors.node.get(WorkbenchSDK.state, nodeId);

    return (
        <ExpressionContext.Provider value={{ value, onChange, onCommit, node, displayName }}>
            <div
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className={className + " w-full nodrag cursor-auto flex flex-col gap-1 relative"}
            >
                {(isHovered) && (
                    <div className='absolute -top-1 right-0 flex flex-row items-center gap-1 z-10'>
                        <Tabs.Root
                            value={isExpression ? 'expression' : 'static'}
                            onValueChange={(value) => onToggleExpression(value === 'expression')}
                        >
                            <Tabs.List variant="accent" size="xxs">
                                <Tabs.Trigger value='expression'>Expression</Tabs.Trigger>
                                <Tabs.Trigger value='static'>Static</Tabs.Trigger>
                            </Tabs.List>
                        </Tabs.Root>
                    </div>
                )}
                {children}
            </div>
        </ExpressionContext.Provider>
    )
}

WithExpression.Input = ExpressionInput
