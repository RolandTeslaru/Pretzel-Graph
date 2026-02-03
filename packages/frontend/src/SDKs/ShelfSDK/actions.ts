import type { ShelfSDKImpl, ShelfSDK } from "./sdk";
import type { DropFirstArg } from "../types";

export function _createShelfActions_(sdk: ShelfSDKImpl){
    const setState = sdk.useStore.setState;
    return {
        drawer: {
            open:   (drawerId) => setState(s => { sdk.reducers.drawer.open(s, drawerId) }),
            close:  (drawerId) => setState(s => { sdk.reducers.drawer.close(s, drawerId) }),
            toggle: (drawerId) => setState(s => { sdk.reducers.drawer.toggle(s, drawerId) })
        },
        setSection: (section) => setState(s => {
            sdk.reducers.setSection(s, section)
        }),
        searchFilter: {
            setQuery:       (...props) => setState(s => {sdk.reducers.searchFilter.setQuery(s, ...props)}),
            setDataTypes:   (...props) => setState(s => {sdk.reducers.searchFilter.setDataTypes(s, ...props)}),
            toggleDataType: (...props) => setState(s => {sdk.reducers.searchFilter.toggleDataType(s, ...props)}),
        }
    } satisfies _ShelfActions
}

export type _ShelfActions = {
    drawer: {
        open:   DropFirstArg<ShelfSDK.Reducers["drawer"]["open"]>
        close:  DropFirstArg<ShelfSDK.Reducers["drawer"]["close"]>
        toggle: DropFirstArg<ShelfSDK.Reducers["drawer"]["toggle"]>
    },
    setSection: DropFirstArg<ShelfSDK.Reducers["setSection"]>
    searchFilter: {
        setQuery:       DropFirstArg<ShelfSDK.Reducers["searchFilter"]["setQuery"]>
        setDataTypes:   DropFirstArg<ShelfSDK.Reducers["searchFilter"]["setDataTypes"]>
        toggleDataType: DropFirstArg<ShelfSDK.Reducers["searchFilter"]["toggleDataType"]>
    }
}