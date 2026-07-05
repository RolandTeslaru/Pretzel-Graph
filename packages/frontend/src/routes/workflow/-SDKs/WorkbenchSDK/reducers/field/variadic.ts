import { cloneDeep } from "lodash";
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
        const node      = s.selectors.node.get(s, nodeId);
        const blueprint = s.selectors.node.getBlueprint(s, nodeId);

        // Live ports only give us the slot count / last index. New slots are cloned from the
        // BASE blueprint port so they carry its pristine unresolved variant — cloning from the
        // resolved live port would bake the group's resolved variant into every new slot.
        const inputs     = s.selectors.node.getInputs(s, nodeId).filter(i => i.groupId === groupId);
        const outputs    = s.selectors.node.getOutputs(s, nodeId).filter(o => o.groupId === groupId);
        const baseInput  = blueprint.inputs.find(i => i.groupId === groupId);
        const baseOutput = blueprint.outputs.find(o => o.groupId === groupId);

        if (baseInput && inputs.length > 0) {
            const newIndex  = Number(inputs[inputs.length - 1].id.split("_").slice(-1)[0]) + 1;
            const newSuffix = "_" + newIndex;

            // Clone the pristine base port; bump the numeric suffix on id + polymorphicGroupId.
            // groupId stays fixed — it identifies the variadic group across all its slots.
            const newInput = cloneDeep(baseInput);
            newInput.polymorphicGroupId = baseInput.polymorphicGroupId?.replace(/_[^_]+$/, newSuffix) as Port.PolymorphicGroupId;
            newInput.id                 = baseInput.id.replace(/_[^_]+$/, newSuffix) as Port.Input.Id;
            newInput.displayName        = baseInput.displayName?.replace(/\d+$/, String(newIndex));

            node.addedInputs = node.addedInputs ?? [];
            node.addedInputs.push(newInput);
        }

        if (baseOutput && outputs.length > 0) {
            const newIndex  = Number(outputs[outputs.length - 1].id.split("_").slice(-1)[0]) + 1;
            const newSuffix = "_" + newIndex;

            const newOutput = cloneDeep(baseOutput);
            newOutput.polymorphicGroupId = baseOutput.polymorphicGroupId?.replace(/_[^_]+$/, newSuffix) as Port.PolymorphicGroupId;
            newOutput.id                 = baseOutput.id.replace(/_[^_]+$/, newSuffix) as Port.Output.Id;
            newOutput.displayName        = baseOutput.displayName?.replace(/\d+$/, String(newIndex));

            node.addedOutputs = node.addedOutputs ?? [];
            node.addedOutputs.push(newOutput);
        }
    },
    // Removes the last slot in the variadic group. Guards against removing below
    // 1 slot so the group always retains at least one input and one output.
    remove: (s, nodeId, groupId) => {
        s.isDirty = true;
        const node    = s.selectors.node.get(s, nodeId);
        const inputs  = node.addedInputs?.filter(i => i.groupId === groupId) ?? [];
        const outputs = node.addedOutputs?.filter(o => o.groupId === groupId) ?? [];

        if (inputs.length > 0) {
            s.reducers.input.remove(s, nodeId, inputs[inputs.length - 1].id);
        }
        if (outputs.length > 0) {
            const lastOutput = outputs[outputs.length - 1];
            // Disconnect any edge wired to the output before removing the port
            const edgeId = s.cache.outputHandlesMap[nodeId]?.[lastOutput.id];
            if (edgeId)
                s.reducers.edge.remove(s, edgeId);
            const idx = node.addedOutputs?.findIndex(o => o.id === lastOutput.id);
            if (idx !== undefined && idx !== -1)
                node.addedOutputs?.splice(idx, 1);
        }
    },
} satisfies FieldVariadicReducers


export interface FieldVariadicReducers {
    add    : (s: S, nodeId: NodeId, groupId: string) => void
    remove : (s: S, nodeId: NodeId, groupId: string) => void
}
