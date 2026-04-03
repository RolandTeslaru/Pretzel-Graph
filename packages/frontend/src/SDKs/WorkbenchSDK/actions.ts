import { WorkbenchSDKImpl, WorkbenchSDK } from './sdk';
import type { DropFirstArg } from '../types';
import { Foundations, Workflow } from '@vx-agent-editor/shared/domain';
import { api } from '../ApiInterceptorSDK';
import { commit, commitImmediately, withCommit, withAsyncCommit, debouncedValidateField, debouncedValidateInput } from './utils/actions';
import { ShelfSDK } from '../ShelfSDK/sdk';

export function _createWorkbenchActions_(sdk: WorkbenchSDKImpl) {

    const setState = sdk.useStore.setState;
    const reducers = sdk.reducers;
    const sel = sdk.selectors;

    return {
        commit:                   commit,
        commitImmediately:        commitImmediately,
        node: {
            create:            withCommit((...props) => setState(s => { reducers.node.create(s,         ...props) })),
            recreate:          withCommit((...props) => setState(s => { reducers.node.recreate(s,       ...props) })),
            remove:            withCommit((...props) => setState(s => { reducers.node.remove(s,         ...props) })),
            duplicate:         withCommit((...props) => setState(s => { reducers.node.duplicate(s,      ...props) })),
            setDisabled:       withCommit((...props) => setState(s => { reducers.node.setDisabled(s,    ...props) })),
            setMinimized:      withCommit((...props) => setState(s => { reducers.node.setMinimized(s,   ...props) })),
            setFlipped:        withCommit((...props) => setState(s => { reducers.node.setFlipped(s,     ...props) })),
            setDisplayName:    withCommit((...props) => setState(s => { reducers.node.setDisplayName(s, ...props) })),
            setDescription:    withCommit((...props) => setState(s => { reducers.node.setDescription(s, ...props) })),

            validate:          (...props) => { setState(s => { reducers.node.validate(s,       ...props) }) },
            clearIssues:       (...props) => { setState(s => { reducers.node.clearIssues(s,    ...props) }) },
        },
        edge: {
            create:            withCommit((conn)   => setState(s => { reducers.edge.create(s, conn) })),
            remove:            withCommit((edgeId) => setState(s => { reducers.edge.remove(s, edgeId) })),
        },
        field: {
            setValue: withAsyncCommit(async (nodeId, field, value) => {
                if (field.reconcile) {
                    console.log(`Field ${field.id} requires reconciliation`)

                    try {
                        const blueprint = sdk.selectors.extractBlueprint(sdk.state, nodeId);
                        if (!blueprint)
                            throw new Error(`Could not extract blueprint from node ${nodeId}`);

                        const fieldValues = sel.getFieldsStaticValues(sdk.state, nodeId);

                        const reconciledBlueprint = await ShelfSDK.actions.getReconciledBlueprint(
                            blueprint, field.id, value, fieldValues
                        );

                        setState(s => { reducers.node.reconcile(s, nodeId, reconciledBlueprint) });
                    } catch (error) {
                        throw new Error(`Could not reconcile node ${nodeId} via field ${field.id}. ${error instanceof Error ? error.message : String(error)}`)
                    }
                }

                setState(s => { reducers.field.setValue(s, nodeId, field.id, value) });
                debouncedValidateField(nodeId, field);
            }),
            validate:          (...props) => { setState(s => { reducers.field.validate(s,      ...props) }) },
        },
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
    commitImmediately       : () => void;
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
        setDisabled         : DropFirstArg<WorkbenchSDK.Reducers['node']['setDisabled']>;
        setMinimized        : DropFirstArg<WorkbenchSDK.Reducers['node']['setMinimized']>;
        setFlipped          : DropFirstArg<WorkbenchSDK.Reducers['node']['setFlipped']>;
        setDisplayName      : DropFirstArg<WorkbenchSDK.Reducers['node']['setDisplayName']>;
        setDescription      : DropFirstArg<WorkbenchSDK.Reducers['node']['setDescription']>;
        validate            : DropFirstArg<WorkbenchSDK.Reducers['node']['validate']>;
        clearIssues         : DropFirstArg<WorkbenchSDK.Reducers['node']['clearIssues']>;
    };
    field                   : {
        setValue            : (nodeId: Workflow.Node.Id, field: Foundations.Field, value: any) => void;
        validate            : DropFirstArg<WorkbenchSDK.Reducers['field']['validate']>;
    };
    input                   : {
        setValue            : (nodeId: Workflow.Node.Id, input: Foundations.Port.Input, value: any) => void;
        validate            : DropFirstArg<WorkbenchSDK.Reducers['input']['validate']>;
    };
    edge                    : {
        create              : DropFirstArg<WorkbenchSDK.Reducers['edge']['create']>;
        remove              : DropFirstArg<WorkbenchSDK.Reducers['edge']['remove']>;
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
