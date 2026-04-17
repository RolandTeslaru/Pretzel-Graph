import type { DropFirstArg } from "@/SDKs/types";
import type { WorkbenchSDKImpl, WorkbenchSDK } from "../sdk"
import { withCommit } from "../utils/actions"

export function createWorkflowActions(sdk: WorkbenchSDKImpl) {
    const setState = sdk.useStore.setState;
    const reducers = sdk.reducers;

    return {
        setLock:           withCommit((...props) => setState(s => { reducers.workflow.setLock(s,   ...props) })),
        close:             withCommit((...props) => setState(s => { reducers.workflow.close(s,     ...props) })),
        open:              (...props) => setState(s => { reducers.workflow.open(s,        ...props) }),
        validate:          (...props) => setState(s => { reducers.workflow.validate(s,    ...props) }),
    } satisfies WorkflowActions;
}

export type WorkflowActions = {
    setLock             : DropFirstArg<WorkbenchSDK.Reducers['workflow']['setLock']>;
    close               : DropFirstArg<WorkbenchSDK.Reducers['workflow']['close']>;
    open                : DropFirstArg<WorkbenchSDK.Reducers['workflow']['open']>;
    validate            : DropFirstArg<WorkbenchSDK.Reducers['workflow']['validate']>;
};
