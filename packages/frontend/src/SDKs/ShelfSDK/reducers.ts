import { Foundations, Shelf, Workflow } from "@vx-agent-editor/shared/types";
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

    const checkIfDefintionHasHandles = (s: State, definition: Foundations.NodeDefinition, dataTypes: Set<string>) => {
        return Object.values(definition.outputs).some(output => {
            return Array.from(dataTypes).some(
                (type) => output.handleVariants.includes(type as Foundations.HandleVariant)
            )
        })
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
            const definitionIds = drawer.definitionIds?.filter(definitionId => {
                const definition = s.nodeDefinitions[definitionId]
                if (!definition) return false

                const hasDisplayNameCheck = searchQuery ? definition.displayName.toLowerCase().includes(searchQuery.toLowerCase()) : true

                const hasLangChainDataType = dataTypes && dataTypes.size > 0 ? checkIfDefintionHasHandles(s, definition, dataTypes) : true
                return hasDisplayNameCheck && hasLangChainDataType
            })

            if (definitionIds && definitionIds.length > 0) {
                filteredDrawers[_drawerId as Shelf.Drawer.Id] = {
                    ...drawer,
                    definitionIds
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
    setSection: (state: State, section: ShelfSDK.Section) => void,
    searchFilter: {
        setQuery: (state: State, query: string) => void;
        setDataTypes: (state: State, dataTypes: Set<string> | null) => void
        toggleDataType: (state: State, dataType: string) => void
    }
}