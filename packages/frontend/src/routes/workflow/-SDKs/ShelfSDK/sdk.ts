import { BaseSDK } from "@/SDKs/Base";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { Foundations, Shelf } from "@vx-agent-editor/shared/domain";
import { _createShelfActions_, type _ShelfActions } from "./actions";
import { _createShelfSelectors_, type _ShelfSelectors } from "./selectors";
import { _createShelfReducers_, type _ShelfReducers } from "./reducers";
import { enableMapSet } from "immer";
import { SDK } from "@/SDKs/SDKManager";
enableMapSet();

@SDK("Shelf")
export class ShelfSDKImpl extends BaseSDK<ShelfSDK.State> {

    constructor() { super() }

    public readonly useStore: BaseSDK.Store<ShelfSDK.State> = create(
        immer<ShelfSDK.State>(() => ({
            sections: {
                core: Shelf.Drawer.SECTIONS.core,
                bundle: Shelf.Drawer.SECTIONS.bundle,
                mcp: []
            },
            selectedSection: "core",
            drawers: Shelf.Drawer.ALL_DRAWERS,
            blueprints: {},
            filteredDrawers: {},
            loadedSections: new Set<Shelf.Section>(),
            openedDrawers: new Set<Shelf.Drawer.Id>(),
            searchFilter: {
                query: null,
                selectionFilters: new Set<Shelf.Section>(["core"]),
                dataTypes: null
            },
            reconciledBlueprintsCache: {}
        }))
    )

    public readonly selectors: ShelfSDK.Selectors = _createShelfSelectors_();
    public readonly reducers: ShelfSDK.Reducers = _createShelfReducers_(this);
    public readonly actions: ShelfSDK.Actions = _createShelfActions_(this);

}



export const ShelfSDK = SDK.get<ShelfSDKImpl>("Shelf")


export namespace ShelfSDK {
    export type State = {
        sections: Record<Shelf.Section, Shelf.Drawer.Id[]>
        drawers: Record<Shelf.Drawer.Id, Shelf.Drawer>
        blueprints: Record<Foundations.Blueprint.Id, Foundations.Blueprint>
        filteredDrawers: Record<Shelf.Drawer.Id, Shelf.Drawer>
        selectedSection: Shelf.Section
        openedDrawers: Set<Shelf.Drawer.Id>
        loadedSections: Set<Shelf.Section>
        searchFilter: {
            query: string | null,
            selectionFilters: Set<Shelf.Section>
            dataTypes: Set<Foundations.Port.Variant> | null
        },
        reconciledBlueprintsCache: Record<Foundations.Blueprint.ReconciledId, Foundations.Blueprint>
    }

    export type Actions = _ShelfActions
    export type Selectors = _ShelfSelectors
    export type Reducers = _ShelfReducers
}    
