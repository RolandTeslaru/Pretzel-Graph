import { Foundations } from "@pretzel-graph/shared/domain";
import { InferReconcilingFieldValues } from "@pretzel-graph/node-sdk";
import { Blueprint, ToolBlueprint } from "./blueprint";

export const reconcile = (
    blueprint: Foundations.Blueprint,
    fieldValues: InferReconcilingFieldValues<typeof Blueprint>,
): Foundations.Blueprint =>
    fieldValues.isConvertedToTool === true ? ToolBlueprint : blueprint;
