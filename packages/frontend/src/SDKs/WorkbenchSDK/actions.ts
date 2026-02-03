import { WorkbenchSDKImpl, WorkbenchSDK } from './sdk';
import type { DropFirstArg } from '../types';

export function _createWorkbenchActions_(sdk: WorkbenchSDKImpl) {

    const setState = sdk.useStore.setState;
    const reducers = sdk.reducers;

    return {
        node: {
            remove: (...props) => setState(s => { reducers.node.remove(s, ...props) }),
            create: (...props) => setState(s => { reducers.node.create(s, ...props) }),
            setMinimized: (...props) => setState(s => { reducers.node.setMinimized(s, ...props) }),
            setDisplayName: (...props) => setState(s => { reducers.node.setDisplayName(s, ...props) }),
            setDescription: (...props) => setState(s => { reducers.node.setDescription(s, ...props) }),
        },
        flow: {
            setLock: (value: boolean) => setState(s => {
                s.workflow.locked = value
            }),
        },
        setDirty: (value) => setState(s => { s.isDirty = value }),
        edge: {
            add: (...props) => setState(s => { reducers.edge.add(s, ...props) }),
            remove: (...props) => setState(s => { reducers.edge.remove(s, ...props) })
        },
        input: {
            setValue: (...props) => setState(s => { reducers.input.setValue(s, ...props) }),
            changeOrder: (...props) => setState(s => { reducers.input.changeOrder(s, ...props) }),
            resetOrder: (...props) => setState(s => { reducers.input.resetOrder(s, ...props) }),
        },
        runtime: {
            input: {
                set: (...props) => setState(s => { reducers.runtime.input.set(s, ...props) }),
                clear: (...props) => setState(s => { reducers.runtime.input.clear(s, ...props) }),
                ensure: (...props) => setState(s => { reducers.runtime.input.ensure(s, ...props) })
            }
        },
        history: {
            undo: () => {

            },
            redo: () => {

            }
        },
        setClickedNodeId: (nodeId) => setState(s => { reducers.setClickedNodeId(s, nodeId) }),
        takeSnapshot: () => { },
        copy: () => { },
        paste: () => { },
        setCurrentDraggedHandle: (handle) => setState({
            draggedHandle: handle
        }),
    } satisfies _WorkbenchSDKActions
}

export type _WorkbenchSDKActions = {
    flow: {
        setLock: DropFirstArg<WorkbenchSDK.Reducers['workflow']['setLock']>;
    },
    node: {
        remove: DropFirstArg<WorkbenchSDK.Reducers['node']['remove']>;
        create: DropFirstArg<WorkbenchSDK.Reducers['node']['create']>;
        setMinimized: DropFirstArg<WorkbenchSDK.Reducers['node']['setMinimized']>;
        setDisplayName: DropFirstArg<WorkbenchSDK.Reducers['node']['setDisplayName']>;
        setDescription: DropFirstArg<WorkbenchSDK.Reducers['node']['setDescription']>;
    },
    input: {
        setValue: DropFirstArg<WorkbenchSDK.Reducers['input']['setValue']>;
        changeOrder: DropFirstArg<WorkbenchSDK.Reducers['input']['changeOrder']>;
        resetOrder: DropFirstArg<WorkbenchSDK.Reducers["input"]["resetOrder"]>
    },
    edge: {
        add: DropFirstArg<WorkbenchSDK.Reducers['edge']['add']>;
        remove: DropFirstArg<WorkbenchSDK.Reducers['edge']['remove']>;
    },
    runtime: {
        input: {
            set: DropFirstArg<WorkbenchSDK.Reducers["runtime"]["input"]["set"]>;
            clear: DropFirstArg<WorkbenchSDK.Reducers["runtime"]["input"]["clear"]>;
            ensure: DropFirstArg<WorkbenchSDK.Reducers["runtime"]["input"]["ensure"]>
        }
    }
    setClickedNodeId: DropFirstArg<WorkbenchSDK.Reducers['setClickedNodeId']>;
    setCurrentDraggedHandle: (handle: WorkbenchSDK.Handle | null) => void;
    setDirty: (dirty: boolean) => void;
    takeSnapshot: (p: { force?: boolean }) => void;
    copy: () => void;
    paste: () => void;
    history: {
        undo: () => void;
        redo: () => void;
    }
}