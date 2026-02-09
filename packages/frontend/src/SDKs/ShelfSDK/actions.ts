import type { ShelfSDKImpl, ShelfSDK } from "./sdk";
import type { DropFirstArg } from "../types";
import { Shelf } from "@vx-agent-editor/shared/types";
import { toast } from "sonner";
import { api } from "../ApiInterceptorSDK";

export function _createShelfActions_(sdk: ShelfSDKImpl) {
    const setState = sdk.useStore.setState;
    const getState = sdk.useStore.getState;

    return {
        loadSection: async (section) => {
            try {
                const { blueprints } = await Shelf.API.Blueprint.getAllInSection(api, { section })
                console.log("Loaded Blueprints", blueprints)
                setState(s => {
                    s.blueprints = {
                        ...s.blueprints,
                        ...blueprints
                    }
                    s.loadedSections.add(section);
                })
                return true // Return value for TanStack Query (used for deduplication)
            } catch (error) {
                toast.error(`Could not fetch shelf section ${section}. ${JSON.stringify(error)}`)
                return false
            }
        },

        drawer: {
            open: (drawerId: Shelf.Drawer.Id) => {
                setState(s => { sdk.reducers.drawer.open(s, drawerId) });
            },
            close: (drawerId: Shelf.Drawer.Id) => {
                setState(s => { sdk.reducers.drawer.close(s, drawerId) });
            },
            toggle: async (drawerId: Shelf.Drawer.Id) => {
                const state = getState();
                const isOpen = state.openedDrawers.has(drawerId);

                if (isOpen) {
                    // Closing - just update UI
                    setState(s => { sdk.reducers.drawer.close(s, drawerId) });
                } else {
                    // Opening - update UI immediately
                    setState(s => { sdk.reducers.drawer.open(s, drawerId) });
                }
            },
        },

        setSection: (section: ShelfSDK.Section) => setState(s => {
            sdk.reducers.setSection(s, section)
        }),

        searchFilter: {
            setQuery: (...props: Parameters<ShelfSDK.Reducers["searchFilter"]["setQuery"]> extends [any, ...infer Rest] ? Rest : never) =>
                setState(s => { sdk.reducers.searchFilter.setQuery(s, ...props) }),
            setDataTypes: (...props: Parameters<ShelfSDK.Reducers["searchFilter"]["setDataTypes"]> extends [any, ...infer Rest] ? Rest : never) =>
                setState(s => { sdk.reducers.searchFilter.setDataTypes(s, ...props) }),
            toggleDataType: (...props: Parameters<ShelfSDK.Reducers["searchFilter"]["toggleDataType"]> extends [any, ...infer Rest] ? Rest : never) =>
                setState(s => { sdk.reducers.searchFilter.toggleDataType(s, ...props) }),
        }
    } satisfies _ShelfActions
}

export type _ShelfActions = {
    loadSection: (section: "core" | "bundle") => Promise<boolean>;
    drawer: {
        open: (drawerId: Shelf.Drawer.Id) => void;
        close: (drawerId: Shelf.Drawer.Id) => void;
        toggle: (drawerId: Shelf.Drawer.Id) => Promise<void>;
    };
    setSection: (section: ShelfSDK.Section) => void;
    searchFilter: {
        setQuery: DropFirstArg<ShelfSDK.Reducers["searchFilter"]["setQuery"]>;
        setDataTypes: DropFirstArg<ShelfSDK.Reducers["searchFilter"]["setDataTypes"]>;
        toggleDataType: DropFirstArg<ShelfSDK.Reducers["searchFilter"]["toggleDataType"]>;
    };
}