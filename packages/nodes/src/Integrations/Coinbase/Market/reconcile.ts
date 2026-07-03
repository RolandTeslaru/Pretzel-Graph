import { Foundations } from "@pretzel-graph/shared/domain";
import { InferFieldValues } from "@pretzel-graph/node-sdk";
import { Blueprint, ToolBlueprint } from "./blueprint";

export const reconcile = (
    blueprint: Foundations.Blueprint,
    fieldValues: InferFieldValues<typeof Blueprint>,
): Foundations.Blueprint =>
    fieldValues.isConvertedToTool === true ? ToolBlueprint : blueprint;
