import { WorkbenchSDKImpl, WorkbenchSDK } from './sdk';
import type { DropFirstArg } from '../types';
import { Workflow } from '@vx-agent-editor/shared/domain';
import { Port } from '@vx-agent-editor/shared/domain/Foundations/Port';
import { Field } from '@vx-agent-editor/shared/domain/Foundations/Field';
import { commit, debouncedCommit, withCommit, withAsyncCommit, debouncedValidateField, debouncedValidateInput } from './utils/actions';
import { ShelfSDK } from '../ShelfSDK/sdk';
import { cloneDeep } from 'lodash';

export function _createWorkbenchActions_(sdk: WorkbenchSDKImpl) {

    const setState = sdk.useStore.setState;
    const reducers = sdk.reducers;
    const sel = sdk.selectors;

    const validateFieldById = (
        nodeId: Workflow.Node.Id,
        fieldId: Field.Id
    ) => {
        const field = sel.field.get(sdk.state, nodeId, fieldId)
        if (!field)
            throw new Error(`Field ${fieldId} not found on node ${nodeId}`)

        debouncedValidateField(nodeId, field)
    }


    const nodeActions = {
        create:            withCommit((...props) => setState(s => { reducers.node.create(s,            ...props) })),
        recreate:          withCommit((...props) => setState(s => { reducers.node.recreate(s,          ...props) })),
        remove:            withCommit((...props) => setState(s => { reducers.node.remove(s,            ...props) })),
        duplicate:         withCommit((...props) => setState(s => { reducers.node.duplicate(s,         ...props) })),
        setDisabled:       withCommit((...props) => setState(s => { reducers.node.setDisabled(s,       ...props) })),
        setMinimized:      withCommit((...props) => setState(s => { reducers.node.setMinimized(s,      ...props) })),
        setFlipped:        withCommit((...props) => setState(s => { reducers.node.setFlipped(s,        ...props) })),
        setDisplayName:    withCommit((...props) => setState(s => { reducers.node.setDisplayName(s,    ...props) })),
        setDescription:    withCommit((...props) => setState(s => { reducers.node.setDescription(s,    ...props) })),
        setSignalStrategy: withCommit((...props) => setState(s => { reducers.node.setSignalStrategy(s, ...props) })),
        
        validate:          (...props) => { setState(s => { reducers.node.validate(s,       ...props) }) },
        clearIssues:       (...props) => { setState(s => { reducers.node.clearIssues(s,    ...props) }) },
    } satisfies _WorkbenchSDKActions["node"]

    const fieldActions = {
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

                    setState(s => { 
                        reducers.node.reconcile(s, nodeId, reconciledBlueprint)
                        reducers.field.unmarkAsReconciling(s, nodeId, field.id);
                        reducers.node.validate(s, nodeId);
                    });
                } catch (error) {
                    throw new Error(`Could not reconcile node ${nodeId} via field ${field.id}. ${error instanceof Error ? error.message : String(error)}`)
                }
            }

            setState(s => { reducers.field.setValue(s, nodeId, field.id, value) });
            
            debouncedValidateField(nodeId, field);
        }),
        validate:          (...props) => { setState(s => { reducers.field.validate(s,      ...props) }) },
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
                    
                    if(inputs.length > 0){
                        const newInput = cloneDeep(inputs[inputs.length - 1]);
                        const oldInputId = newInput.id;
                        const oldPolyGroupId = newInput.polymorphicGroupId;

                        const lastIndex = Number(oldInputId.split("_").slice(-1)[0]);
                        const newIndexSufix = "_" + (lastIndex + 1)

                        newInput.polymorphicGroupId = newInput.polymorphicGroupId?.replace(/_[^_]+$/, newIndexSufix) as string;

                        newInput.id = newInput.id.replace(/_[^_]+$/, newIndexSufix) as Port.Input.Id;
                        newInput.displayName = `Input ${lastIndex + 1}`

                        // If polymorphicGroupId changed, this port is in a new independent group — reset to unresolved
                        if (oldPolyGroupId !== newInput.polymorphicGroupId && "originalVariant" in newInput && newInput.originalVariant) {
                            (newInput as any).variant = newInput.originalVariant;
                        }

                        node.inputs.push(newInput);
                    }
                    if(outsputs.length > 0){
                        const newOutput = cloneDeep(outsputs[outsputs.length - 1]);
                        const oldOutputId = newOutput.id;
                        const oldPolyGroupId = newOutput.polymorphicGroupId;

                        const lastIndex = Number(oldOutputId.split("_").slice(-1)[0]);
                        const newIndexSufix = "_" + (lastIndex + 1)

                        newOutput.polymorphicGroupId = newOutput.polymorphicGroupId?.replace(/_[^_]+$/, newIndexSufix) as string;

                        newOutput.id = newOutput.id.replace(/_[^_]+$/, newIndexSufix) as Port.Output.Id;
                        newOutput.displayName = `Output ${lastIndex + 1}`

                        // If polymorphicGroupId changed, this port is in a new independent group — reset to unresolved
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

                    if(inputs.length > 1){
                        const lastInput = inputs[inputs.length - 1];
                        reducers.input.remove(s, nodeId, lastInput.id);
                    }
                    if(outputs.length > 1){
                        const lastOutput = outputs[outputs.length - 1];
                        // Remove any edges sourcing from this output
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

                    const resolvedVariant = sel.port.getResolvedVariantInSyncGroup(s, nodeId, "condition") ?? "Unresolved"
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
    } satisfies _WorkbenchSDKActions["field"]

    return {
        commit:                   commit,
        debouncedCommit:          debouncedCommit,
        node: nodeActions,
        tool: {
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
        },
        edge: {
            create:            withCommit((conn)   => setState(s => { reducers.edge.create(s, conn) })),
            remove:            withCommit((edgeId) => setState(s => { reducers.edge.remove(s, edgeId) })),
        },
        port: {
            removeOutput:         withCommit((...props) => setState(s => { reducers.port.removeOutput(s,         ...props) })),
            addOutput:            withCommit((...props) => setState(s => { reducers.port.addOutput(s,            ...props) })),
            setOutputDisplayName: withCommit((...props) => setState(s => { reducers.port.setOutputDisplayName(s, ...props) })),
        },
        field: fieldActions,
        input: {
            setValue: withCommit((nodeId, input, value) => {
                setState(s => { reducers.input.setValue(s, nodeId, input.id, value) });
                debouncedValidateInput(nodeId, input);
            }),
            validate:          (...props) => { setState(s => { reducers.input.validate(s,      ...props) }) },
        },
        temporal: {
            undo:              ()         => { (sdk.useStore as any).temporal.getState().undo() },
            redo:              ()         => { (sdk.useStore as any).temporal.getState().redo() }
        },
        layout: {
            node: {
                add:           withCommit((...props) => setState(s => { reducers.layout.node.add(s,         ...props) })),
                remove:        withCommit((...props) => setState(s => { reducers.layout.node.remove(s,      ...props) })),
                setPosition:   withCommit((...props) => setState(s => { reducers.layout.node.setPosition(s, ...props) })),
            },
            viewport: {
                set:           withCommit((...props) => setState(s => { reducers.layout.viewport.set(s,         ...props) })),
                setZoom:       withCommit((...props) => setState(s => { reducers.layout.viewport.setZoom(s,     ...props) })),
                setPosition:   withCommit((...props) => setState(s => { reducers.layout.viewport.setPosition(s, ...props) })),
            }
        },
        workflow: {
            setLock:           withCommit((...props) => setState(s => { reducers.workflow.setLock(s,   ...props) })),
            close:             withCommit((...props) => setState(s => { reducers.workflow.close(s,     ...props) })),
            open:              (...props) => setState(s => { reducers.workflow.open(s,        ...props) }),
            validate:          (...props) => setState(s => { reducers.workflow.validate(s,    ...props) }),
        },
        setClickedNodeId:     (nodeId) => setState(s => { reducers.setClickedNodeId(s, nodeId) }),
        setDirty:             (value) => setState(s => {
            if (s.isDirty !== value)
                s.isDirty = value;
        }),
        takeSnapshot:         () => { },
        setCurrentDraggedHandle: (handle) => setState({
            draggedHandle: handle
        }),
        clipboard: {
            copy:           (...props) => { setState(s => { reducers.clipboard.copy(s,     ...props) }) },
            copyNode:       (...props) => { setState(s => { reducers.clipboard.copyNode(s, ...props) }) },
            clear:          () => { setState(s => { reducers.clipboard.clear(s) }) },
            paste:          withCommit((...props) => setState(s => { reducers.clipboard.paste(s, ...props) })),
        }
    } satisfies _WorkbenchSDKActions
}

export interface _WorkbenchSDKActions {
    commit                  : () => void;
    debouncedCommit         : () => void;
    workflow                : {
        setLock             : DropFirstArg<WorkbenchSDK.Reducers['workflow']['setLock']>;
        close               : DropFirstArg<WorkbenchSDK.Reducers['workflow']['close']>;
        open                : DropFirstArg<WorkbenchSDK.Reducers['workflow']['open']>;
        validate            : DropFirstArg<WorkbenchSDK.Reducers['workflow']['validate']>;
    };
    node                    : {
        remove              : DropFirstArg<WorkbenchSDK.Reducers['node']['remove']>;
        create              : DropFirstArg<WorkbenchSDK.Reducers['node']['create']>;
        recreate            : DropFirstArg<WorkbenchSDK.Reducers['node']['recreate']>;
        duplicate           : DropFirstArg<WorkbenchSDK.Reducers['node']['duplicate']>;
        setSignalStrategy   : DropFirstArg<WorkbenchSDK.Reducers['node']['setSignalStrategy']>;
        setDisabled         : DropFirstArg<WorkbenchSDK.Reducers['node']['setDisabled']>;
        setMinimized        : DropFirstArg<WorkbenchSDK.Reducers['node']['setMinimized']>;
        setFlipped          : DropFirstArg<WorkbenchSDK.Reducers['node']['setFlipped']>;
        setDisplayName      : DropFirstArg<WorkbenchSDK.Reducers['node']['setDisplayName']>;
        setDescription      : DropFirstArg<WorkbenchSDK.Reducers['node']['setDescription']>;
        validate            : DropFirstArg<WorkbenchSDK.Reducers['node']['validate']>;
        clearIssues         : DropFirstArg<WorkbenchSDK.Reducers['node']['clearIssues']>;
    };
    tool                    : {
        convert             : (nodeId: Workflow.Node.Id) => void;
        revert              : (nodeId: Workflow.Node.Id) => void;
    };
    field                   : {
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
    input                   : {
        setValue            : (nodeId: Workflow.Node.Id, input: Port.Input, value: any) => void;
        validate            : DropFirstArg<WorkbenchSDK.Reducers['input']['validate']>;
    };
    edge                    : {
        create              : DropFirstArg<WorkbenchSDK.Reducers['edge']['create']>;
        remove              : DropFirstArg<WorkbenchSDK.Reducers['edge']['remove']>;
    };
    port                    : {
        removeOutput        : DropFirstArg<WorkbenchSDK.Reducers['port']['removeOutput']>;
        addOutput           : DropFirstArg<WorkbenchSDK.Reducers['port']['addOutput']>;
        setOutputDisplayName: DropFirstArg<WorkbenchSDK.Reducers['port']['setOutputDisplayName']>;
    };
    layout                  : {
        node                : {
            add             : DropFirstArg<WorkbenchSDK.Reducers['layout']['node']['add']>;
            remove          : DropFirstArg<WorkbenchSDK.Reducers['layout']['node']['remove']>;
            setPosition     : DropFirstArg<WorkbenchSDK.Reducers['layout']['node']['setPosition']>;
        };
        viewport            : {
            setZoom         : DropFirstArg<WorkbenchSDK.Reducers['layout']['viewport']['setZoom']>;
            setPosition     : DropFirstArg<WorkbenchSDK.Reducers['layout']['viewport']['setPosition']>;
            set             : DropFirstArg<WorkbenchSDK.Reducers['layout']['viewport']['set']>;
        };
    };
    setClickedNodeId        : DropFirstArg<WorkbenchSDK.Reducers['setClickedNodeId']>;
    setCurrentDraggedHandle : (handle: WorkbenchSDK.Handle | null) => void;
    setDirty                : (dirty: boolean) => void;
    takeSnapshot            : (p: { force?: boolean }) => void;
    clipboard               : {
        copy               : DropFirstArg<WorkbenchSDK.Reducers['clipboard']['copy']>;
        copyNode           : DropFirstArg<WorkbenchSDK.Reducers['clipboard']['copyNode']>;
        paste              : DropFirstArg<WorkbenchSDK.Reducers['clipboard']['paste']>;
        clear              : DropFirstArg<WorkbenchSDK.Reducers['clipboard']['clear']>;
    };
    temporal                 : {
        undo                : () => void;
        redo                : () => void;
    };
}
