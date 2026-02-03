import { BaseSDK } from "../Base";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { Shelf } from "@vx-agent-editor/shared/types";
import { _createShelfActions_, type _ShelfActions } from "./actions";
import { _createShelfSelectors_, type _ShelfSelectors } from "./selectors";
import { _createShelfReducers_, type _ShelfReducers } from "./reducers";
import { enableMapSet } from "immer";
import { SDK } from "../SDKManager";
enableMapSet();

@SDK("Shelf")
export class ShelfSDKImpl extends BaseSDK<ShelfSDK.State> {
    constructor() {
        super()
    }


    public readonly useStore: BaseSDK.Store<ShelfSDK.State> = create(
        immer<ShelfSDK.State>(() => ({
            sections: {
                core: [],
                bundles: [],
                mcp: []
            },
            selectedSection: "core",
            drawers: {},
            blueprints: {},
            filteredDrawers: {},
            openedDrawers: new Set<Shelf.Drawer.Id>(),
            searchFilter: {
                query: null,
                selectionFilters: new Set<ShelfSDK.Section>(["core"]),
                dataTypes: null
            }
        }))
    )

    public readonly selectors: ShelfSDK.Selectors = _createShelfSelectors_();
    public readonly reducers: ShelfSDK.Reducers = _createShelfReducers_(this);
    public readonly actions: ShelfSDK.Actions = _createShelfActions_(this);

} 



export const ShelfSDK = SDK.get<ShelfSDKImpl>("Shelf")


export namespace ShelfSDK {

    export type Section = "core" | "bundles" | "mcp"

    export type State = {
        sections:           Record<Section, Shelf.Drawer.Id[]>
        drawers:            Record<Shelf.Drawer.Id, Shelf.Drawer>
        filteredDrawers:    Record<Shelf.Drawer.Id, Shelf.Drawer>   
        blueprints:         Record<Shelf.Blueprint.Id, Shelf.Blueprint>
        selectedSection:    Section
        openedDrawers:      Set<Shelf.Drawer.Id>
        searchFilter: {
            query: string | null,
            selectionFilters: Set<Section>
            dataTypes: Set<string> | null
        }
    }

    export type Actions = _ShelfActions
    export type Selectors = _ShelfSelectors
    export type Reducers = _ShelfReducers
}    
