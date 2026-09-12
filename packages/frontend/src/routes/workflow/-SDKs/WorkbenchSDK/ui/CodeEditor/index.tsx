import { useCallback, useEffect, useRef } from 'react'
import type { BeforeMount } from '@monaco-editor/react'
import { buildAirlockDts } from './airlockTypes';
import type { Workflow } from '@pretzel-graph/shared/domain';
import { MonacoEditor } from '@/components/MonacoEditor';
import { WorkbenchSDK } from '../../sdk';

interface Props {
    node: Workflow.Node.Raw,
    onChange: (val: string) => void,
    onClose: () => void,
    initialValue: string,
}

export const CodeEditorContent = ({ node, onChange, onClose, initialValue }: Props) => {
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

    const hyNode = WorkbenchSDK.useNode(node.id)

    if (!hyNode){
        return null;
    }

    return (
        <div className="flex-1 h-full min-h-0 overflow-hidden relative [&_.monaco-editor]:bg-transparent! [&_.monaco-editor-background]:bg-transparent! [&_.monaco-editor_.margin]:bg-transparent!">
            <MonacoEditor
                defaultLanguage="typescript"
                defaultValue={initialValue}
                beforeMount={beforeMount}
                onChange={onChange}
            />
        </div>
    )
}
