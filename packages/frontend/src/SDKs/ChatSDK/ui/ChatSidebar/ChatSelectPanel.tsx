import { useMemo, useState } from 'react'
import { DropdownMenu, Input } from '@/vx-ui/foundations'
import { SystemIcons } from '@/vx-ui/icons'

const DUMMY_CHATS = [
  { id: '1', title: 'Workflow Debug', preview: 'Let\'s inspect why the edge validation fails.' },
  { id: '2', title: 'Prompt Tuning', preview: 'Can we tighten the system instructions?' },
  { id: '3', title: 'Node Design', preview: 'Need a cleaner input schema for this node.' },
  { id: '4', title: 'Supabase Sync', preview: 'Realtime updates stop after reconnect.' },
  { id: '5', title: 'Execution Logs', preview: 'Show latest run events in chronological order.' },
]

const ChatSelectPanel = () => {
  const [query, setQuery] = useState('')

  const filteredChats = useMemo(() => {
    const normalized = query.trim().toLowerCase()

    if (!normalized) return DUMMY_CHATS

    return DUMMY_CHATS.filter(chat => {
      return (
        chat.title.toLowerCase().includes(normalized) ||
        chat.preview.toLowerCase().includes(normalized)
      )
    })
  }, [query])

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
        {filteredChats.length > 0 ? (
          filteredChats.map(chat => (
            <DropdownMenu.Item key={chat.id} className='items-start! rounded-md px-2 py-2'>
              <div className='flex flex-col gap-0.5'>
                <span className='text-sm font-medium text-foreground'>{chat.title}</span>
                <span className='text-xs text-muted-foreground line-clamp-1'>{chat.preview}</span>
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

export default ChatSelectPanel
