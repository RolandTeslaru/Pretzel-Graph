import { memo } from 'react'
import { FieldLabel, type RendererProps } from './FieldLabel';
import { Button } from '@pretzel-graph/standard-ui/foundations';
import { WorkbenchSDK } from '@/routes/workflow/-SDKs/WorkbenchSDK/sdk';
import { DialogSDK } from '@pretzel-graph/standard-ui/SDKs/DialogSDK';
import { CodeEditorContent } from '../CodeEditor';
import IncomingPanel from '../NodePanel/IncomingPanel';
import OutgoingPanel from '../NodePanel/OutgoingPanel';

export const ScriptField = memo(({ field, nodeId, className }: RendererProps<'Script'>) => {
    const [localValue, onChange, flush] = WorkbenchSDK.useField<string>(nodeId, field);

    return (
        <div className={className + " w-full nodrag cursor-auto flex flex-col gap-1 relative"}>
            <FieldLabel field={field} />
            <Button variant="input" className="justify-start overflow-hidden"
                onClick={() => {
                    const snapshot = localValue;
                    const node = WorkbenchSDK.document.selectors.node.get(WorkbenchSDK.document, nodeId);
                    if (!node) return;

                    DialogSDK.actions
                             .push("ScriptDialog", (dialogProps) => (
                                <DialogSDK.TripleSplitTemplate
                                    {...dialogProps}
                                    className='h-[85vh] w-[90vw]'
                                    leftSidebarClassName='w-[22%] p-0! overflow-hidden'
                                    rightSidebarClassName='w-[22%] p-0! overflow-hidden'
                                    contentClassName='p-0! gap-0! min-w-0 overflow-hidden'
                                    leftSidebarRenderer={() => <IncomingPanel nodeId={node.id} />}
                                    rightSidebarRenderer={() => <OutgoingPanel nodeId={node.id} />}
                                >
                                    <CodeEditorContent node={node} onChange={onChange} onClose={flush} initialValue={snapshot} />
                                </DialogSDK.TripleSplitTemplate>
                            ))
                }}
            >
                <p className="font-mono text-xs truncate w-full min-w-0">{localValue}</p>
            </Button>
        </div>
    )
})
ScriptField.displayName = "ScriptField"
