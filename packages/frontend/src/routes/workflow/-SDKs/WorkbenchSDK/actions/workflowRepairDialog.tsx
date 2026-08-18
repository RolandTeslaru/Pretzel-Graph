import { DialogSDK } from "@pretzel-graph/standard-ui/SDKs/DialogSDK"
import { ShelfSDK } from "../../ShelfSDK/sdk"
import { AlertDialog } from "@pretzel-graph/standard-ui/foundations"
import { Workflow } from "@pretzel-graph/shared/domain"

export function requestWorkflowRepair(
    workflow:    Workflow,
    repairs:     readonly Workflow.Repair[],
    abortSignal: AbortSignal,
): Promise<boolean> {
    if (!repairs.length)
        return Promise.resolve(true)

    const dialogId = `repair-workflow-${workflow.id}`

    return new Promise(resolve => {
        let settled = false

        const settle = (approved: boolean) => {
            if (settled)
                return

            settled = true
            abortSignal.removeEventListener("abort", onAbort)
            DialogSDK.actions.pop(dialogId)
            resolve(approved)
        }

        const onAbort = () => settle(false)

        if (abortSignal.aborted) {
            settle(false)
            return
        }

        abortSignal.addEventListener("abort", onAbort, { once: true })

        const removed = repairs.filter(repair => repair.resolution === "REMOVE_NODE")
        const reset   = repairs.filter(repair => repair.resolution === "RESET_TO_BASE")

        const nodeName = (repair: Workflow.Repair) => {
            const node      = workflow.data.nodes[repair.nodeId]
            const blueprint = ShelfSDK.state.blueprints[repair.blueprintId]

            return node?.ui.displayName ?? blueprint?.ui.displayName ?? repair.blueprintId
        }

        DialogSDK.actions.push(dialogId, props => (
            <DialogSDK.AlertTemplate
                {...props}
                type={removed.length ? "danger" : "warning"}
                dismissible={false}
                approveLabel="Repair workflow"
                onApprove={() => settle(true)}
                onCancel={() => settle(false)}
            >
                <AlertDialog.Title>Workflow repair required</AlertDialog.Title>
                <AlertDialog.Description asChild>
                    <div className="mt-2 flex flex-col gap-3 text-sm text-muted-foreground">
                        <p>
                            This workflow references blueprint definitions that are no longer
                            available. Review the automatic repairs before opening it.
                        </p>

                        {reset.length > 0 && (
                            <div>
                                <p className="font-medium text-foreground">
                                    Reset to the current base blueprint
                                </p>
                                <ul className="mt-1 list-disc pl-5">
                                    {reset.map(repair => (
                                        <li key={repair.nodeId}>{nodeName(repair)}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {removed.length > 0 && (
                            <div>
                                <p className="font-medium text-destructive">
                                    Remove nodes whose base blueprint is missing
                                </p>
                                <ul className="mt-1 list-disc pl-5">
                                    {removed.map(repair => (
                                        <li key={repair.nodeId}>{nodeName(repair)}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <p>The repaired workflow will be saved after it opens.</p>
                    </div>
                </AlertDialog.Description>
            </DialogSDK.AlertTemplate>
        ))
    })
}
