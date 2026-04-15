import { immer } from "zustand/middleware/immer";
import { _createLibraryActions_, type _LibrarySDKActions } from "./actions";
import { _createLibraryReducers_, type _LibrarySDKReducers } from "./reducers";
import { _createLibrarySelectors_, type _LibrarySDKSelectors } from "./selectors";
import { BaseSDK } from "../Base";
import { Workflow, Library } from "@vx-agent-editor/shared/domain";
import { SDK } from "../SDKManager";
import { createWithEqualityFn } from "zustand/traditional";
import { shallow } from "zustand/shallow";

@SDK("Library")
export class LibrarySDKImpl extends BaseSDK<LibrarySDK.State> {

    constructor() { super() }

    public readonly useStore = createWithEqualityFn<LibrarySDK.State>()(
        immer(() => ({
            folders: {},
            workflowMetas: {},
        })),
        shallow
    )

    private _config = {}
    public get config() { return this._config }

    public readonly selectors: LibrarySDK.Selectors = _createLibrarySelectors_(this)
    public readonly reducers: LibrarySDK.Reducers = _createLibraryReducers_()
    public readonly actions: LibrarySDK.Actions = _createLibraryActions_(this)
}


export const LibrarySDK = SDK.get<LibrarySDKImpl>("Library")

export namespace LibrarySDK {

    export type State = {
        folders: Record<Library.Folder.Id, Library.Folder>;
        workflowMetas: Record<Workflow.Id, Library.WorkflowMeta>;
    }

    export type Selectors = _LibrarySDKSelectors
    export type Actions = _LibrarySDKActions
    export type Reducers = _LibrarySDKReducers
}
