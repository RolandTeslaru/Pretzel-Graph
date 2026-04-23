import { Foundations } from "@pretzel-graph/shared/domain";
import { InferFields } from "@pretzel-graph/node-sdk";
import { Blueprint, ToolBlueprint } from "./blueprint";

export const reconcile = (
    blueprint: Foundations.Blueprint,
    changedFieldId: keyof InferFields<Foundations.Blueprint>,
    newValue: Foundations.Field.Value,
): Foundations.Blueprint => {
    const fields = new Map(blueprint.fields.map(f => [f.id, f]));

    if(changedFieldId === "isConvertedToTool")
        if(newValue === true)
            return ToolBlueprint;
        else
            return Blueprint;

    return Blueprint
}