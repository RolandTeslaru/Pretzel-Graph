import { Workflow } from "@pretzel-graph/shared/domain";
import { InferFieldValues } from "./types";
import { Field } from "@pretzel-graph/shared/domain/Foundations/Field";
import { Blueprint } from "@pretzel-graph/shared/domain/Foundations/Blueprint";

export const uid = {
    randomUUID: (length: number) => Math.random().toString(36).substring(2, 2 + length)
}

export function mapFieldValues<T_Blueprint extends Blueprint>(
    nodeId: Workflow.Node.Id,
    workflowData: Workflow.Data
): InferFieldValues<T_Blueprint> {
    const node = workflowData.nodes[nodeId];
    const staticValues = workflowData.staticValues[nodeId] ?? {};

    const resolved: Record<Field.Id, Field.Value> = {};

    for (const field of node.fields) {
        const fieldId = field.id as Field.Id;

        if (fieldId in staticValues)
            resolved[fieldId] = staticValues[fieldId] as Field.Value;
        else
            resolved[fieldId] = field.initialValue as Field.Value;
    }

    return resolved as InferFieldValues<T_Blueprint>
}


const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isUUID(value: string): boolean {
    return UUID_REGEX.test(value)
}