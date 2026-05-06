import { immer } from "zustand/middleware/immer";
import { BaseSDK } from "../Base";
import { SDK } from "../SDKManager";
import { VersionControl, Workflow } from "@pretzel-graph/shared/domain";
import { createWithEqualityFn } from "zustand/traditional";
import { shallow } from "zustand/shallow";
import { createVersionControlSDKActions, type VersionControlSDKActions } from "./actions";
import { createVersionControlSDKReducers, type VersionControlSDKReducers } from "./reducers";
import { versionControlSDKSelectors, type VersionControlSDKSelectors } from "./selectors";

@SDK("VersionControl")
export class VersionControlSDKImpl extends BaseSDK<VersionControlSDK.State> {
    constructor() { super() }

    public readonly useStore: BaseSDK.Store<VersionControlSDK.State> = createWithEqualityFn(
        immer<VersionControlSDK.State>(() => ({
            currentWorkflowPublications: [],
            activeWorkflows: {},
            subscribedWorkflowId: null,
        })),
        shallow
    )

    public unsubscribers: Array<() => void> = [];

    public readonly reducers: VersionControlSDK.Reducers = createVersionControlSDKReducers(this)
    public readonly actions: VersionControlSDK.Actions = createVersionControlSDKActions(this)
    public readonly selectors: VersionControlSDK.Selectors = versionControlSDKSelectors
}

export const VersionControlSDK = SDK.get<VersionControlSDKImpl>("VersionControl")

export namespace VersionControlSDK {
    export type State = {
        currentWorkflowPublications: VersionControl.Publication.Meta[]
        activeWorkflows: Record<Workflow.Id, VersionControl.Publication.Meta>
        subscribedWorkflowId: Workflow.Id | null
    }

    export type Reducers = VersionControlSDKReducers
    export type Actions = VersionControlSDKActions
    export type Selectors = VersionControlSDKSelectors
}
