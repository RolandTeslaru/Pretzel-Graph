import { Foundations } from "@vx-agent-editor/shared/domain";

export const reconcile = (
    blueprint: Foundations.Blueprint,
    _changedFieldId: Foundations.Field.Id,
    _newValue: Foundations.Field.Value,
): Foundations.Blueprint => {
    return blueprint;
}; 