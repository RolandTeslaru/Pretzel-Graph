import type { Gateway } from '@pretzel-graph/shared/domain'
import { IconRenderer } from '@pretzel-graph/standard-ui/icons/IconRenderer'
import classNames from 'classnames'
import { GatewaySDK } from '@/SDKs/GatewaySDK/sdk'
import { ConnectionStatus } from '@/SDKs/GatewaySDK/ui/ConnectionStatus'
import { sizeStyles, type ItemSize } from './sizes'

interface ConnectionCardProps {
    connection: Gateway.Connection
    size?: ItemSize
    onClick?: () => void
}

export function ConnectionItem({ connection, size = 'default', onClick }: ConnectionCardProps) {

    const styles = sizeStyles[size]

    const icon = GatewaySDK.useStore(s => s.definitions[connection.definitionId]?.icon ?? 'GatewayConnection')

    return (
        <div
            data-library-item='connection'
            data-library-id={connection.id}
            onClick={onClick}
            className={classNames(
                'group flex gap-1 relative m-auto select-none rounded-md cursor-pointer hover:bg-accent/30',
                styles.card,
            )}
        >
            <div className='rounded-md p-1 flex flex-col gap-1 m-auto w-auto h-auto '>
                <IconRenderer
                    name={icon}
                    className={classNames('shrink-0 m-auto', styles.workflowIcon)}
                />
                <div className="min-w-0 flex flex-col items-center gap-1">
                    <p className={classNames('font-medium text-center truncate', styles.name)}>{connection.name}</p>
                    <ConnectionStatus status={connection.status} className={styles.meta} />
                </div>
            </div>
        </div>
    )
}
