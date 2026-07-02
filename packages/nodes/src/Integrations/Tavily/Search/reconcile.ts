import { Foundations } from "@pretzel-graph/shared/domain";
import { InferFieldValues } from "@pretzel-graph/node-sdk";
import { Blueprint, ToolBlueprint } from "./blueprint";

export const reconcile = (
    blueprint: Foundations.Blueprint,
    changedFieldId: keyof InferFieldValues<Foundations.Blueprint>,
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