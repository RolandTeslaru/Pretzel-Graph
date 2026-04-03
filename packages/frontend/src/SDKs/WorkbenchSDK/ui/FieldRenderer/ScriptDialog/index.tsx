import React, { memo, Suspense, lazy, useEffect, useState } from 'react'
import { FieldLabel, type RendererProps } from '..';
import { Button, Dialog, Input, Spinner } from '@vx-agent-editor/vx-ui/foundations';
import { WorkbenchSDK } from '@/SDKs/WorkbenchSDK/sdk';
import { DialogSDK } from '@/SDKs/DialogSDK';
import { SystemIcons } from '@vx-agent-editor/vx-ui/icons';
import type { Foundations, Workflow } from '@vx-agent-editor/shared/domain';

const MonacoEditor = lazy(() => import('@monaco-editor/react'));

export const ScriptTriggerField = memo(({ field, nodeId, className }: RendererProps<'Script'>) => {
    const [value, error, isReconciling] = WorkbenchSDK.useField<string>(nodeId, field.id);

    const onChange = (val: string) => {
        WorkbenchSDK.actions.field.setValue(nodeId, field, val)
    }

    return (
        <div className={className + " w-full nodrag cursor-auto flex flex-col gap-1 relative"}>
            <FieldLabel field={field} isReconciling={isReconciling} />
            <Input
                value={value}
                onChange={(e) => onChange(e.currentTarget.value)}
            />
            <Button variant="input" size="icon-sm" className="right-0.5 rounded-md top-6.5 absolute backdrop-blur-lg"
                onClick={() => {
                    DialogSDK.actions.push("highlighAreaTextInputDialog", (dialogProps) => (
                        <DialogSDK.Template {...dialogProps} className='min-w-[60vw] max-h-[85vh] min-h-[50vh] flex flex-col'>
                            <ScriptDialogcontent field={field} nodeId={nodeId} onChange={onChange} />
                        </DialogSDK.Template>
                    ))
                }}
            >
                <SystemIcons.Maximize2 />
            </Button>
        </div>
    )
})

const ScriptDialogcontent = ({ field, nodeId, onChange }: { field: Foundations.Field, nodeId: Workflow.Node.Id, onChange: (val: string) => void }) => {
    const [value, error] = WorkbenchSDK.useField<string>(nodeId, field.id)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        const timer = setTimeout(() => {
            setMounted(true)
        }, 300)
        return () => clearTimeout(timer)
    }, [])

    return (
        <div className='flex flex-col gap-2 p-3 pt-3 h-full flex-1'>
            <Dialog.Title>{field.displayName}</Dialog.Title>
            <Dialog.Description>Warning this script runs at the nodes runtime using javascripts eval function.</Dialog.Description>
            <div className="flex-1 min-h-0 border rounded-md overflow-hidden relative">
                {mounted ? (
                    <Suspense
                        fallback={
                            <div className="absolute inset-0 flex items-center justify-center text-xs text-neutral-500">
                                Loading Editor <Spinner />
                            </div>
                        }>
                        <MonacoEditor
                            height="500px"
                            defaultLanguage="typescript"
                            theme="vs-dark"
                            value={value}
                            onChange={(val) => onChange(val || "")}
                            options={{
                                minimap: { enabled: false },
                                fontSize: 14,
                                padding: { top: 16 },
                                scrollBeyondLastLine: false,
                            }}
                        />
                    </Suspense>
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-xs text-neutral-500">Loading Editor...</div>
                )}

            </div>
        </div>
    )
}