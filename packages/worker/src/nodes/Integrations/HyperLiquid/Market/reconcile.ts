import { Foundations } from "@pretzel-graph/shared/domain";
import { InferFields } from "src/types";
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
