import { QuerySDK } from '@/SDKs/QuerySDK/sdk'
import React, { useState } from 'react'
import { ExecutionSDK } from '../../sdk'
import { WorkbenchSDK } from '../../../WorkbenchSDK/sdk'
import { Execution } from '@pretzel-graph/shared/domain'
import { api } from '@/SDKs/ApiInterceptorSDK'
import { toast } from 'sonner'
import { Badge, Button, Input, ScrollArea } from '@pretzel-graph/standard-ui/foundations'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { useDebounce } from 'use-debounce'
import type { BadgeProps } from '@pretzel-graph/standard-ui/foundations'

const statusVariant: Record<Execution.Status, BadgeProps["variant"]> = {
    pending:    "secondary",
    running:    "default",
    paused:     "outline",
    suspended:  "outline",
    completed:  "success",
    failed:     "destructive",
    terminated: "secondary",
}

const ExecutionHistoryPanel = () => {

    const workflowId = WorkbenchSDK.useStore(s => s.workflowId);
    const executionHistory = ExecutionSDK.useStore(s => s.executionHistory)

    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearchQuery] = useDebounce(searchQuery, 300);


    QuerySDK.useQuery(
        [`execution-history`, workflowId],
        () => ExecutionSDK.actions.loadHistory(workflowId),
        {
            staleTime: Infinity
        }
    )

    return (
        <div className='w-[300px]  flex flex-col gap-1 pb-0'>
            <div className='px-2 py-1 flex flex-col gap-2'>
                <div className='flex flex-row w-full'>
                    <h3 className='text-sm font-semibold my-auto h-auto'>Execution History</h3>
                    <Button size="icon-xs" variant="ghost" className='ml-auto' onClick={() => {
                        QuerySDK.client.invalidateQueries({ queryKey: [`execution-history`, workflowId] })
                    }}>
                        <SystemIcons.RefreshCcw className='scale-75'/>
                    </Button>
                </div>
                <Input
                    placeholder="Search by execution ID..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    size='xs'
                />
            </div>
            <ScrollArea.Root className=" max-h-[400px] min-h-[400px] h-[400px] [mask-image:linear-gradient(to_bottom,black_calc(100%-48px),transparent)]">
                <div className='flex flex-col'>
                    {executionHistory.length === 0 && (
                        <p className='text-xs text-muted-foreground'>No executions yet.</p>
                    )}
                    {executionHistory
                        .filter(meta => meta.id.includes(debouncedSearchQuery))
                        .map(meta => (
                        <div key={meta.id} className='p-2  relative cursor-pointer hover:bg-accent/50'
                            onClick={async () =>{
                                try {
                                    const data = await Execution.API.get(api, { executionId: meta.id})
                                    if (data.execution) {
                                        ExecutionSDK.actions.setCurrentExecution(data.execution)
                                    }
                                } catch (error) {
                                    console.error("Failed to fetch execution details:", error)
                                    toast.error("Failed to fetch execution")
                                }
                            }}
                        >
                            <div className='flex gap-2 mb-0.5 items-center'>
                                <p className='text-xs font-medium truncate max-w-[100px]'>{meta.id}</p>
                                <div className='flex flex-row gap-2 ml-auto'>
                                    {meta.has_recording && 
                                        <SystemIcons.Film size={12} className='text-secondary-foreground' />
                                    }
                                    <Badge variant={statusVariant[meta.status]} size="sm" className='ml-auto shrink-0'>{meta.status}</Badge>
                                </div>
                            </div>
                            <p className='text-[11px] text-muted-foreground'>Started at: {new Date(meta.created_at).toLocaleString()}</p>
                        </div>
                    ))}
                </div>
                
            </ScrollArea.Root>
        </div>
    )
}

export default ExecutionHistoryPanel
