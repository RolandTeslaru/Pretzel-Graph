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
import type { Selection } from '@pretzel-graph/shared/domain/Workbench/Document';
import { DialogSDK } from '@pretzel-graph/standard-ui/SDKs/DialogSDK';
import React from 'react';

const FullScreenNodePanel = React.lazy(() => import('../ui/NodePanel/fullscreen'));

// The selection reducers take a Selection, so the canvas drivers are resolved here rather
// than in them.
const getSelection = (sdk: WorkbenchSDKImpl): Selection | null => {
    const selection = sdk.state.lastSelection;

    if (!selection)
        return null;

    return {
        nodeIds: selection.nodes.map(n => n.id as Workflow.Node.Id),
        edgeIds: selection.edges.map(e => e.id as Workflow.Edge.Id),
    };
};

export function _createWorkbenchActions_(sdk: WorkbenchSDKImpl) {

    const setDocument = sdk.setDocument;
    const reducers = sdk.reducers;

    const nodeActions        = createNodeActions(sdk);
    const fieldActions       = createFieldActions(sdk, nodeActions);
    const toolActions        = createToolActions(sdk);
    const workflowActions    = createWorkflowActions(sdk);
    const subWorkflowActions = createSubWorkflowActions(sdk);
    const dependencyActions  = createDependencyActions(sdk);

    return {
        commit:                   commit,
        debouncedCommit:          debouncedCommit,
        node: nodeActions,
        tool: toolActions,
        edge: {
            create:            withCommit((conn)   => setDocument(withCyclesRecompute(d => { reducers.edge.create(d, conn) }))),
            remove:            withCommit((edgeId) => setDocument(withCyclesRecompute(d => { reducers.edge.remove(d, edgeId) }))),
        },
        port: {
            addInput:             withCommit((...props) => setDocument(d => { reducers.port.addInput(d,             ...props) })),
            removeInput:          withCommit((...props) => setDocument(withCyclesRecompute(d => { reducers.port.removeInput(d,          ...props) }))),
            removeOutput:         withCommit((...props) => setDocument(withCyclesRecompute(d => { reducers.port.removeOutput(d,         ...props) }))),
            addOutput:            withCommit((...props) => setDocument(d => { reducers.port.addOutput(d,            ...props) })),
            setOutputDisplayName: withCommit((...props) => setDocument(d => { reducers.port.setOutputDisplayName(d, ...props) })),
        },
        field: fieldActions,
        input: {
            setValue: withCommit((nodeId, input, value) => {
                setDocument(d => { reducers.input.setValue(d, nodeId, input.id, value) });
                debouncedValidateInput(nodeId, input);
            }),
            validate:          (...props) => { setDocument(d => { reducers.input.validate(d,      ...props) }) },
        },
        credential: {
            setInstance:       withCommit((...props) => setDocument(d => { reducers.credential.setInstance(d, ...props) })),
            validate:          (...props) => { setDocument(d => { reducers.credential.validate(d, ...props) }) },
        },
        temporal: {
            // staticValues are excluded from history (see sdk equality), so a restore would
            // otherwise revert field/input values to a stale snapshot. Re-apply the live
            // values after the structural restore. The corrective set doesn't push history
            // (equality ignores staticValues).
            undo: () => {
                const sv = sdk.document.data.staticValues;
                (sdk.useDocument as any).temporal.getState().undo();
                setDocument(d => {
                    d.data.staticValues = sv;
                    d.cache = Workflow.createCache(d.data, d.blueprints);
                });
            },
            redo: () => {
                const sv = sdk.document.data.staticValues;
                (sdk.useDocument as any).temporal.getState().redo();
                setDocument(d => {
                    d.data.staticValues = sv;
                    d.cache = Workflow.createCache(d.data, d.blueprints);
                });
            }
        },
        layout: {
            node: {
                add:           withCommit((...props) => setDocument(d => { reducers.layout.node.add(d,         ...props) })),
                remove:        withCommit((...props) => setDocument(d => { reducers.layout.node.remove(d,      ...props) })),
                setPosition:   withCommit((...props) => setDocument(d => { reducers.layout.node.setPosition(d, ...props) })),
            },
            // Viewport is per-user view state — update the store only, no cloud commit.
            // It still rides along to the cloud inside `data` on the next real edit.
            viewport: {
                set:           (...props) => setDocument(d => { reducers.layout.viewport.set(d,         ...props) }),
                setZoom:       (...props) => setDocument(d => { reducers.layout.viewport.setZoom(d,     ...props) }),
                setPosition:   (...props) => setDocument(d => { reducers.layout.viewport.setPosition(d, ...props) }),
            }
        },
        workflow: workflowActions,
        setClickedNodeId:          (nodeId) => sdk.useStore.setState(s => { sdk.editorReducers.setClickedNodeId(s, nodeId) }),
        setSelectionContextMenu:   (pos) => sdk.useStore.setState(s => { sdk.editorReducers.setSelectionContextMenu(s, pos) }),
        setPaneContextMenu:        (pos) => sdk.useStore.setState(s => { sdk.editorReducers.setPaneContextMenu(s, pos) }),
        setDirty:             (value) => setDocument(d => {
            if (d.isDirty !== value)
                d.isDirty = value;
        }),
        takeSnapshot:         () => { },
        setDraggedPort: (portRef) => sdk.useStore.setState({ draggedPort: portRef }),
        clipboard: clipboardActions,
        selection: {
            duplicate: withCommit(() => {
                const selection = getSelection(sdk);
                if (!selection) return;

                setDocument(withCyclesRecompute(d => { reducers.selection.duplicate(d, selection) }));
            }),
            delete: withCommit(() => {
                const selection = getSelection(sdk);
                if (!selection) return;

                setDocument(withCyclesRecompute(d => { reducers.selection.delete(d, selection) }));
            }),
            disable: withCommit((isDisabled) => {
                const selection = getSelection(sdk);
                if (!selection) return;

                setDocument(d => { reducers.selection.disable(d, selection, isDisabled) });
            }),
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
    credential              : {
        setInstance         : DropFirstArg<WorkbenchSDK.Reducers['credential']['setInstance']>;
        validate            : DropFirstArg<WorkbenchSDK.Reducers['credential']['validate']>;
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
    setClickedNodeId             : DropFirstArg<WorkbenchSDK.EditorReducers['setClickedNodeId']>;
    setSelectionContextMenu      : DropFirstArg<WorkbenchSDK.EditorReducers['setSelectionContextMenu']>;
    setPaneContextMenu           : DropFirstArg<WorkbenchSDK.EditorReducers['setPaneContextMenu']>;
    setDraggedPort          : (portRef: WorkbenchSDK.PortRef | null) => void;
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
