import { memo, useMemo, useState } from 'react'
import { Button, Dialog, Input } from '@pretzel-graph/standard-ui/foundations'
import { Workflow } from '@pretzel-graph/shared/domain'
import { LibrarySDK } from '@/SDKs/LibrarySDK/sdk'
import { VersionControlSDK } from '@/SDKs/VersionControlSDK/sdk'
import { WorkbenchSDK } from '../../../sdk'
import { DialogSDK } from '@/SDKs/DialogSDK'
import type { Field } from '@pretzel-graph/shared/domain/Foundations/Field'
import { ActiveWorkflowItem } from './ActiveWorkflowItem'

interface Props {
    nodeId: Workflow.Node.Id
    field: Field.DependencySelector
    dialogId: string
    selectedWorkflowId: Workflow.Id | ""
}

export const DependencySelectorDialogContent = memo<Props>(({ nodeId, field, dialogId, selectedWorkflowId }) => {
    const [query, setQuery] = useState("")
    const [manualWorkflowId, setManualWorkflowId] = useState("")

    const activeWorkflows = VersionControlSDK.useStore(s => s.activeWorkflows)
    const workflowMetas = LibrarySDK.useStore(s => s.workflowMetas)

    const activeOptions = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase()

        return Object.values(activeWorkflows)
            .map(publication => {
                const workflow = workflowMetas[publication.workflow_id]
                return { publication, workflow }
            })
            .filter(({ publication, workflow }) => {
                if (!normalizedQuery) return true
                const workflowName = workflow?.display_name ?? publication.name
                return (
                    workflowName.toLowerCase().includes(normalizedQuery) ||
                    publication.name.toLowerCase().includes(normalizedQuery) ||
                    publication.id.toLowerCase().includes(normalizedQuery) ||
                    publication.workflow_id.toLowerCase().includes(normalizedQuery)
                )
            })
            .sort((a, b) => {
                const nameA = a.workflow?.display_name ?? a.publication.name
                const nameB = b.workflow?.display_name ?? b.publication.name
                return nameA.localeCompare(nameB)
            })
    }, [activeWorkflows, query, workflowMetas])

    const handleSelect = (workflowId: Workflow.Id) => {
        WorkbenchSDK.actions.dependency.setWorkflowId(nodeId, field, workflowId)
        DialogSDK.actions.pop(dialogId)
    }

    const handleManualSet = () => {
        WorkbenchSDK.actions.dependency.setWorkflowId(nodeId, field, manualWorkflowId as Workflow.Id)
        DialogSDK.actions.pop(dialogId)
    }

    return (
        <div className="flex flex-col gap-3 p-4 w-[360px]">
            <Dialog.Title className="text-sm font-semibold">Select Workflow</Dialog.Title>
            <Dialog.Description className="sr-only">Search and select an active published workflow</Dialog.Description>

            <Input
                size="sm"
                placeholder="Search active published workflows"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
            />

            <div className="max-h-64 overflow-y-auto rounded-md border border-border/60">
                {activeOptions.length > 0 ? (
                    activeOptions.map(({ publication, workflow }) => (
                        <ActiveWorkflowItem
                            key={publication.id}
                            publication={publication}
                            workflow={workflow}
                            isSelected={publication.workflow_id === selectedWorkflowId}
                            onSelect={handleSelect}
                        />
                    ))
                ) : (
                    <div className="px-2 py-4 text-center text-xs text-muted-foreground">
                        No active published workflows found
                    </div>
                )}
            </div>

            <div className="flex flex-col gap-1 border-t border-border pt-2">
                <span className="text-[10px] font-medium text-muted-foreground">or use a workflow ID directly</span>
                <div className="flex gap-1">
                    <Input
                        size="sm"
                        placeholder="Paste workflow id"
                        value={manualWorkflowId}
                        onChange={(e) => setManualWorkflowId(e.target.value as Workflow.Id | "")}
                    />
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={!manualWorkflowId}
                        onClick={handleManualSet}
                    >
                        Set
                    </Button>
                </div>
            </div>
        </div>
    )
})
DependencySelectorDialogContent.displayName = "DependencySelectorDialogContent"
