import { Foundations, Workflow } from "@pretzel-graph/shared/domain";
import { InferFields } from "./types";

export const uid = {
    randomUUID: (length: number) => Math.random().toString(36).substring(2, 2 + length)
}

export function mapFieldValues<T_Blueprint extends Foundations.Blueprint>(
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


const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isUUID(value: string): boolean {
    return UUID_REGEX.test(value)
}