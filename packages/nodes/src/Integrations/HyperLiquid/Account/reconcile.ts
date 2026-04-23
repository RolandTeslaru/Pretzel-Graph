import { Foundations } from "@vx-agent-editor/shared/domain";
import { InferFields } from "@vx-agent-editor/node-sdk";
import { Blueprint, ToolBlueprint } from "./blueprint";

export const reconcile = (
    blueprint: Foundations.Blueprint,
    changedFieldId: keyof InferFields<Foundations.Blueprint>,
    newValue: Foundations.Field.Value,
): Foundations.Blueprint => {
    if (changedFieldId === "isConvertedToTool")
        return newValue === true ? ToolBlueprint : Blueprint;

    return Blueprint;
};
