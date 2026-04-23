import { cloneDeep } from "lodash";
import { ShelfSDK } from "../../ShelfSDK/sdk";
import type { WorkbenchSDKImpl, WorkbenchSDK } from "../sdk";
import { debouncedValidateField, withAsyncCommit, withCommit, withCyclesRecompute } from "../utils/actions";
import type { NodeActions } from "./node";
import type { Foundations, Workflow } from "@pretzel-graph/shared/domain";
import type { DropFirstArg } from "@/SDKs/types";
import { Field } from "@pretzel-graph/shared/domain/Foundations/Field";
import { Port } from "@pretzel-graph/shared/domain/Foundations/Port";

export function createFieldActions(sdk: WorkbenchSDKImpl, nodeActions: NodeActions) {
    const setState = sdk.useStore.setState;
    const reducers = sdk.reducers;
    const sel = sdk.selectors;

    const validateFieldById = (
        nodeId: Workflow.Node.Id,
        fieldId: Foundations.Field.Id
    ) => {
        const field = sel.field.get(sdk.state, nodeId, fieldId)
        if (!field)
            throw new Error(`Field ${fieldId} not found on node ${nodeId}`)

        debouncedValidateField(nodeId, field)
    }

    return {
        setValue: withAsyncCommit(async (nodeId, field, value) => {
            // Core execution-strategy fields: handled locally, no API round-trip.
            if (field.id === "signalDependency") {
                nodeActions.setSignalStrategy(nodeId, value);
                return;
            }

            if (field.reconcile) {
                console.log(`Field ${field.id} requires reconciliation`)

                try {
                    const blueprint = sdk.selectors.node.extractBlueprint(sdk.state, nodeId);
                    if (!blueprint)
                        throw new Error(`Could not extract blueprint from node ${nodeId}`);

                    const fieldValues = sel.field.getValues(sdk.state, nodeId);

                    const reconciledBlueprint = await ShelfSDK.actions.getReconciledBlueprint(
                        blueprint, field.id, value, fieldValues,
                        {
                            onApiFetch: () => {
                                setState(s => { reducers.field.markAsReconciling(s, nodeId, field.id) })
                            }
                        }
                    );

                    setState(withCyclesRecompute(s => {
                        reducers.node.reconcile(s, nodeId, reconciledBlueprint)
                        reducers.field.unmarkAsReconciling(s, nodeId, field.id);
                        reducers.node.validate(s, nodeId);
                    }));
                } catch (error) {
                    throw new Error(`Could not reconcile node ${nodeId} via field ${field.id}. ${error instanceof Error ? error.message : String(error)}`)
                }
            }

            setState(s => { reducers.field.setValue(s, nodeId, field.id, value) });

            debouncedValidateField(nodeId, field);
        }),
        validate: (...props) => { setState(s => { reducers.field.validate(s, ...props) }) },
        variadic: {
            add: withCommit((nodeId, fieldId) => {
                const field = sel.field.get(sdk.state, nodeId, fieldId);
                if (!field || field.groupId === undefined)
                    throw new Error(`Field ${fieldId} not found on node ${nodeId} or is not variadic`)

                const groupId = field.groupId;

                setState(s => {
                    s.isDirty = true;
                    const node = sel.node.get(s, nodeId);
                    const inputs = node.inputs.filter(i => i.groupId === groupId);
                    const outsputs = node.outputs.filter(o => o.groupId === groupId);

                    if (inputs.length > 0) {
                        const newInput = cloneDeep(inputs[inputs.length - 1]);
                        const oldInputId = newInput.id;
                        const oldPolyGroupId = newInput.polymorphicGroupId;

                        const lastIndex = Number(oldInputId.split("_").slice(-1)[0]);
                        const newIndexSufix = "_" + (lastIndex + 1)

                        newInput.polymorphicGroupId = newInput.polymorphicGroupId?.replace(/_[^_]+$/, newIndexSufix) as string;

                        newInput.id = newInput.id.replace(/_[^_]+$/, newIndexSufix) as Port.Input.Id;
                        newInput.displayName = newInput.displayName?.replace(/\d+$/, String(lastIndex + 1))

                        if (oldPolyGroupId !== newInput.polymorphicGroupId && "originalVariant" in newInput && newInput.originalVariant) {
                            (newInput as any).variant = newInput.originalVariant;
                        }

                        node.inputs.push(newInput);
                    }
                    if (outsputs.length > 0) {
                        const newOutput = cloneDeep(outsputs[outsputs.length - 1]);
                        const oldOutputId = newOutput.id;
                        const oldPolyGroupId = newOutput.polymorphicGroupId;

                        const lastIndex = Number(oldOutputId.split("_").slice(-1)[0]);
                        const newIndexSufix = "_" + (lastIndex + 1)

                        newOutput.polymorphicGroupId = newOutput.polymorphicGroupId?.replace(/_[^_]+$/, newIndexSufix) as string;

                        newOutput.id = newOutput.id.replace(/_[^_]+$/, newIndexSufix) as Port.Output.Id;
                        newOutput.displayName = newOutput.displayName?.replace(/\d+$/, String(lastIndex + 1))

                        if (oldPolyGroupId !== newOutput.polymorphicGroupId && "originalVariant" in newOutput && newOutput.originalVariant) {
                            (newOutput as any).variant = newOutput.originalVariant;
                        }

                        node.outputs.push(newOutput);
                    }
                })
            }),
            remove: withCommit((nodeId, fieldId) => {
                const field = sel.field.get(sdk.state, nodeId, fieldId);
                if (!field || field.groupId === undefined)
                    throw new Error(`Field ${fieldId} not found on node ${nodeId} or is not variadic`)

                const groupId = field.groupId;

                setState(s => {
                    s.isDirty = true;
                    const node = sel.node.get(s, nodeId);
                    const inputs = node.inputs.filter(i => i.groupId === groupId);
                    const outputs = node.outputs.filter(o => o.groupId === groupId);

                    if (inputs.length > 1) {
                        const lastInput = inputs[inputs.length - 1];
                        reducers.input.remove(s, nodeId, lastInput.id);
                    }
                    if (outputs.length > 1) {
                        const lastOutput = outputs[outputs.length - 1];
                        const edgeId = s.cache.outputHandlesMap[nodeId]?.[lastOutput.id];
                        if (edgeId)
                            reducers.edge.remove(s, edgeId);
                        const idx = node.outputs.findIndex(o => o.id === lastOutput.id);
                        if (idx !== -1)
                            node.outputs.splice(idx, 1);
                    }
                })
            })
        },
        condition: {
            setLeftValue: withCommit((...props) => {
                const [nodeId, fieldId] = props
                setState(s => { reducers.field.condition.setLeftValue(s, ...props) })
                validateFieldById(nodeId, fieldId)
            }),
            setRightValue: withCommit((...props) => {
                const [nodeId, fieldId] = props
                setState(s => { reducers.field.condition.setRightValue(s, ...props) })
                validateFieldById(nodeId, fieldId)
            }),
            setOperator: withCommit((...props) => {
                const [nodeId, fieldId] = props
                setState(s => { reducers.field.condition.setOperator(s, ...props) })
                validateFieldById(nodeId, fieldId)
            }),
            addRule: withCommit((...props) => {
                const [nodeId, fieldId] = props
                setState(s => { reducers.field.condition.addRule(s, ...props) })
                validateFieldById(nodeId, fieldId)
            }),
            addGroup: withCommit((...props) => {
                const [nodeId, fieldId] = props
                setState(s => { reducers.field.condition.addGroup(s, ...props) })
                validateFieldById(nodeId, fieldId)
            }),
            removeRuleOrGroup: withCommit((...props) => {
                const [nodeId, fieldId] = props
                setState(s => { reducers.field.condition.removeRuleOrGroup(s, ...props) })
                validateFieldById(nodeId, fieldId)
            }),
            changeCombinator: withCommit((...props) => {
                const [nodeId, fieldId] = props
                setState(s => { reducers.field.condition.changeCombinator(s, ...props) })
                validateFieldById(nodeId, fieldId)
            }),
        },
        caseList: {
            addEntry: withCommit((nodeId, fieldId, label) => {
                const portId = Port.Output.Id.parse(crypto.randomUUID())
                const entry = Field.CaseList.createEntry(portId, label)

                setState(s => {
                    reducers.field.caseList.addEntry(s, nodeId, fieldId, entry)

                    const resolvedVariant = sel.port.polymorphism.getResolvedVariantInGroup(s, nodeId, "condition") ?? "Unresolved"

                    reducers.port.addOutput(s, nodeId, {
                        id: portId,
                        displayName: label,
                        variant: resolvedVariant,
                        polymorphicGroupId: "condition",
                        originalVariant: "Unresolved",
                    })
                })

                validateFieldById(nodeId, fieldId)
            }),
            removeEntry: withCommit((nodeId, fieldId, portId) => {
                setState(s => {
                    reducers.field.caseList.removeEntry(s, nodeId, fieldId, portId)
                    reducers.port.removeOutput(s, nodeId, portId)
                })
                validateFieldById(nodeId, fieldId)
            }),
            setLabel: withCommit((nodeId, fieldId, portId, label) => {
                setState(s => {
                    reducers.field.caseList.setLabel(s, nodeId, fieldId, portId, label)
                    reducers.port.setOutputDisplayName(s, nodeId, portId, label)
                })
                validateFieldById(nodeId, fieldId)
            }),
            condition: {
                setLeftValue: withCommit((...props) => {
                    const [nodeId, fieldId] = props
                    setState(s => { reducers.field.caseList.condition.setLeftValue(s, ...props) })
                    validateFieldById(nodeId, fieldId)
                }),
                setRightValue: withCommit((...props) => {
                    const [nodeId, fieldId] = props
                    setState(s => { reducers.field.caseList.condition.setRightValue(s, ...props) })
                    validateFieldById(nodeId, fieldId)
                }),
                setOperator: withCommit((...props) => {
                    const [nodeId, fieldId] = props
                    setState(s => { reducers.field.caseList.condition.setOperator(s, ...props) })
                    validateFieldById(nodeId, fieldId)
                }),
                addRule: withCommit((...props) => {
                    const [nodeId, fieldId] = props
                    setState(s => { reducers.field.caseList.condition.addRule(s, ...props) })
                    validateFieldById(nodeId, fieldId)
                }),
                addGroup: withCommit((...props) => {
                    const [nodeId, fieldId] = props
                    setState(s => { reducers.field.caseList.condition.addGroup(s, ...props) })
                    validateFieldById(nodeId, fieldId)
                }),
                removeRuleOrGroup: withCommit((...props) => {
                    const [nodeId, fieldId] = props
                    setState(s => { reducers.field.caseList.condition.removeRuleOrGroup(s, ...props) })
                    validateFieldById(nodeId, fieldId)
                }),
                changeCombinator: withCommit((...props) => {
                    const [nodeId, fieldId] = props
                    setState(s => { reducers.field.caseList.condition.changeCombinator(s, ...props) })
                    validateFieldById(nodeId, fieldId)
                }),
            },
        },
    } satisfies FieldActions;
}


export type FieldActions = {
    setValue            : (nodeId: Workflow.Node.Id, field: Field, value: any) => void;
    validate            : DropFirstArg<WorkbenchSDK.Reducers['field']['validate']>;
    variadic: {
        add: (nodeId: Workflow.Node.Id, fieldId: Field.Id) => void
        remove: (nodeId: Workflow.Node.Id, fieldId: Field.Id) => void
    }
    condition           : {
        setLeftValue    : (
            nodeId: Workflow.Node.Id,
            fieldId: Field.Id,
            ruleId: Field.Condition.Rule.Id,
            value: string
        ) => void;
        setRightValue   : (
            nodeId: Workflow.Node.Id,
            fieldId: Field.Id,
            ruleId: Field.Condition.Rule.Id,
            value: string
        ) => void;
        setOperator     : (
            nodeId: Workflow.Node.Id,
            fieldId: Field.Id,
            ruleId: Field.Condition.Rule.Id,
            value: Field.Condition.Operator,
            dataType?: Field.Condition.DataType
        ) => void;
        addRule         : (
            nodeId: Workflow.Node.Id,
            fieldId: Field.Id,
            ruleGroupId: Field.Condition.RuleGroup.Id
        ) => void;
        addGroup        : (
            nodeId: Workflow.Node.Id,
            fieldId: Field.Id,
            parentGroupId: Field.Condition.RuleGroup.Id
        ) => void;
        removeRuleOrGroup: (
            nodeId: Workflow.Node.Id,
            fieldId: Field.Id,
            id: Field.Condition.Rule.Id | Field.Condition.RuleGroup.Id,
            parentGroupId: Field.Condition.RuleGroup.Id
        ) => void;
        changeCombinator: (
            nodeId: Workflow.Node.Id,
            fieldId: Field.Id,
            ruleGroupId: Field.Condition.RuleGroup.Id,
            combinator: "AND" | "OR"
        ) => void;
    };
    caseList            : {
        addEntry        : (
            nodeId: Workflow.Node.Id,
            fieldId: Field.Id,
            label: string
        ) => void;
        removeEntry     : (
            nodeId: Workflow.Node.Id,
            fieldId: Field.Id,
            portId: Port.Output.Id
        ) => void;
        setLabel        : (
            nodeId: Workflow.Node.Id,
            fieldId: Field.Id,
            portId: Port.Output.Id,
            label: string
        ) => void;
        condition       : {
            setLeftValue: (
                nodeId: Workflow.Node.Id,
                fieldId: Field.Id,
                portId: Port.Output.Id,
                ruleId: Field.Condition.Rule.Id,
                value: string
            ) => void;
            setRightValue: (
                nodeId: Workflow.Node.Id,
                fieldId: Field.Id,
                portId: Port.Output.Id,
                ruleId: Field.Condition.Rule.Id,
                value: string
            ) => void;
            setOperator: (
                nodeId: Workflow.Node.Id,
                fieldId: Field.Id,
                portId: Port.Output.Id,
                ruleId: Field.Condition.Rule.Id,
                value: Field.Condition.Operator,
                dataType?: Field.Condition.DataType
            ) => void;
            addRule: (
                nodeId: Workflow.Node.Id,
                fieldId: Field.Id,
                portId: Port.Output.Id,
                ruleGroupId: Field.Condition.RuleGroup.Id
            ) => void;
            addGroup: (
                nodeId: Workflow.Node.Id,
                fieldId: Field.Id,
                portId: Port.Output.Id,
                parentGroupId: Field.Condition.RuleGroup.Id
            ) => void;
            removeRuleOrGroup: (
                nodeId: Workflow.Node.Id,
                fieldId: Field.Id,
                portId: Port.Output.Id,
                id: Field.Condition.Rule.Id | Field.Condition.RuleGroup.Id,
                parentGroupId: Field.Condition.RuleGroup.Id
            ) => void;
            changeCombinator: (
                nodeId: Workflow.Node.Id,
                fieldId: Field.Id,
                portId: Port.Output.Id,
                ruleGroupId: Field.Condition.RuleGroup.Id,
                combinator: "AND" | "OR"
            ) => void;
        };
    };
};
