import { DialogSDK } from '@/SDKs/DialogSDK'
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import { AuthSDK } from '@/SDKs/AuthSDK/sdk'
import { NotificationSDK } from '@/SDKs/NotificationSDK'
import { SandboxSDK } from '@/SDKs/SandboxSDK'
import { QuerySDK } from '@/SDKs/QuerySDK/sdk'
import VexrLabsWatermark from '@vx-agent-editor/vx-ui/brands/vexrWatermark'
import { useState } from 'react'
import JsonView from 'react18-json-view'
import 'react18-json-view/src/style.css'
import 'react18-json-view/src/dark.css'
import { Button, Select } from '@vx-agent-editor/vx-ui/foundations'
import { SystemIcons } from '@vx-agent-editor/vx-ui/icons'
import { WorkbenchSDK } from '@/routes/workflow/-SDKs/WorkbenchSDK/sdk'
import { ExecutionSessionSDK } from '@/routes/workflow/-SDKs/ExecutionSessionSDK/sdk'
import { OrchestratorSDK } from '@/routes/workflow/-SDKs/OrchestratorSDK/sdk'
import { ChatSDK } from '@/routes/workflow/-SDKs/ChatSDK/sdk'
import { LibrarySDK } from '@/SDKs/LibrarySDK/sdk'

interface RouterContext {
    auth: AuthSDK.State
}

const SDK_OPTIONS = ['WorkbenchSDK', 'ExecutionSessionSDK', 'OrchestratorSDK', 'ChatSDK', 'LibrarySDK'] as const
type SDKOption = typeof SDK_OPTIONS[number]

function setsToArrays(value: unknown): unknown {
    if (value instanceof Set) return [...value];
    if (value instanceof Map) return Object.fromEntries([...value.entries()].map(([k, v]) => [k, setsToArrays(v)]));
    if (Array.isArray(value)) return value.map(setsToArrays);
    if (value !== null && typeof value === 'object') {
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(value)) out[k] = setsToArrays(v);
        return out;
    }
    return value;
}

function useSDKState(selected: SDKOption) {
    const workbench = WorkbenchSDK.useStore(s => s);
    const execution = ExecutionSessionSDK.useStore(s => s);
    const orchestrator = OrchestratorSDK.useStore(s => s);
    const chat = ChatSDK.useStore(s => s);
    const library = LibrarySDK.useStore(s => s);

    const raw = (() => {
        switch (selected) {
            case 'WorkbenchSDK': return workbench;
            case 'ExecutionSessionSDK': return execution;
            case 'OrchestratorSDK': return orchestrator;
            case 'ChatSDK': return chat;
            case 'LibrarySDK': return library;
        }
    })();

    return setsToArrays(raw);
}

function StateViewer() {
    const [selected, setSelected] = useState<SDKOption>('WorkbenchSDK');
    const [minimized, setMinimized] = useState(true);
    const state = useSDKState(selected);

    return (
        <div className={`fixed left-[20px] bottom-[20px] z-50 w-[400px] bg-card/70 backdrop-blur-sm border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden pointer-events-auto ${minimized ? 'h-auto' : 'bottom-20 h-[500px]'}`}>
            <div className="flex items-center justify-between px-2 py-1 border-b border-border bg-muted/30">
                <h3 className="text-sm font-semibold text-foreground">
                    State Viewer
                </h3>
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
                    <div className="p-2 border-b border-border">
                        <Select.Root value={selected} onValueChange={(v) => setSelected(v as SDKOption)}>
                            <Select.Trigger size="xs">
                                <Select.Value />
                            </Select.Trigger>
                            <Select.Content>
                                {SDK_OPTIONS.map(sdk => (
                                    <Select.Item key={sdk} value={sdk}>{sdk}</Select.Item>
                                ))}
                            </Select.Content>
                        </Select.Root>
                    </div>
                    <div className="flex-1 overflow-auto p-4 custom-scrollbar text-[11px] leading-relaxed">
                        <JsonView
                            src={state}
                            collapsed={3}
                            theme="default"
                        />
                    </div>
                </>
            )}
        </div>
    )
}

export const Route = createRootRouteWithContext<RouterContext>()({
    component: () => (
        <>
            <QuerySDK.Provider>
                <SandboxSDK.SandboxFrame />
                <NotificationSDK.UIOverlay />
                <DialogSDK.UIOverlay />
                <StateViewer />
                <Outlet />
            </QuerySDK.Provider>

            <VexrLabsWatermark/>
        </>
    ),
})

