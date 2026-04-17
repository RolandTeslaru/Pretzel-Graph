import type { DropFirstArg } from "@/SDKs/types";
import type { WorkbenchSDKImpl, WorkbenchSDK } from "../sdk"
import { withCommit, withCyclesRecompute } from "../utils/actions"

export function createNodeActions(sdk: WorkbenchSDKImpl) {
    const setState = sdk.useStore.setState;
    const reducers = sdk.reducers;

    return {
        recreate:          withCommit((...props) => setState(withCyclesRecompute(s => { reducers.node.recreate(s,          ...props) }))),
        remove:            withCommit((...props) => setState(withCyclesRecompute(s => { reducers.node.remove(s,            ...props) }))),

        create:            withCommit((...props) => setState(s => { reducers.node.create(s,            ...props) })),
        duplicate:         withCommit((...props) => setState(s => { reducers.node.duplicate(s,         ...props) })),
        setDisabled:       withCommit((...props) => setState(s => { reducers.node.setDisabled(s,       ...props) })),
        setMinimized:      withCommit((...props) => setState(s => { reducers.node.setMinimized(s,      ...props) })),
        setFlipped:        withCommit((...props) => setState(s => { reducers.node.setFlipped(s,        ...props) })),
        setDisplayName:    withCommit((...props) => setState(s => { reducers.node.setDisplayName(s,    ...props) })),
        setDescription:    withCommit((...props) => setState(s => { reducers.node.setDescription(s,    ...props) })),
        setSignalStrategy: withCommit((...props) => setState(s => { reducers.node.setSignalStrategy(s, ...props) })),

        validate:          (...props) => { setState(s => { reducers.node.validate(s,       ...props) }) },
        clearIssues:       (...props) => { setState(s => { reducers.node.clearIssues(s,    ...props) }) },
    } satisfies NodeActions;
}

export type NodeActions = {
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
