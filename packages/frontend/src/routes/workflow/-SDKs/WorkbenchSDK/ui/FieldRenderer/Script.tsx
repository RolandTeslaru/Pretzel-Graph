import { memo } from 'react'
import { FieldLabel, type RendererProps } from './FieldLabel';
import { Button } from '@pretzel-graph/standard-ui/foundations';
import { WorkbenchSDK } from '@/routes/workflow/-SDKs/WorkbenchSDK/sdk';
import { DialogSDK } from '@/SDKs/DialogSDK';
import { CodeEditorContent } from '../CodeEditor';

export const ScriptField = memo(({ field, nodeId, className }: RendererProps<'Script'>) => {
    const [localValue, onChange, flush, , isReconciling] = WorkbenchSDK.useField<string>(nodeId, field);

    return (
        <div className={className + " w-full nodrag cursor-auto flex flex-col gap-1 relative"}>
            <FieldLabel field={field} isReconciling={isReconciling} />
            <Button variant="input" className="justify-start overflow-hidden"
                onClick={() => {
                    const snapshot = localValue;
                    DialogSDK.actions.push("ScriptDialog", (dialogProps) => (
                        <DialogSDK.Template {...dialogProps} className='overflow-hidden! border-none! bg-white/0! shadow-none! flex flex-row gap-4'>
                            <CodeEditorContent nodeId={nodeId} displayName={field.displayName} onChange={onChange} onClose={flush} initialValue={snapshot} />
                        </DialogSDK.Template>
                    ))
                }}
            >
                <p className="font-mono text-xs truncate w-full min-w-0">{localValue}</p>
            </Button>
        </div>
    )
})
ScriptField.displayName = "ScriptField"
