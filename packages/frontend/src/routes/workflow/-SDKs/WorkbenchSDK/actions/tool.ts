import type { WorkbenchSDKImpl } from "../sdk"
import type { Workflow } from "@pretzel-graph/shared/domain";
import type { FieldActions } from "./field";
import { Field } from "@pretzel-graph/shared/domain/Foundations/Field";

export function createToolActions(sdk: WorkbenchSDKImpl, fieldActions: FieldActions) {
    const sel = sdk.selectors;

    return {
        convert: async (nodeId) => {
            try {
                const field = sel.field.get(sdk.state, nodeId, "isConvertedToTool" as Field.Id);
                if (!field) throw new Error(`Node does not have an isConvertedToTool field — is it toolCompatible?`);
                await fieldActions.setValue(nodeId, field, true);
            } catch (error) {
                throw new Error(`Could not convert node ${nodeId} to tool. ${error instanceof Error ? error.message : String(error)}`);
            }
        },
        revert: async (nodeId) => {
            try {
                const field = sel.field.get(sdk.state, nodeId, "isConvertedToTool" as Field.Id);
                if (!field) throw new Error(`Node does not have an isConvertedToTool field — is it toolCompatible?`);
                await fieldActions.setValue(nodeId, field, false);
            } catch (error) {
                throw new Error(`Could not revert node ${nodeId} from tool. ${error instanceof Error ? error.message : String(error)}`);
            }
        },
    } satisfies ToolActions;
}

export type ToolActions = {
    convert             : (nodeId: Workflow.Node.Id) => void;
    revert              : (nodeId: Workflow.Node.Id) => void;
};
