import { useState } from 'react'
import JsonView from 'react18-json-view'
import 'react18-json-view/src/style.css'
import 'react18-json-view/src/dark.css'
import { Button, Select, ScrollArea } from '@pretzel-graph/standard-ui/foundations'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { WorkbenchSDK } from '@/routes/workflow/-SDKs/WorkbenchSDK/sdk'
import { ChatSDK } from '@/routes/workflow/-SDKs/ChatSDK/sdk'
import { LibrarySDK } from '@/SDKs/LibrarySDK/sdk'
import { ShelfSDK } from '@/routes/workflow/-SDKs/ShelfSDK/sdk'
import { VersionControlSDK } from '@/SDKs/VersionControlSDK/sdk'
import { ExecutionSDK } from '@/routes/workflow/-SDKs/ExecutionSDK/sdk'
import { DialogSDK } from '@/SDKs/DialogSDK'
import { Execution } from '@pretzel-graph/shared/domain'

const SDK_OPTIONS = ['WorkbenchSDK', 'ExecutionSDK', 'ChatSDK', 'LibrarySDK', 'ShelfSDK', 'VersionControlSDK', 'DialogSDK'] as const
type SDKOption = typeof SDK_OPTIONS[number]

function setsToArrays(value: unknown): unknown {
    if (value instanceof Set) return [...value].filter(v => typeof v !== 'function').map(setsToArrays);

    if (value instanceof Map) {
        return Object.fromEntries(
            [...value.entries()]
                .filter(([, v]) => typeof v !== 'function')
                .map(([k, v]) => [k, setsToArrays(v)])
        );
    }

    if (Array.isArray(value)) return value.filter(v => typeof v !== 'function').map(setsToArrays);

    if (value !== null && typeof value === 'object') {
        const out: Record<string, unknown> = {};

        for (const [k, v] of Object.entries(value)) {
            if (typeof v === 'function') continue;
            out[k] = setsToArrays(v);
        }

        return out;
    }

    return value;
}

function useSDKState(selected: SDKOption) {
    const workbench = WorkbenchSDK.useStore(s => s);
    const execution = ExecutionSDK.useStore(s => s);
    const chat = ChatSDK.useStore(s => s);
    const library = LibrarySDK.useStore(s => s);
    const shelf = ShelfSDK.useStore(s => s);
    const versionControl = VersionControlSDK.useStore(s => s);
    const dialog = DialogSDK.useStore(s => s);

    const raw = (() => {
        switch (selected) {
            case 'WorkbenchSDK': return workbench;
            case 'ExecutionSDK': return execution;
            case 'ChatSDK': return chat;
            case 'LibrarySDK': return library;
            case 'ShelfSDK': return shelf;
            case 'VersionControlSDK': return versionControl;
            case 'DialogSDK': return dialog;
        }
    })();

    return setsToArrays(raw);
}

const EXECUTION_STATUSES = Execution.Status.options;

function ExecutionSDKControls() {
    const currentExecution = ExecutionSDK.useStore(s => s.currentExecution);
    if (!currentExecution) return null;

    return (
        <div className="px-3 py-2 pb-14 border-t border-border flex items-center gap-2 text-xs text-muted-foreground shrink-0">
            <span className="font-medium">status</span>
            <Select.Root
                value={currentExecution.status}
                onValueChange={(v) => ExecutionSDK.setState(s => { ExecutionSDK.reducers.currentExecution.setStatus(s, v as Execution.Status) })}
            >
                <Select.Trigger size="xs" className="max-w-[140px]">
                    <Select.Value />
                </Select.Trigger>
                <Select.Content>
                    {EXECUTION_STATUSES.map(s => (
                        <Select.Item key={s} value={s}>{s}</Select.Item>
                    ))}
                </Select.Content>
            </Select.Root>
        </div>
    );
}

export function StateViewer() {
    const [selected, setSelected] = useState<SDKOption>('WorkbenchSDK');
    const [minimized, setMinimized] = useState(true);
    const state = useSDKState(selected);


    return (
        <div className={`fixed transition-all top-[20px] left-1/2 -translate-x-1/2 z-50 w-[400px] bg-card/80 backdrop-blur-sm border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden pointer-events-auto ${minimized ? 'h-[34px] border-0' : ' h-[400px]'}`}>
            <div className={`absolute z-10 transition-all ${minimized ? 'left-0 bottom-0 right-0' : 'left-1 bottom-1 right-1'}  flex px-1 py-1 gap-2 border rounded-xl border-border bg-card shadow-md shadow-black/10`}>
                <h3 className="text-sm font-semibold pl-1 text-foreground">
                    State Viewer
                </h3>
                <Select.Root value={selected} onValueChange={(v) => setSelected(v as SDKOption)}>
                    <Select.Trigger size="xs" className='max-w-[150px] ml-auto'>
                        <Select.Value />
                    </Select.Trigger>
                    <Select.Content>
                        {SDK_OPTIONS.map(sdk => (
                            <Select.Item key={sdk} value={sdk}>{sdk}</Select.Item>
                        ))}
                    </Select.Content>
                </Select.Root>
                <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => setMinimized(m => !m)}
                    aria-label={minimized ? 'Expand state viewer' : 'Minimize state viewer'}
                >
                    {minimized ? <SystemIcons.Maximize2 /> : <SystemIcons.Minimize2 />}
                </Button>
            </div>
            {!minimized && (
                <>
                    <ScrollArea.Root className="flex-1 px-4 pb-8 text-[11px] leading-relaxed [mask-image:linear-gradient(to_bottom,transparent,black_48px,black_calc(100%-48px),transparent)]">
                        <JsonView
                            src={state}
                            collapsed={3}
                            theme="default"
                        />
                    </ScrollArea.Root>
                    {selected === 'ExecutionSDK' && <ExecutionSDKControls />}
                </>
            )}
        </div>
    )
}
