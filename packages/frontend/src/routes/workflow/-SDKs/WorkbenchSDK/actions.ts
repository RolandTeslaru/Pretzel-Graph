import { WorkbenchSDKImpl, WorkbenchSDK } from './sdk';
import type { DropFirstArg } from '@/SDKs/types';
import { Workflow } from '@pretzel-graph/shared/domain';
import { Port } from '@pretzel-graph/shared/domain/Foundations/Port';
import { Field } from '@pretzel-graph/shared/domain/Foundations/Field';
import { commit, debouncedCommit, withCommit, debouncedValidateInput, withCyclesRecompute } from './utils/actions';
import { createSubWorkflowActions, type SubWorkflowActions } from './actions/subWorkflow';
import { createNodeActions, type NodeActions } from './actions/node';
import { createFieldActions, type FieldActions } from './actions/field';
import { createToolActions, type ToolActions } from './actions/tool';
import { createWorkflowActions, type WorkflowActions } from './actions/workflow';
import { createDependencyActions, type DependencyActions } from './actions/dependency';

export function _createWorkbenchActions_(sdk: WorkbenchSDKImpl) {

    const setState = sdk.useStore.setState;
    const reducers = sdk.reducers;

    const nodeActions = createNodeActions(sdk);
    const fieldActions = createFieldActions(sdk, nodeActions);
    const toolActions = createToolActions(sdk, fieldActions);
    const workflowActions = createWorkflowActions(sdk);
    const subWorkflowActions = createSubWorkflowActions(sdk);
    const dependencyActions = createDependencyActions(sdk);

    return {
        commit:                   commit,
        debouncedCommit:          debouncedCommit,
        node: nodeActions,
        tool: toolActions,
        edge: {
            create:            withCommit((conn)   => setState(withCyclesRecompute(s => { reducers.edge.create(s, conn) }))),
            remove:            withCommit((edgeId) => setState(withCyclesRecompute(s => { reducers.edge.remove(s, edgeId) }))),
        },
        port: {
            removeOutput:         withCommit((...props) => setState(withCyclesRecompute(s => { reducers.port.removeOutput(s,         ...props) }))),
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
        workflow: workflowActions,
        setClickedNodeId:          (nodeId) => setState(s => { reducers.setClickedNodeId(s, nodeId) }),
        setSelectionContextMenu:   (pos) => setState(s => { reducers.setSelectionContextMenu(s, pos) }),
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
            paste:          withCommit((...props) => setState(withCyclesRecompute(s => { reducers.clipboard.paste(s, ...props) }))),
        },
        selection: {
            duplicate: withCommit(() => setState(withCyclesRecompute(s => { reducers.selection.duplicate(s) }))),
            delete:    withCommit(() => setState(withCyclesRecompute(s => { reducers.selection.delete(s) }))),
            disable:   withCommit((...props) => setState(s => { reducers.selection.disable(s, ...props) })),
        },
        subWorkflow: subWorkflowActions,
        dependency: dependencyActions,
    } satisfies _WorkbenchSDKActions
}

export interface _WorkbenchSDKActions {
    commit                  : () => void;
    debouncedCommit         : () => void;
    workflow                : WorkflowActions;
    node                    : NodeActions;
    tool                    : ToolActions;
    field                   : FieldActions;
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
    setClickedNodeId             : DropFirstArg<WorkbenchSDK.Reducers['setClickedNodeId']>;
    setSelectionContextMenu      : DropFirstArg<WorkbenchSDK.Reducers['setSelectionContextMenu']>;
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
    selection: {
        duplicate : () => void;
        delete    : () => void;
        disable   : (isDisabled: boolean) => void;
    }
    subWorkflow: SubWorkflowActions;
    dependency: DependencyActions;
}
