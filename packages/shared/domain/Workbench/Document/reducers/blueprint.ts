import type { Foundations } from "../../../Foundations";
import type { Document } from "../index";

// The blueprints this workflow uses — the bases its nodes reference plus every derived
// variant they resolve to. The shelf keeps the catalogue of what is installed; derivatives
// are folded per workflow and live only here.
export const blueprintReducers: BlueprintReducers = {
    register: (d, blueprint) => {
        d.blueprints[blueprint.id] = blueprint;
    },
    // A derived blueprint keeps its base's `id`, so its reconciled id has to be given.
    registerAs: (d, blueprintId, blueprint) => {
        d.blueprints[blueprintId] = blueprint;
    },
    registerMany: (d, blueprints) => {
        Object.assign(d.blueprints, blueprints);
    },
}

export interface BlueprintReducers {
    register     : (document: Document, blueprint: Foundations.Blueprint) => void;
    registerAs   : (document: Document, blueprintId: Foundations.Blueprint.Id, blueprint: Foundations.Blueprint) => void;
    registerMany : (document: Document, blueprints: Record<Foundations.Blueprint.Id, Foundations.Blueprint>) => void;
}
