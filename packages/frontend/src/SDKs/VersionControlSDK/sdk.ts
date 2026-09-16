import { immer } from "zustand/middleware/immer";
import { BaseSDK } from "@pretzel-graph/standard-ui/SDKs/Base";
import { SDK } from "@pretzel-graph/standard-ui/SDKs/SDKManager";
import { VersionControl, Workflow } from "@pretzel-graph/shared/domain";
import { createWithEqualityFn } from "zustand/traditional";
import { shallow } from "zustand/shallow";
import { createVersionControlSDKActions, type VersionControlSDKActions } from "./actions";
import { createVersionControlSDKReducers, type VersionControlSDKReducers } from "./reducers";
import { versionControlSDKSelectors, type VersionControlSDKSelectors } from "./selectors";

const ACTIVE_WORKFLOWS_STALE_TIME = 60_000
const PUBLICATIONS_STALE_TIME = 30_000

@SDK("VersionControl")
export class VersionControlSDKImpl extends BaseSDK<VersionControlSDK.State> {
    constructor() { super() }

    public readonly useStore: BaseSDK.Store<VersionControlSDK.State> = createWithEqualityFn(
        immer<VersionControlSDK.State>(() => ({
            currentWorkflowPublications: [],
            activeWorkflows: {},
            subscribedWorkflowId: null,
            selectors: versionControlSDKSelectors,
            reducers: createVersionControlSDKReducers(this),
        })),
        shallow
    )

    public unsubscribers: Array<() => void> = [];

    public readonly actions: VersionControlSDK.Actions = createVersionControlSDKActions(this)

    public readonly query = {
        activeWorkflows: {
            queryKey:  ['version-control', 'active-workflows'] as const,
            queryFn:   () => this.actions.listActiveWorkflows(),
            staleTime: ACTIVE_WORKFLOWS_STALE_TIME,
        },
        activeWorkflow: (workflowId: Workflow.Id) => ({
            queryKey:  ['version-control', 'active-workflow', workflowId] as const,
            queryFn:   () => this.actions.getActiveByWorkflowId(workflowId),
            staleTime: ACTIVE_WORKFLOWS_STALE_TIME,
        }),
        publications: (workflowId: Workflow.Id) => ({
            queryKey:  ['version-control', 'publications', workflowId] as const,
            queryFn:   () => this.actions.list(workflowId),
            staleTime: PUBLICATIONS_STALE_TIME,
            enabled:   Boolean(workflowId),
        }),
    }
}

export const VersionControlSDK = SDK.get<VersionControlSDKImpl>("VersionControl")

export namespace VersionControlSDK {
    export type State = {
        currentWorkflowPublications: VersionControl.Publication.Meta[]
        activeWorkflows: Record<Workflow.Id, VersionControl.Publication.Meta>
        subscribedWorkflowId: Workflow.Id | null
        selectors: VersionControlSDKSelectors
        reducers: VersionControlSDKReducers
    }

    export type Reducers = VersionControlSDKReducers
    export type Actions = VersionControlSDKActions
    export type Selectors = VersionControlSDKSelectors
}
