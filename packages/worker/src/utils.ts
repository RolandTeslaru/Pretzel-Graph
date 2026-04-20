import { Foundations, Workflow } from "@vx-agent-editor/shared/domain";
import { InferFields } from "./types";

export const uid = {
    randomUUID: (length: number) => Math.random().toString(36).substring(2, 2 + length)
}

export function resolveFields<T_Blueprint extends Foundations.Blueprint>(
    nodeId: Workflow.Node.Id,
    workflowData: Workflow.Data
): InferFields<T_Blueprint> {
    const node = workflowData.nodes[nodeId];
    const staticValues = workflowData.staticValues[nodeId] ?? {};

    const resolved: Record<Foundations.Field.Id, Foundations.Field.Value> = {};

    for (const field of node.fields) {
        const fieldId = field.id as Foundations.Field.Id;

        if (fieldId in staticValues)
            resolved[fieldId] = staticValues[fieldId] as Foundations.Field.Value;
        else
            resolved[fieldId] = field.initialValue as Foundations.Field.Value;
    }

    return resolved as InferFields<T_Blueprint>
}
