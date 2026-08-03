import type { Foundations } from "@pretzel-graph/shared/domain";
import type { ShelfSDK } from "./sdk";

export function _createShelfSelectors_(){
    return {
        getDerivedBlueprint: (state: ShelfSDK.State, derivedId: Foundations.Blueprint.ReconciledId): Foundations.Blueprint | null => {
            return state.derivedBlueprintsCache[derivedId] ?? null;
        }
    } satisfies _ShelfSelectors
}

export type _ShelfSelectors = {
}
