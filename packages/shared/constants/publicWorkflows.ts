import { Foundations, Workflow } from "../domain"

export const PUBLIC_WORKFLOW_BLUEPRINTS = {
    "Core.Agent": "b993f175-a07e-4d6e-bbdc-700ffb6b83a0",
    "Core.Utils.Compactor": "ac147960-ed28-44ed-8808-1e4348a6dda8",
} as Record<Foundations.Blueprint.Id, Workflow.Id>

export const PUBLIC_WORKFLOW_BLUEPRINTS_REVERSE: Record<Workflow.Id, Foundations.Blueprint.Id> = Object.fromEntries(
    Object.entries(PUBLIC_WORKFLOW_BLUEPRINTS).map(([blueprintId, workflowId]) => [workflowId, blueprintId])
) as Record<Workflow.Id, Foundations.Blueprint.Id>
