import { create } from "zustand"
import { immer } from "zustand/middleware/immer";
import { _createLibraryActions_, type _LibrarySDKActions } from "./actions";
import { _createLibraryReducers_, type _LibrarySDKReducers } from "./reducers";
import { _createLibrarySelectors_, type _LibrarySDKSelectors } from "./selectors";
import { BaseSDK } from "../Base";
import { Workflow, Library } from "@vx-agent-editor/shared/types";
import { SDK } from "../SDKManager";

@SDK("Library")
export class LibrarySDKImpl extends BaseSDK<LibrarySDK.State> {

    constructor() { super() }

    public readonly healthCheckMaxRetries = 5

    public readonly useStore = create<LibrarySDK.State>()(
        immer((set, get) => ({
            workflowMetas: {},
            currentWorkflowId: null,
            projects: {}
        }))
    )

    private _config = {}
    public get config() { return this._config }

    public readonly selectors: LibrarySDK.Selectors = _createLibrarySelectors_()
    public readonly reducers: LibrarySDK.Reducers = _createLibraryReducers_()
    public readonly actions: LibrarySDK.Actions = _createLibraryActions_(this)
}


export const LibrarySDK = SDK.get<LibrarySDKImpl>("Library")




export namespace LibrarySDK {

    export type State = {
        workflowMetas: Record<Workflow.Id, Library.WorkflowMeta>;
        currentWorkflowId: Workflow.Id | null;
        projects: Record<Library.Project.Id, Library.Project>
    }

    export type Selectors = _LibrarySDKSelectors
    export type Actions = _LibrarySDKActions
    export type Reducers = _LibrarySDKReducers
}