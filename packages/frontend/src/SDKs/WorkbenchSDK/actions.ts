import { WorkbenchSDKImpl, WorkbenchSDK } from './sdk';
import type { DropFirstArg } from '../types';
import { debounce } from '../../decorators/debounce';
import { toast } from 'sonner';
import { Foundations, Workbench, Workflow } from '@vx-agent-editor/shared/domain';
import { supabase } from '@/libs/supabase';
import { api } from '../ApiInterceptorSDK';

export function _createWorkbenchActions_(sdk: WorkbenchSDKImpl) {

    const setState = sdk.useStore.setState;
    const reducers = sdk.reducers;

    const commitImmediately = async () => {
        if (sdk.state.isDirty === false) return;
        try {
            console.log("Committing")
            await Workflow.API.commit(supabase, { workflow: sdk.state.workflow })
        } catch (error) {
            toast.error("Could not save to cloud")
        }
        sdk.actions.setDirty(false);
    };

    const commit: () => void = debounce(async () => {
        commitImmediately();
    }, 1000)



    const debouncedValidateField = debounce((nodeId: Workflow.Node.Id, field: Foundations.Field) => {
        setState(s => { reducers.field.validate(s, nodeId, field) });
    }, 300);

    const debouncedValidateInput = debounce((nodeId: Workflow.Node.Id, input: Foundations.Port.Input) => {
        setState(s => { reducers.input.validate(s, nodeId, input) });
    }, 300);

    return {
        commit:                   commit,
        commitImmediately:        commitImmediately,
        node: {
            remove:            (...props) => { setState(s => { reducers.node.remove(s,         ...props) }); commit() },
            create:            (...props) => { setState(s => { reducers.node.create(s,         ...props) }); commit() },
            recreate:          (...props) => { setState(s => { reducers.node.recreate(s,       ...props) }); commit() },
            duplicate:         (...props) => { setState(s => { reducers.node.duplicate(s,      ...props) }); commit() },
            setMinimized:      (...props) => { setState(s => { reducers.node.setMinimized(s,   ...props) }); commit() },
            setFlipped:        (...props) => { setState(s => { reducers.node.setFlipped(s,     ...props) }); commit() },
            setDisplayName:    (...props) => { setState(s => { reducers.node.setDisplayName(s, ...props) }); commit() },
            setDescription:    (...props) => { setState(s => { reducers.node.setDescription(s, ...props) }); commit() },
            validate:          (...props) => { setState(s => { reducers.node.validate(s,       ...props) }) },
            clearIssues:       (...props) => { setState(s => { reducers.node.clearIssues(s,    ...props) }) },
        },
        edge: {
            create:            (conn)     => { setState(s => { reducers.edge.create(s, conn); }); commit() },
            remove:            (edgeId)   => { setState(s => { reducers.edge.remove(s, edgeId) }); commit() }
        },
        field: {
            setValue: async (nodeId, field, value) => {
                if (field.reconcile) {
                    console.log(`Field ${field.id} requires reconciliation`)

                    try {
                        const node = sdk.state.workflow.data.nodes[nodeId];
                        if (!node)
                            throw new Error(`Node ${nodeId} not found`);

                        const { reconciledBlueprint } = await Workbench.API.Field.reconcile(api, {
                            blueprintId: node.blueprintId,
                            fieldId:     field.id,
                            newValue:    value,
                        })

                        setState(s => {
                            reducers.node.reconcile(s, nodeId, reconciledBlueprint)
                        });
                    } catch (error) {
                        toast.error(`Could not reconcile node ${nodeId} via field ${field.id}`)
                    }
                }

                setState(s => { reducers.field.setValue(s, nodeId, field.id, value) });
                debouncedValidateField(nodeId, field);
                commit()
            },
            validate:          (...props) => { setState(s => { reducers.field.validate(s,      ...props) }) },
        },
        input: {
            setValue: (nodeId, input, value) => { 
                setState(s => { reducers.input.setValue(s, nodeId, input.id, value) }); 
                debouncedValidateInput(nodeId, input);
                commit() 
            },
            validate:          (...props) => { setState(s => { reducers.input.validate(s,      ...props) }) },
        },
        history: {
            undo:              ()         => { },
            redo:              ()         => { }
        },
        layout: {
            node: {
                add:           (...props) => { setState(s => { reducers.layout.node.add(s,         ...props) }); commit() },
                remove:        (...props) => { setState(s => { reducers.layout.node.remove(s,      ...props) }); commit() },
                setPosition:   (...props) => { setState(s => { reducers.layout.node.setPosition(s, ...props) }); commit() },
            },
            viewport: {
                set:           (...props) => { setState(s => { reducers.layout.viewport.set(s,         ...props) }); commit() },
                setZoom:       (...props) => { setState(s => { reducers.layout.viewport.setZoom(s,     ...props) }); commit() },
                setPosition:   (...props) => { setState(s => { reducers.layout.viewport.setPosition(s, ...props) }); commit() },
            }
        },
        workflow: {
            setLock:           (...props) => { setState(s => { reducers.workflow.setLock(s,   ...props) }); commit() },
            close:             (...props) => { setState(s => { reducers.workflow.close(s,     ...props) }); commit() },
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
            copy:           (...props) => { setState(s => { reducers.clipboard.copy(s,         ...props) }) },
            copyNode:       (...props) => { setState(s => { reducers.clipboard.copyNode(s,     ...props) }) },
            paste:          (...props) => { setState(s => { reducers.clipboard.paste(s,        ...props) }); commit() },
            clear:          () => { setState(s => { reducers.clipboard.clear(s) }) },
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
    history                 : {
        undo                : () => void;
        redo                : () => void;
    };
}
