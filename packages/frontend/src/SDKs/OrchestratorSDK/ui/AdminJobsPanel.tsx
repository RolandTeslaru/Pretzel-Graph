import { useState, useEffect, useCallback } from 'react'
import { Button, Badge, AlertDialog, Spinner } from '@vx-agent-editor/vx-ui/foundations'
import { SystemIcons } from '@vx-agent-editor/vx-ui/icons'
import { AuthSDK } from '@/SDKs/AuthSDK/sdk'
import { Orchestrator } from '@vx-agent-editor/shared/domain'
import { api } from '@/SDKs/ApiInterceptorSDK'
import { toast } from 'sonner'

type ActiveJob = Orchestrator.API.ListActive.Response['jobs'][number]

const statusColor = (status: string) => {
    if (status === 'running') return 'default'
    if (status === 'pending') return 'secondary'
    return 'outline'
}

export const AdminJobsPanel = () => {
    const user = AuthSDK.useStore(s => s.user)
    const [jobs, setJobs] = useState<ActiveJob[]>([])
    const [loading, setLoading] = useState(false)
    const [terminating, setTerminating] = useState(false)

    if (!user?.is_admin) return null

    const fetchJobs = useCallback(async () => {
        setLoading(true)
        try {
            const res = await Orchestrator.API.listActive(api)
            setJobs(res.jobs)
        } catch {
            toast.error('Failed to fetch active jobs')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchJobs() }, [fetchJobs])

    const handleTerminateAll = async () => {
        setTerminating(true)
        try {
            const res = await Orchestrator.API.terminateAll(api)
            toast.success(`Terminated ${res.terminatedCount} job(s)`)
            setJobs([])
        } catch {
            toast.error('Failed to terminate jobs')
        } finally {
            setTerminating(false)
        }
    }

    return (
        <div className="fixed bottom-5 right-5 z-50 w-80 rounded-xl border border-border bg-card/90 backdrop-blur-sm shadow-2xl shadow-black/30">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div className="flex items-center gap-2">
                    <SystemIcons.Activity className="size-4 text-muted-foreground" />
                    <span className="text-sm font-semibold">Active Jobs</span>
                    {jobs.length > 0 && (
                        <Badge variant="destructive">{jobs.length}</Badge>
                    )}
                </div>
                <Button variant="ghost" size="icon-xs" onClick={fetchJobs} disabled={loading}>
                    <SystemIcons.RefreshCcw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
                </Button>
            </div>

            <div className="max-h-60 overflow-y-auto px-4 py-2">
                {loading && jobs.length === 0 ? (
                    <div className="flex justify-center py-4">
                        <Spinner />
                    </div>
                ) : jobs.length === 0 ? (
                    <p className="py-4 text-center text-xs text-muted-foreground">No active jobs</p>
                ) : (
                    <div className="flex flex-col gap-2">
                        {jobs.map(job => (
                            <div key={job.id} className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 px-3 py-2">
                                <div className="flex flex-col gap-0.5 min-w-0">
                                    <span className="text-xs font-mono text-foreground truncate">{job.id.slice(0, 8)}...</span>
                                    <span className="text-[10px] text-muted-foreground">
                                        {new Date(job.created_at).toLocaleTimeString()}
                                    </span>
                                </div>
                                <Badge variant={statusColor(job.status)}>{job.status}</Badge>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {jobs.length > 0 && (
                <div className="border-t border-border px-4 py-3">
                    <AlertDialog.Root>
                        <AlertDialog.Trigger asChild>
                            <Button variant="destructive" size="sm" className="w-full" disabled={terminating}>
                                {terminating ? <Spinner /> : <SystemIcons.X className="size-3.5" />}
                                Terminate All ({jobs.length})
                            </Button>
                        </AlertDialog.Trigger>
                        <AlertDialog.Content className="w-[400px] p-6 -translate-x-1/2 -translate-y-1/2">
                            <AlertDialog.Header>
                                <AlertDialog.Title>Terminate all active jobs?</AlertDialog.Title>
                                <AlertDialog.Description>
                                    This will forcefully terminate {jobs.length} running job(s). This action cannot be undone.
                                </AlertDialog.Description>
                            </AlertDialog.Header>
                            <AlertDialog.Footer className="mt-4">
                                <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
                                <AlertDialog.Action variant="destructive" onClick={handleTerminateAll}>
                                    Terminate All
                                </AlertDialog.Action>
                            </AlertDialog.Footer>
                        </AlertDialog.Content>
                    </AlertDialog.Root>
                </div>
            )}
        </div>
    )
}
