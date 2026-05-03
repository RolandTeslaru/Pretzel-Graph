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

    const checkIfDefintionHasHandles = (s: State, blueprint: Foundations.Blueprint, dataTypes: Set<Foundations.Port.Variant>) => {
        // return blueprint.outputs.some(output => {
        //     return Array.from(dataTypes).some(
        //         (type) => output.handleVariants.includes(type)
        //     )
        // })
    }

    const filterReducer = (s: State) => {
        const dataTypes = s.searchFilter.dataTypes;
        const searchQuery = s.searchFilter.query

        if ((!searchQuery || searchQuery === "") && (!dataTypes || dataTypes.size === 0)) {
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

                const hasDisplayNameCheck = searchQuery ? blueprint.displayName.toLowerCase().includes(searchQuery.toLowerCase()) : true

                const hasHandleVariant = dataTypes && dataTypes.size > 0 ? checkIfDefintionHasHandles(s, blueprint, dataTypes) : true
                return hasDisplayNameCheck && hasHandleVariant
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
            setDataTypes: (s, dataTypes) => {
                s.searchFilter.dataTypes = dataTypes;
                filterReducer(s);
            },
            toggleDataType: (s, dateType) => {
                if (!s.searchFilter.dataTypes)
                    s.searchFilter.dataTypes = new Set();
                if (s.searchFilter.dataTypes.has(dateType)) {
                    s.searchFilter.dataTypes.delete(dateType)
                } else {
                    s.searchFilter.dataTypes.add(dateType)
                }
                filterReducer(s);
            }
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
        setDataTypes: (state: State, dataTypes: Set<Foundations.Port.Variant> | null) => void
        toggleDataType: (state: State, dataType: Foundations.Port.Variant) => void
    }
}