import { BaseSDK } from "../Base";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { Foundations, Shelf } from "@vx-agent-editor/shared/types";
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
                core: Shelf.Drawer.SECTIONS.core,
                bundles: Shelf.Drawer.SECTIONS.bundles,
                mcp: []
            },
            selectedSection: "core",
            drawers: Shelf.Drawer.ALL_DRAWERS,
            nodeDefinitions: {},
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
        nodeDefinitions:    Record<Foundations.NodeDefinition.Id, Foundations.NodeDefinition>
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
