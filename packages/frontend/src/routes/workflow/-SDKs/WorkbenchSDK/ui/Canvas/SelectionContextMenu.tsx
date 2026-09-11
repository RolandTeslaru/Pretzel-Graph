import React, { memo } from 'react'
import { WorkbenchSDK } from '../../sdk'
import { DropdownMenu } from '@pretzel-graph/standard-ui/foundations'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import type { Workflow } from '@pretzel-graph/shared/domain'

export const SelectionContextMenu: React.FC = memo(() => {
    const [menu, selectedNodeCount] = WorkbenchSDK.useStore(s => [
        s.selectionContextMenu, 
        s.lastSelection?.nodes.length || 0
    ] as const);
    
    const close = () => WorkbenchSDK.actions.setSelectionContextMenu(null);

    if (!menu) return null;

    const handleCreateSubWorkflow = () => {
        const selection = WorkbenchSDK.state.lastSelection;
        if (!selection) return;
        const nodeIds = selection.nodes.map(n => n.id as Workflow.Node.Id);
        const edgeIds = selection.edges.map(e => e.id as Workflow.Edge.Id);
        close();
        WorkbenchSDK.dialogs.openCreateSubWorkflow(nodeIds, edgeIds);
    }

    return (
        <div style={{ position: 'fixed', top: menu.y, left: menu.x, width: 0, height: 0 }}>
            <DropdownMenu.Root
                open
                onOpenChange={(open) => { if (!open) close(); }}
            >
                <DropdownMenu.Trigger className='size-0 opacity-0 pointer-events-none' />
                <DropdownMenu.Content align='start' side='bottom' sideOffset={0}>
                    <DropdownMenu.Label className='font-medium text-sm px-2 py-1'>
                        {`${selectedNodeCount} Selected Nodes`}
                    </DropdownMenu.Label>
                    <DropdownMenu.Separator />
                    <DropdownMenu.Item onSelect={() => { WorkbenchSDK.actions.clipboard.copy(); close(); }}>
                        <SystemIcons.Clipboard /> Copy
                    </DropdownMenu.Item>
                    <DropdownMenu.Item onSelect={() => { WorkbenchSDK.actions.selection.duplicate(); close(); }}>
                        <SystemIcons.Copy /> Duplicate
                    </DropdownMenu.Item>
                    <DropdownMenu.Item onSelect={() => { WorkbenchSDK.actions.selection.disable(true); close(); }}>
                        <SystemIcons.Power /> Disable
                    </DropdownMenu.Item>
                    <DropdownMenu.Item onSelect={handleCreateSubWorkflow}>
                        <SystemIcons.Graph /> Create Sub-Workflow
                    </DropdownMenu.Item>
                    <DropdownMenu.Separator />
                    <DropdownMenu.Item variant='destructive' onSelect={() => { WorkbenchSDK.actions.selection.delete(); close(); }}>
                        <SystemIcons.Trash2 /> Delete
                    </DropdownMenu.Item>
                </DropdownMenu.Content>
            </DropdownMenu.Root>
        </div>
    );
})
