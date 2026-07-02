import { Foundations } from "@pretzel-graph/shared/domain";
import { InferFieldValues } from "@pretzel-graph/node-sdk";

import { Blueprint, ToolBlueprint } from "./blueprint";

export const reconcile = (
    blueprint: Foundations.Blueprint,
    changedFieldId: keyof InferFieldValues<Foundations.Blueprint>,
    newValue: Foundations.Field.Value,
): Foundations.Blueprint => {
    if (changedFieldId === "isConvertedToTool")
        return newValue === true ? ToolBlueprint : Blueprint;

    return Blueprint;
};
