import type { Foundations, Workflow } from "./domain";

export const Validator = {
    validatorWorkflow: (workflow: Workflow, cache: Workflow.Cache) => {
        const issues: Record<Workflow.Node.Id, {
            fields: Record<Foundations.Field.Id, Workflow.Issue>;
            inputs: Record<Foundations.Port.Input.Id, Workflow.Issue[]>;
        }> = {};

        
    },
    validateField: (workflow: Workflow, nodeId: Workflow.Node.Id, field: Foundations.Field) => {
        if (!field.required)
            return null;

        const value = workflow.data.staticValues[nodeId]?.[field.id];

        if (value === undefined || value === null || value === "")
            return {
                field,
                type: 'missing_value' as const,
            }
        return null;
    },
    validateInput: (workflow: Workflow, cache: Workflow.Cache, nodeId: Workflow.Node.Id, input: Foundations.Port.Input) => {
        if (!input.required)
            return null;

        const hasEdge = !!cache.inputHandlesMap[nodeId]?.[input.id];
        if (hasEdge)
            return null;

        if (input.variant === "Message" || input.variant === "Text") {
            const value = workflow.data.staticValues[nodeId]?.[input.id];
            if (value !== undefined && value !== null && value !== "")
                return null;

            return {
                input,
                type: 'missing_value_or_connection',
            }
        }

        return {
            input,
            type: 'missing_connection',
        }
    }
}