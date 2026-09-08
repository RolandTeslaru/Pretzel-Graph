import { ContextMenu } from '@pretzel-graph/standard-ui/foundations'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'

interface Props {
    url: string
}

export function OpenInSubMenu({ url }: Props) {
    return (
        <ContextMenu.Sub>
            <ContextMenu.SubTrigger icon={<SystemIcons.ExternalLink className='size-4' />}>
                Open In
            </ContextMenu.SubTrigger>
            <ContextMenu.SubContent>
                <ContextMenu.Item
                    icon={<SystemIcons.ExternalLink className='size-4' />}
                    onClick={() => window.open(url, '_blank')}
                >
                    New Tab
                </ContextMenu.Item>
                <ContextMenu.Item
                    icon={<SystemIcons.Monitor className='size-4' />}
                    onClick={() => window.open(url, '_blank', 'popup')}
                >
                    New Window
                </ContextMenu.Item>
            </ContextMenu.SubContent>
        </ContextMenu.Sub>
    )
}
