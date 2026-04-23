import { Foundations } from "@pretzel-graph/shared/domain";

export const reconcile = (
    blueprint: Foundations.Blueprint,
    _changedFieldId: Foundations.Field.Id,
    _newValue: Foundations.Field.Value,
): Foundations.Blueprint => {
    return blueprint;
};