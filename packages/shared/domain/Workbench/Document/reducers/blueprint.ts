import type { Foundations } from "@pretzel-graph/shared/domain";
import type { WorkbenchSDK } from "../sdk";

// The blueprints this workflow uses — the bases its nodes reference plus every derived
// variant they resolve to. The shelf keeps the catalogue of what is installed; derivatives
// are folded per workflow and live only here.
export const blueprintReducers = {
    register: (s, blueprint) => {
        s.blueprints[blueprint.id] = blueprint;
    },
    // A derived blueprint keeps its base's `id`, so its reconciled id has to be given.
    registerAs: (s, blueprintId, blueprint) => {
        s.blueprints[blueprintId] = blueprint;
    },
    registerMany: (s, blueprints) => {
        Object.assign(s.blueprints, blueprints);
    },
} satisfies BlueprintReducers

export interface BlueprintReducers {
    register     : (s: WorkbenchSDK.State, blueprint: Foundations.Blueprint) => void;
    registerAs   : (s: WorkbenchSDK.State, blueprintId: Foundations.Blueprint.Id, blueprint: Foundations.Blueprint) => void;
    registerMany : (s: WorkbenchSDK.State, blueprints: Record<Foundations.Blueprint.Id, Foundations.Blueprint>) => void;
}
