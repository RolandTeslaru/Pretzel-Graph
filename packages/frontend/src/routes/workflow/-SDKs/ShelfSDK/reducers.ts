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

    const blueprintHasVariant = (s: State, blueprint: Foundations.Blueprint, variants: Set<Foundations.Port.Variant>) => {
        // return blueprint.outputs.some(output => {
        //     return Array.from(variants).some(
        //         (type) => output.handleVariants.includes(type)
        //     )
        // })
    }

    const filterReducer = (s: State) => {
        const variants = s.searchFilter.variants;
        const searchQuery = s.searchFilter.query

        if ((!searchQuery || searchQuery === "") && (!variants || variants.size === 0)) {
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

                const hasDisplayNameCheck = searchQuery ? blueprint.ui.displayName.toLowerCase().includes(searchQuery.toLowerCase()) : true

                const hasMatchingVariant = variants && variants.size > 0 ? blueprintHasVariant(s, blueprint, variants) : true
                return hasDisplayNameCheck && hasMatchingVariant
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
            setVariants: (s, variants) => {
                s.searchFilter.variants = variants;
                filterReducer(s);
            },
            toggleVariant: (s, variant) => {
                if (!s.searchFilter.variants)
                    s.searchFilter.variants = new Set();
                if (s.searchFilter.variants.has(variant)) {
                    s.searchFilter.variants.delete(variant)
                } else {
                    s.searchFilter.variants.add(variant)
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
        setVariants: (state: State, variants: Set<Foundations.Port.Variant> | null) => void
        toggleVariant: (state: State, variant: Foundations.Port.Variant) => void
    }
}