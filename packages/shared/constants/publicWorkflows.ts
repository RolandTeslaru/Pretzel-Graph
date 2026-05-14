import { Foundations, Workflow } from "../domain"

export const PUBLIC_WORKFLOW_BLUEPRINTS: Record<Foundations.Blueprint.Id, Workflow.Id> = {
    ["Core.Agent" as Foundations.Blueprint.Id]: "b993f175-a07e-4d6e-bbdc-700ffb6b83a0" as Workflow.Id,
}

export const PUBLIC_WORKFLOW_BLUEPRINTS_REVERSE: Record<Workflow.Id, Foundations.Blueprint.Id> = Object.fromEntries(
    Object.entries(PUBLIC_WORKFLOW_BLUEPRINTS).map(([blueprintId, workflowId]) => [workflowId, blueprintId])
) as Record<Workflow.Id, Foundations.Blueprint.Id>
