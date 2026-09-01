import { ShelfSDK } from "../../../ShelfSDK/sdk";
import type { WorkbenchSDKImpl, WorkbenchSDK } from "../../sdk";
import { debouncedValidateField, withAsyncCommit, withCommit, withCyclesRecompute } from "../../utils/actions";
import type { NodeActions } from "../node";
import type { Foundations, Workflow } from "@pretzel-graph/shared/domain";
import type { DropFirstArg } from "@/SDKs/types";
import { Field } from "@pretzel-graph/shared/domain/Foundations/Field";
import { Blueprint } from "@pretzel-graph/shared/domain/Foundations/Blueprint";
import { createVariadicActions, type VariadicActions } from "./variadic";
import { createConditionActions, type ConditionActions } from "./condition";
import { createCaseListActions, type CaseListActions } from "./caseList";

export function createFieldActions(sdk: WorkbenchSDKImpl, nodeActions: NodeActions) {
    const setState = sdk.useStore.setState;
    const reducers = sdk.reducers;
    const sel      = sdk.selectors;

    const validateFieldById = (nodeId: Workflow.Node.Id, fieldId: Foundations.Field.Id) => {
        const field = sel.field.get(sdk.state, nodeId, fieldId)
        if (!field)
            throw new Error(`Field ${fieldId} not found on node ${nodeId}`)
        debouncedValidateField(nodeId, field)
    }

    return {
        setValue: withAsyncCommit(async (nodeId, field, value) => {
            if (field.id === "signalDependency") {
                nodeActions.setSignalStrategy(nodeId, value);
                return;
            }

            if (field.reconcile) {
                try {
                    // The BASE, not the node's current blueprint — derive() strips _derivatives
                    // from its output, so re-deriving off an already-derived blueprint finds no tree.
                    const node      = sdk.state.data.nodes[nodeId];
                    const blueprint = ShelfSDK.state.blueprints[node?.blueprintId]
                        ?? sdk.selectors.node.getBlueprint(sdk.state, nodeId);
                    if (!blueprint)
                        return;

                    // Merge the just-set value in — getValues is read pre-commit, so it's stale.
                    const fieldValues = { ...sel.field.getValues(sdk.state, nodeId), [field.id]: value };

                    const derivedBlueprint      = ShelfSDK.actions.getDerivedBlueprint(blueprint, fieldValues);
                    const reconciledBlueprintId = Blueprint.deriveId(blueprint, fieldValues);

                    setState(withCyclesRecompute(s => {
                        reducers.node.applyDerivative(s, nodeId, derivedBlueprint, reconciledBlueprintId)
                        reducers.node.validate(s, nodeId);
                    }));
                } catch (error) {
                    throw new Error(`Could not derive node ${nodeId} via field ${field.id}. ${error instanceof Error ? error.message : String(error)}`)
                }
            }

            setState(s => {
                reducers.field.setValue(s, nodeId, field.id, value)
                reducers.field.clearDependentFields(s, nodeId, field.id)
            });

            debouncedValidateField(nodeId, field);
        }),
        validate:        (...props) => { setState(s => { reducers.field.validate(s, ...props) }) },
        setIsExpression: withCommit((...props) => { setState(s => { reducers.field.setIsExpression(s, ...props) }) }),
        variadic:  createVariadicActions(sdk),
        condition: createConditionActions(sdk, validateFieldById),
        caseList:  createCaseListActions(sdk, validateFieldById),
    } satisfies FieldActions;
}


export interface FieldActions {
    setValue        : (nodeId: Workflow.Node.Id, field: Field, value: any) => void
    validate        : DropFirstArg<WorkbenchSDK.Reducers['field']['validate']>
    setIsExpression : DropFirstArg<WorkbenchSDK.Reducers['field']['setIsExpression']>
    variadic        : VariadicActions
    condition       : ConditionActions
    caseList        : CaseListActions
}
