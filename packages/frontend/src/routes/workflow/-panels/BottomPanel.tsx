import { WorkbenchSDK } from '@/routes/workflow/-SDKs/WorkbenchSDK/sdk'
import TemporalControls from '@/routes/workflow/-SDKs/WorkbenchSDK/ui/TemporalControls'
import ChatButton from '@/routes/workflow/-SDKs/ChatSDK/ui/ChatButton'
import AssistantButton from '@/routes/workflow/-SDKs/AssistantSDK/ui/AssistantButton'
import ExecutionControls from '@/routes/workflow/-SDKs/ExecutionSDK/ui/ExecutionControls'
import ErrorViewer from '@/routes/workflow/-SDKs/ExecutionSDK/ui/ErrorViewer'
import IssuesViewer from '@/routes/workflow/-SDKs/WorkbenchSDK/ui/IssuesViewer'
import { GlowingAlertTriangle, GlowingAlertTriangleRed } from '@/routes/workflow/-SDKs/WorkbenchSDK/ui/Canvas/Node/Header/icons'
import { ExecutionSDK } from '@/routes/workflow/-SDKs/ExecutionSDK/sdk'
import { Popover, Switch } from '@pretzel-graph/standard-ui/foundations'
import { Validation } from '@pretzel-graph/shared/domain'
import { AnimatePresence, motion } from 'motion/react'
import { DrawerSDK } from '../-SDKs/DrawerSDK/sdk'
import Tipped from '@/components/Tipped'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'

export const BottomPanel = () => {
    const hasIssues = WorkbenchSDK.useStore(s => Validation.workflowHasIssues(s.issues));
    const executionHasError = ExecutionSDK.useStore(s => {
        const exec = s.currentExecution;
        if (!exec) return false;
        if (exec.error) return true;
        return Object.values(exec.session.node_status).some(ns => ns.status === 'failed');
    });
    
    const [
        currentExecution,
        recordExecution,
        isCurrentExecutionRecording
    ] = ExecutionSDK.useStore(s => [
        s.currentExecution,
        s.recordExecution,
        s.isCurrentExecutionRecording
    ]);

    return (
        <div className='bottom-5 flex flex-row left-1/2 -translate-x-1/2 z-20 absolute gap-2'>
            <motion.div layout transition={{ layout: { type: "spring", stiffness: 400, damping: 30 } }} className='relative shadow-md shadow-black/10 flex flex-row p-1 gap-2 rounded-xl bg-card/80 backdrop-blur-sm border border-border overflow-visible'>
                <TemporalControls />
                <ChatButton />
                <AssistantButton />
                <ExecutionControls canRun={!hasIssues} />

                <AnimatePresence>
                    {executionHasError && (
                        <Popover.Root>
                            <Popover.Trigger asChild>
                                <motion.div
                                    className='absolute right-[calc(100%+16px)] top-1/2 -translate-y-1/2 p-1 h-10 w-10 bg-card/90 backdrop-blur-sm border border-border rounded-full flex cursor-pointer'
                                    initial={{ x: 24, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    exit={{ x: 24, opacity: 0 }}
                                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                >
                                    <div className='w-auto h-auto mx-auto mt-[5px]'>
                                        <GlowingAlertTriangleRed />
                                    </div>
                                </motion.div>
                            </Popover.Trigger>
                            <Popover.Content side="top" align="center" sideOffset={12} className='rounded-xl p-3 max-w-100'>
                                <ErrorViewer />
                            </Popover.Content>
                        </Popover.Root>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {hasIssues && (
                        <Popover.Root>
                            <Popover.Trigger asChild>
                                <motion.div
                                    className='absolute left-[calc(100%+16px)] top-1/2 -translate-y-1/2 p-1 h-10 w-10 bg-card/90 backdrop-blur-sm border border-border rounded-full flex cursor-pointer'
                                    initial={{ x: -24, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    exit={{ x: -24, opacity: 0 }}
                                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                >
                                    <div className='w-auto h-auto mx-auto mt-[5px]'>
                                        <GlowingAlertTriangle/>
                                    </div>
                                </motion.div>
                            </Popover.Trigger>
                            <Popover.Content side="top" align="center" sideOffset={12} className='rounded-xl p-3 max-w-[450px]'>
                                <IssuesViewer />
                            </Popover.Content>
                        </Popover.Root>
                    )}
                </AnimatePresence>
            </motion.div>

            {(recordExecution || isCurrentExecutionRecording || currentExecution?.recording) && (
            <div className=' px-2 w-auto bg-card/90 backdrop-blur-sm border border-border rounded-full flex cursor-pointer'>
              <Tipped label={isCurrentExecutionRecording ? 'Recording' : 'Ready To Record'}>
                <div className='h-full flex flex-row gap-2'>
                  <SystemIcons.Film className='size-4 text-secondary-foreground my-auto' />
                  {/* <p className='text-sm font-medium text-muted-foreground my-auto h-auto'>Ready</p> */}
                  <div className={`content-[""] my-auto w-2 h-2  rounded-full animate-pulse ${isCurrentExecutionRecording ? 'bg-red-500' : 'bg-green-500'}`} />
                </div>
              </Tipped>
            </div>
          )}
        </div>

        
    )
}
