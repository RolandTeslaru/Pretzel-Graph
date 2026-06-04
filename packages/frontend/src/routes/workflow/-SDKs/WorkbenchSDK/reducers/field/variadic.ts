import { cloneDeep } from "lodash";
import { inputReducers } from "../input";
import { edgeReducers } from "../edge";
import type { WorkbenchSDK } from "../../sdk";
import type { Workflow } from "@pretzel-graph/shared/domain";
import type { Port } from "@pretzel-graph/shared/domain/Foundations/Port";

type S      = WorkbenchSDK.State
type NodeId = Workflow.Node.Id

export const fieldVariadicReducers = {
    // Appends a new slot to the variadic group by cloning the last port in the group
    // and incrementing its numeric suffix (e.g. input_1 → input_2).
    add: (s, nodeId, groupId) => {
        s.isDirty = true;
        const node    = s.selectors.node.get(s, nodeId);
        const inputs  = node.inputs.filter(i => i.groupId === groupId);
        const outputs = node.outputs.filter(o => o.groupId === groupId);

        if (inputs.length > 0) {
            const newInput       = cloneDeep(inputs[inputs.length - 1]);
            const oldPolyGroupId = newInput.polymorphicGroupId;
            const lastIndex      = Number(newInput.id.split("_").slice(-1)[0]);
            const newSuffix      = "_" + (lastIndex + 1)

            // Bump the numeric suffix on id and polymorphicGroupId
            newInput.polymorphicGroupId = newInput.polymorphicGroupId?.replace(/_[^_]+$/, newSuffix) as string;
            newInput.id                 = newInput.id.replace(/_[^_]+$/, newSuffix) as Port.Input.Id;
            newInput.displayName        = newInput.displayName?.replace(/\d+$/, String(lastIndex + 1))

            // When the polymorphicGroupId changes the port enters a new poly group,
            // so reset its variant back to the original unresolved variant.
            if (oldPolyGroupId !== newInput.polymorphicGroupId && "originalVariant" in newInput && newInput.originalVariant) {
                (newInput as any).variant = newInput.originalVariant;
            }

            node.inputs.push(newInput);
        }

        if (outputs.length > 0) {
            const newOutput      = cloneDeep(outputs[outputs.length - 1]);
            const oldPolyGroupId = newOutput.polymorphicGroupId;
            const lastIndex      = Number(newOutput.id.split("_").slice(-1)[0]);
            const newSuffix      = "_" + (lastIndex + 1)

            // Same suffix-bumping logic for outputs
            newOutput.polymorphicGroupId = newOutput.polymorphicGroupId?.replace(/_[^_]+$/, newSuffix) as string;
            newOutput.id                 = newOutput.id.replace(/_[^_]+$/, newSuffix) as Port.Output.Id;
            newOutput.displayName        = newOutput.displayName?.replace(/\d+$/, String(lastIndex + 1))

            if (oldPolyGroupId !== newOutput.polymorphicGroupId && "originalVariant" in newOutput && newOutput.originalVariant) {
                (newOutput as any).variant = newOutput.originalVariant;
            }

            node.outputs.push(newOutput);
        }
    },
    // Removes the last slot in the variadic group. Guards against removing below
    // 1 slot so the group always retains at least one input and one output.
    remove: (s, nodeId, groupId) => {
        s.isDirty = true;
        const node    = s.selectors.node.get(s, nodeId);
        const inputs  = node.inputs.filter(i => i.groupId === groupId);
        const outputs = node.outputs.filter(o => o.groupId === groupId);

        if (inputs.length > 1) {
            inputReducers.remove(s, nodeId, inputs[inputs.length - 1].id);
        }
        if (outputs.length > 1) {
            const lastOutput = outputs[outputs.length - 1];
            // Disconnect any edge wired to the output before removing the port
            const edgeId = s.cache.outputHandlesMap[nodeId]?.[lastOutput.id];
            if (edgeId)
                edgeReducers.remove(s, edgeId);
            const idx = node.outputs.findIndex(o => o.id === lastOutput.id);
            if (idx !== -1)
                node.outputs.splice(idx, 1);
        }
    },
} satisfies FieldVariadicReducers


export interface FieldVariadicReducers {
    add    : (s: S, nodeId: NodeId, groupId: string) => void
    remove : (s: S, nodeId: NodeId, groupId: string) => void
}
