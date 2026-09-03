import { cloneDeep } from "lodash";
import type { Document } from "../../index";
import type { Workflow } from "../../../../Workflow";
import type { Port } from "../../../../Foundations/Port";

type NodeId = Workflow.Node.Id

export const fieldVariadicReducers: FieldVariadicReducers = {
    // Appends a new slot to the variadic group by cloning the last port in the group
    // and incrementing its numeric suffix (e.g. input_1 → input_2).
    add: (d, nodeId, groupId) => {
        d.isDirty = true;
        const node      = d.selectors.node.get(d, nodeId);
        const blueprint = d.selectors.node.getBlueprint(d, nodeId);
        if (!blueprint)
            return;

        // Live ports only give us the slot count / last index. New slots are cloned from the
        // BASE blueprint port so they carry its pristine unresolved variant — cloning from the
        // resolved live port would bake the group's resolved variant into every new slot.
        const inputs     = d.selectors.node.getInputs(d, nodeId).filter(i => i.groupId === groupId);
        const outputs    = d.selectors.node.getOutputs(d, nodeId).filter(o => o.groupId === groupId);
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

        d.reducers.cache.resolvedShape.recreate(d, nodeId);
    },
    // Removes the last slot in the variadic group. Guards against removing below
    // 1 slot so the group always retains at least one input and one output.
    remove: (d, nodeId, groupId) => {
        d.isDirty = true;
        const node    = d.selectors.node.get(d, nodeId);
        const inputs  = node.addedInputs?.filter(i => i.groupId === groupId) ?? [];
        const outputs = node.addedOutputs?.filter(o => o.groupId === groupId) ?? [];

        if (inputs.length > 0) {
            d.reducers.input.remove(d, nodeId, inputs[inputs.length - 1].id);
        }
        if (outputs.length > 0) {
            const lastOutput = outputs[outputs.length - 1];
            // Disconnect any edge wired to the output before removing the port
            const edgeId = d.cache.outputEdgesByPort[nodeId]?.[lastOutput.id];
            if (edgeId)
                d.reducers.edge.remove(d, edgeId);
            const idx = node.addedOutputs?.findIndex(o => o.id === lastOutput.id);
            if (idx !== undefined && idx !== -1)
                node.addedOutputs?.splice(idx, 1);
        }

        d.reducers.cache.resolvedShape.recreate(d, nodeId);
    },
}


export interface FieldVariadicReducers {
    add    : (document: Document, nodeId: NodeId, groupId: string) => void
    remove : (document: Document, nodeId: NodeId, groupId: string) => void
}
