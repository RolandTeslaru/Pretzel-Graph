import { BaseSDK } from "../Base";
import { SDKStore } from "../types";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { Shelf } from "@vx-agent-builder/shared/types";
import { _createShelfActions_, _ShelfActions } from "./actions";
import { _createShelfSelectors_, _ShelfSelectors } from "./selectors";
import { _createShelfReducers_, _ShelfReducers } from "./reducers";
import { fetchShelfData } from "./dummyEndpoint";
import { SanitizationLayer } from "@/SanitizationLayer";
import { enableMapSet } from "immer";
enableMapSet();

export class _ShelfSDK_ extends BaseSDK<ShelfSDK.State> {
    private constructor() {
        super()
        this.initialize();
    }

    public static readonly instance = new _ShelfSDK_();

    public async initialize(){
        try {
            const rawData = await fetchShelfData();
            const shelfData = SanitizationLayer.sanitizeTypesIntoShelf(rawData);
            this.setState({
                sections: shelfData.sections,
                drawers: shelfData.drawers,
                blueprints: shelfData.blueprints,
                filteredDrawers: shelfData.drawers
            })
        } catch (err) {
            console.error("Failed to initialzie ShelfSDK", err)
        }
    }
    
    public readonly useStore: SDKStore<ShelfSDK.State> = create(
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



export const ShelfSDK = _ShelfSDK_.instance;


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
