import { useCallback, useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'
import type { BeforeMount } from '@monaco-editor/react'
import { buildAirlockDts } from './airlockTypes';
import type { Workflow } from '@pretzel-graph/shared/domain';
import { Dialog } from '@pretzel-graph/standard-ui/foundations';
import { SystemIcons } from '@pretzel-graph/standard-ui/icons';
import FloatContainer from '@/components/FloatContainer';
import { MonacoEditor } from '@/components/MonacoEditor';
import IncomingPanel from '../NodePanel/IncomingPanel';
import OutgoingPanel from '../NodePanel/OutgoingPanel';
import { WorkbenchSDK } from '../../sdk';

interface Props {
    node: Workflow.Node.Raw,
    displayName: string,
    onChange: (val: string) => void,
    onClose: () => void,
    initialValue: string,
    blockTransparency: boolean,
    surfaceStyle: CSSProperties,
}

export const CodeEditorContent = ({ node, displayName, onChange, onClose, initialValue, blockTransparency, surfaceStyle }: Props) => {
    const extraLibRef = useRef<{ dispose(): void } | null>(null)

    // commit the buffered script to the store when the editor closes
    useEffect(() => () => onClose(), [onClose])

    useEffect(() => () => extraLibRef.current?.dispose(), [])

    const beforeMount = useCallback<BeforeMount>((monaco) => {
        const ts = monaco.languages.typescript.typescriptDefaults;
        ts.setDiagnosticsOptions({ ...ts.getDiagnosticsOptions(), diagnosticCodesToIgnore: [1108] });
        extraLibRef.current?.dispose();
        extraLibRef.current = ts.addExtraLib(buildAirlockDts(node.id), 'ts:airlock-globals.d.ts');
    }, [node.id])

    // In the background render solid; on top, frosted glass. `surfaceStyle` carries the stack
    // brightness — applied per card so each card's backdrop-blur isn't trapped by a filtered ancestor.
    const surface = blockTransparency ? 'bg-card' : 'bg-card/80 backdrop-blur-lg'

    const hyNode = WorkbenchSDK.useNode(node.id)

    if (!hyNode){
        return null;
    }

    return (
        <div className="flex flex-row gap-5 h-[85vh] w-[90vw]">

            <div style={surfaceStyle} className={`${surface} overflow-hidden w-full min-w-0 h-full top-0 border-border border rounded-2xl shadow-xl shadow-black/10`}>
                <IncomingPanel nodeId={node.id} inputs={hyNode.inputs} />
            </div>


            <div style={surfaceStyle} className={`${surface} flex min-w-[50vw] flex-col relative gap-2 h-full flex-1 overflow-hidden border-border border rounded-2xl shadow-xl shadow-black/10`}>
                <FloatContainer className="absolute top-2 left-2 w-fit h-12 py-1! px-3 backdrop-blur-md z-10">
                    <SystemIcons.FileCode className=" size-4 my-auto" />
                    <Dialog.Title className="font-mono text-sm">Code Editor</Dialog.Title>
                </FloatContainer>

                <div className="absolute flex gap-1 flex-row top-2.5 right-1/2 translate-x-1/2 p-1 px-2 text-sm font-medium">
                    <p>
                        {node.ui.displayName}
                    </p>
                    <SystemIcons.ChevronRight className="size-5 mx-auto" />
                    <p>
                        {displayName}
                    </p>
                </div>

                <div className="flex-1 h-full min-h-0 overflow-hidden relative [&_.monaco-editor]:bg-transparent! [&_.monaco-editor-background]:bg-transparent! [&_.monaco-editor_.margin]:bg-transparent!">
                    <MonacoEditor
                        defaultLanguage="typescript"
                        defaultValue={initialValue}
                        beforeMount={beforeMount}
                        onChange={onChange}
                    />
                </div>
            </div>

            <div style={surfaceStyle} className={`${surface} overflow-hidden w-full min-w-0 h-full top-0 border-border border rounded-2xl shadow-xl shadow-black/10`}>
                <OutgoingPanel nodeId={node.id} outputs={hyNode.outputs} />
            </div>
        </div>
    )
}
