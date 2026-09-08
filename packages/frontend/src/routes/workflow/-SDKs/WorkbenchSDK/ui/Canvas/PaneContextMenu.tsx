import React, { memo } from 'react'
import { WorkbenchSDK } from '../../sdk'
import { DropdownMenu } from '@pretzel-graph/standard-ui/foundations'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { convertMousePositionToCanvas } from './props'

export const PaneContextMenu: React.FC = memo(() => {
    const menu = WorkbenchSDK.useStore(s => s.paneContextMenu);

    const close = () => WorkbenchSDK.actions.setPaneContextMenu(null);

    if (!menu) return null;

    const handlePaste = () => {
        const canvasPosition = convertMousePositionToCanvas(menu.x, menu.y);
        WorkbenchSDK.actions.clipboard.paste(canvasPosition);
        close();
    };

    const handleImport = () => {
        const canvasPosition = convertMousePositionToCanvas(menu.x, menu.y);
        WorkbenchSDK.actions.import.fromFile(canvasPosition);
        close();
    };

    return (
        <div style={{ position: 'fixed', top: menu.y, left: menu.x, width: 0, height: 0 }}>
            <DropdownMenu.Root
                open
                onOpenChange={(open) => { if (!open) close(); }}
            >
                <DropdownMenu.Trigger className='size-0 opacity-0 pointer-events-none' />
                <DropdownMenu.Content align='start' side='bottom' sideOffset={0}>
                    <DropdownMenu.Item onSelect={handlePaste}>
                        <SystemIcons.Clipboard /> Paste
                    </DropdownMenu.Item>
                    <DropdownMenu.Item onSelect={handleImport}>
                        <SystemIcons.Braces /> Import from JSON
                    </DropdownMenu.Item>
                </DropdownMenu.Content>
            </DropdownMenu.Root>
        </div>
    );
})
