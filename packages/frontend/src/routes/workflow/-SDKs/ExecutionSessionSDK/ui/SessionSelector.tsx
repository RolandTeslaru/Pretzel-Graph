import { Button, Select } from '@pretzel-graph/standard-ui/foundations'
import React from 'react'
import { ExecutionSessionSDK } from '../sdk'
import type { ExecutionSession } from '@pretzel-graph/shared/domain'
import { toast } from 'sonner'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'

const SessionSelector = () => {
    const [sessionMetas, currentSessionId] = ExecutionSessionSDK.useStore(s => [s.sessionMetas, s.session.id])

  return (
    <div className='flex flex-row gap-1'>
        <p className='text-xs h-auto my-auto'>Sessions</p>
        <Select.Root 
            value={currentSessionId} 
            onValueChange={(sessionId: ExecutionSession.Id) => {
                ExecutionSessionSDK.actions.setSession(sessionId)
            }}
        >
            <Select.Trigger className='rounded-full max-w-30' size='xs'>
                <Select.Value placeholder="Select Session" />
            </Select.Trigger>
            <Select.Content size='xs'>
                {Object.entries(sessionMetas).map(([sessionId, meta]) => (
                    <Select.Item size='xs' key={sessionId} value={sessionId}>
                        <p className='text-xs max-w-20 truncate'>
                            {meta.id}
                        </p>
                    </Select.Item>
                ))}
            </Select.Content>
        </Select.Root>

        <Button size='icon-xs' variant="ghost" onClick={() => {
            ExecutionSessionSDK.actions.clearStatus();
            toast.success("Cleared node statuses")
        }}>
            <SystemIcons.Trash/>
        </Button>
        <Button size='icon-xs' variant="ghost" onClick={() => {
            
        }}>
            <SystemIcons.Undo/>
        </Button>
    </div>
  )
}

export default SessionSelector
