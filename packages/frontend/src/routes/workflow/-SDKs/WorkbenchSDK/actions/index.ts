import type { WorkbenchSDKImpl, WorkbenchSDK } from '../sdk';
import type { DropFirstArg } from '@/SDKs/types';
import { Workflow } from '@pretzel-graph/shared/domain';
import { Port } from '@pretzel-graph/shared/domain/Foundations/Port';
import { commit, debouncedCommit, withCommit, debouncedValidateInput, withCyclesRecompute } from '../utils/actions';
import { createSubWorkflowActions, type SubWorkflowActions } from './subWorkflow';
import { createNodeActions, type NodeActions } from './node';
import { createFieldActions, type FieldActions } from './field';
import { createToolActions, type ToolActions } from './tool';
import { createWorkflowActions, type WorkflowActions } from './workflow';
import { createDependencyActions, type DependencyActions } from './dependency';
import { clipboardActions } from './clipboard';
import { DialogSDK } from '@/SDKs/DialogSDK';
import React from 'react';

const FullScreenNodePanel = React.lazy(() => import('../ui/NodePanel/fullscreen'));

export function _createWorkbenchActions_(sdk: WorkbenchSDKImpl) {

    const setState = sdk.useStore.setState;
    const reducers = sdk.reducers;

    const nodeActions        = createNodeActions(sdk);
    const fieldActions       = createFieldActions(sdk, nodeActions);
    const toolActions        = createToolActions(sdk, fieldActions);
    const workflowActions    = createWorkflowActions(sdk);
    const subWorkflowActions = createSubWorkflowActions(sdk);
    const dependencyActions  = createDependencyActions(sdk);

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
            addInput:             withCommit((...props) => setState(s => { reducers.port.addInput(s,             ...props) })),
            removeInput:          withCommit((...props) => setState(withCyclesRecompute(s => { reducers.port.removeInput(s,          ...props) }))),
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
            // staticValues are excluded from history (see sdk equality), so a restore would
            // otherwise revert field/input values to a stale snapshot. Re-apply the live
            // values after the structural restore. The corrective set doesn't push history
            // (equality ignores staticValues).
            undo: () => {
                const sv = sdk.state.data.staticValues;
                (sdk.useStore as any).temporal.getState().undo();
                setState(s => { s.data.staticValues = sv });
            },
            redo: () => {
                const sv = sdk.state.data.staticValues;
                (sdk.useStore as any).temporal.getState().redo();
                setState(s => { s.data.staticValues = sv });
            }
        },
        layout: {
            node: {
                add:           withCommit((...props) => setState(s => { reducers.layout.node.add(s,         ...props) })),
                remove:        withCommit((...props) => setState(s => { reducers.layout.node.remove(s,      ...props) })),
                setPosition:   withCommit((...props) => setState(s => { reducers.layout.node.setPosition(s, ...props) })),
            },
            // Viewport is per-user view state — update the store only, no cloud commit.
            // It still rides along to the cloud inside `data` on the next real edit.
            viewport: {
                set:           (...props) => setState(s => { reducers.layout.viewport.set(s,         ...props) }),
                setZoom:       (...props) => setState(s => { reducers.layout.viewport.setZoom(s,     ...props) }),
                setPosition:   (...props) => setState(s => { reducers.layout.viewport.setPosition(s, ...props) }),
            }
        },
        workflow: workflowActions,
        setClickedNodeId:          (nodeId) => setState(s => { reducers.setClickedNodeId(s, nodeId) }),
        setSelectionContextMenu:   (pos) => setState(s => { reducers.setSelectionContextMenu(s, pos) }),
        setPaneContextMenu:        (pos) => setState(s => { reducers.setPaneContextMenu(s, pos) }),
        setDirty:             (value) => setState(s => {
            if (s.isDirty !== value)
                s.isDirty = value;
        }),
        takeSnapshot:         () => { },
        setCurrentDraggedHandle: (handle) => setState({
            draggedHandle: handle
        }),
        clipboard: clipboardActions,
        selection: {
            duplicate: withCommit(() => setState(withCyclesRecompute(s => { reducers.selection.duplicate(s) }))),
            delete:    withCommit(() => setState(withCyclesRecompute(s => { reducers.selection.delete(s) }))),
            disable:   withCommit((...props) => setState(s => { reducers.selection.disable(s, ...props) })),
        },
        subWorkflow: subWorkflowActions,
        dependency: dependencyActions,
        ui: {
            openNodePanelFullscreen: () => {
                DialogSDK.actions.push("fullscreen-node-panel", (props) => (
                    React.createElement(DialogSDK.UnstyledTemplate, { ...props },
                        React.createElement(
                            React.Suspense,
                            { fallback: null },
                            React.createElement(FullScreenNodePanel, { blockTransparency: props.blockTransparency, surfaceStyle: props.surfaceStyle })
                        )
                    )
                ))
            },
            closeNodePanelFullscreen: () => {
                DialogSDK.actions.pop("fullscreen-node-panel")
            },
        },
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
        addInput            : DropFirstArg<WorkbenchSDK.Reducers['port']['addInput']>;
        removeInput         : DropFirstArg<WorkbenchSDK.Reducers['port']['removeInput']>;
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
    setPaneContextMenu           : DropFirstArg<WorkbenchSDK.Reducers['setPaneContextMenu']>;
    setCurrentDraggedHandle : (handle: WorkbenchSDK.Handle | null) => void;
    setDirty                : (dirty: boolean) => void;
    takeSnapshot            : (p: { force?: boolean }) => void;
    clipboard               : {
        copy               : () => Promise<void>;
        copyNode           : (nodeId: Workflow.Node.Id) => Promise<void>;
        paste              : (position?: { x: number, y: number }) => Promise<void>;
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
    subWorkflow: SubWorkflowActions
    dependency: DependencyActions;
    ui: {
        openNodePanelFullscreen: () => void;
        closeNodePanelFullscreen: () => void;
    };
}
