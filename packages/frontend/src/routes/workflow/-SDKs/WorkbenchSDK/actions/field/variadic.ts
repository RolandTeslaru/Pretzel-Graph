import type { WorkbenchSDKImpl } from "../../sdk";
import { withCommit } from "../../utils/actions";
import type { Field } from "@pretzel-graph/shared/domain/Foundations/Field";
import type { Workflow } from "@pretzel-graph/shared/domain";

type NodeId  = Workflow.Node.Id
type FieldId = Field.Id

export function createVariadicActions(sdk: WorkbenchSDKImpl) {
    const setState = sdk.useStore.setState;
    const reducers = sdk.reducers;
    const sel      = sdk.selectors;

    return {
        add: withCommit((nodeId, fieldId) => {
            const field = sel.field.get(sdk.state, nodeId, fieldId);
            if (!field || field.groupId === undefined)
                throw new Error(`Field ${fieldId} not found on node ${nodeId} or is not variadic`)

            setState(s => { reducers.field.variadic.add(s, nodeId, field.groupId!) })
        }),

        remove: withCommit((nodeId, fieldId) => {
            const field = sel.field.get(sdk.state, nodeId, fieldId);
            if (!field || field.groupId === undefined)
                throw new Error(`Field ${fieldId} not found on node ${nodeId} or is not variadic`)

            setState(s => { reducers.field.variadic.remove(s, nodeId, field.groupId!) })
        }),
    } satisfies VariadicActions
}


export interface VariadicActions {
    add    : (nodeId: NodeId, fieldId: FieldId) => void
    remove : (nodeId: NodeId, fieldId: FieldId) => void
}
