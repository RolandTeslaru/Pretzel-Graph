import { Foundations, Shelf } from "@pretzel-graph/shared/domain";
import type { ShelfSDKImpl, ShelfSDK } from "./sdk";

export type State = ShelfSDK.State

export function _createShelfReducers_(sdk: ShelfSDKImpl) {

    const drawerReducers = {
        open: (s, drawerId) => {
            s.openedDrawers.add(drawerId)
        },
        close: (s, drawerId) => {
            s.openedDrawers.delete(drawerId)
        },
        toggle: (s, drawerId) => {
            if (s.openedDrawers.has(drawerId))
                drawerReducers.close(s, drawerId)
            else
                drawerReducers.open(s, drawerId)
        }
    } satisfies DrawerReducers

    const filterReducer = (s: State) => {
        const searchQuery = s.searchFilter.query

        if (!searchQuery || searchQuery === "") {
            s.searchFilter.query = null;
            s.filteredDrawers = s.drawers
            s.openedDrawers.clear();
            return;
        }

        const filteredDrawers: typeof s.filteredDrawers = {}

        Object.entries(s.drawers).forEach(([_drawerId, drawer]) => {
            const blueprintIds = drawer.blueprintIds.filter(blueprintId => {
                const blueprint = s.blueprints[blueprintId]
                if (!blueprint)
                    return false

                return searchQuery ? blueprint.ui.displayName.toLowerCase().includes(searchQuery.toLowerCase()) : true
            })

            if (blueprintIds && blueprintIds.length > 0) {
                filteredDrawers[_drawerId as Shelf.Drawer.Id] = {
                    ...drawer,
                    blueprintIds
                }
                s.openedDrawers.add(_drawerId as Shelf.Drawer.Id)
            }
        })

        s.filteredDrawers = filteredDrawers
    }

    return {
        drawer: drawerReducers,
        setSection: (s, section) => {
            s.selectedSection = section

            s.searchFilter.selectionFilters.clear()
            s.searchFilter.selectionFilters.add(section);
        },
        searchFilter: {
            setQuery: (s, query) => {
                s.searchFilter.query = query
                filterReducer(s);
            },
        }
    } satisfies _ShelfReducers
}

type DrawerReducers = {
    open: (state: State, drawerId: Shelf.Drawer.Id) => void;
    close: (state: State, drawerId: Shelf.Drawer.Id) => void;
    toggle: (state: State, drawerId: Shelf.Drawer.Id) => void;
}

export type _ShelfReducers = {
    drawer: DrawerReducers,
    setSection: (state: State, section: Shelf.Section) => void,
    searchFilter: {
        setQuery: (state: State, query: string) => void;
    }
}