import type { Foundations } from "@vx-agent-editor/shared/domain";
import type { ShelfSDK } from "./sdk";

export function _createShelfSelectors_(){
    return {
        getReconciledBlueprint: (state: ShelfSDK.State, reconciledId: Foundations.Blueprint.ReconciledId): Foundations.Blueprint | null => {
            return state.reconciledBlueprintsCache[reconciledId] ?? null;
        }
    } satisfies _ShelfSelectors
}

export type _ShelfSelectors = {
}