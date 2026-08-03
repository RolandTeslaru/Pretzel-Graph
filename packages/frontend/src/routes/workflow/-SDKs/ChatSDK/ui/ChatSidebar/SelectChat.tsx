import { useState } from 'react'
import { DropdownMenu, Input } from '@pretzel-graph/standard-ui/foundations'
import { ChatSDK } from '../../sdk'
import { QuerySDK } from '@/SDKs/QuerySDK/sdk'
import { useParams } from '@tanstack/react-router'
import type { Workflow } from '@pretzel-graph/shared/domain'

const SelectChat = () => {
  const [query, setQuery] = useState('')
  const { workflowid } = useParams({ from: '/workflow/$workflowid' })
  const workflowId = workflowid as Workflow.Id

  const chats = ChatSDK.useStore(s => s.chats);

  QuerySDK.useQuery(
    ['chats', workflowId],
    () => ChatSDK.actions.chat.listByWorkflow(workflowId),
    { staleTime: Infinity },
  )

  return (
    <div className='flex flex-col gap-2'>
      <Input
        value={query}
        onChange={e => setQuery(e.target.value)}
        className='w-full rounded-lg pr-8'
        placeholder='Search in chats'
        size="sm"
        onKeyDown={e => e.stopPropagation()}
      />

      <div className='max-h-72 overflow-y-auto'>
        {Object.values(chats).length > 0 ? (
          Object.values(chats).map(chat => (
            <DropdownMenu.Item key={chat.id} className='items-start! rounded-md px-2 py-2' onSelect={() => ChatSDK.actions.chat.load(chat.id)}>
              <div className='flex flex-col gap-0.5'>
                <span className='text-sm font-medium text-foreground'>{chat.name}</span>
              </div>
            </DropdownMenu.Item>
          ))
        ) : (
          <div className='px-2 py-3 text-xs text-muted-foreground'>No chats found.</div>
        )}
      </div>
    </div>
  )
}

export default SelectChat
