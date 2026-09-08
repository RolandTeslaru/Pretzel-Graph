import type { WorkbenchSDKImpl, WorkbenchSDK } from "../../sdk";
import { debouncedValidateField, withAsyncCommit, withCommit, withCyclesRecompute } from "../../utils/actions";
import type { NodeActions } from "../node";
import type { Foundations, Workflow } from "@pretzel-graph/shared/domain";
import type { DropFirstArg } from "@/SDKs/types";
import { Field } from "@pretzel-graph/shared/domain/Foundations/Field";
import { createVariadicActions, type VariadicActions } from "./variadic";
import { createConditionActions, type ConditionActions } from "./condition";
import { createCaseListActions, type CaseListActions } from "./caseList";

export function createFieldActions(sdk: WorkbenchSDKImpl, nodeActions: NodeActions) {
    const setDocument = sdk.setDocument;
    const reducers = sdk.reducers;
    const sel      = sdk.selectors;

    const validateFieldById = (nodeId: Workflow.Node.Id, fieldId: Foundations.Field.Id) => {
        const field = sel.field.get(sdk.document, nodeId, fieldId)
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

            // One producer, so the reshape and the write land as a single render and a single
            // undo entry — `derive` can remove edges, hence the cycles recompute.
            if (field.reconcile) {
                // Merge the just-set value in — getValues is read pre-commit, so it's stale.
                const fieldValues = { ...sel.field.getValues(sdk.document, nodeId), [field.id]: value };

                setDocument(withCyclesRecompute(d => {
                    reducers.node.derive(d, nodeId, fieldValues);
                    reducers.node.validate(d, nodeId);
                    reducers.field.setValue(d, nodeId, field.id, value);
                    reducers.field.clearDependentFields(d, nodeId, field.id);
                }));

                debouncedValidateField(nodeId, field);
                return;
            }

            setDocument(d => {
                reducers.field.setValue(d, nodeId, field.id, value)
                reducers.field.clearDependentFields(d, nodeId, field.id)
            });

            debouncedValidateField(nodeId, field);
        }),
        validate:        (...props) => { setDocument(d => { reducers.field.validate(d, ...props) }) },
        setIsExpression: withCommit((...props) => { setDocument(d => { reducers.field.setIsExpression(d, ...props) }) }),
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
