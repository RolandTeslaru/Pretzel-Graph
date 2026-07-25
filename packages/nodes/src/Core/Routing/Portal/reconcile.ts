import { Foundations } from "@pretzel-graph/shared/domain";
import { InferReconcilingFieldValues, InputBuilder, OutputBuilder } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";

// out → emits a single output, no inputs; in → accepts a single input, no outputs.
export const reconcile = (
    blueprint: Foundations.Blueprint,
    fieldValues: InferReconcilingFieldValues<typeof Blueprint>,
): Foundations.Blueprint => {
    const ui = blueprint.ui as { icon: string };
    if (fieldValues.direction === "out") {
        ui.icon = "PortalOut";
        // @ts-expect-error swap ports: out node has no inputs, one unresolved output
        blueprint.inputs = [];
        // @ts-expect-error
        blueprint.outputs = [OutputBuilder.Unresolved("output", "Output", {
            polymorphicGroupId: "portal"
        })];
    } else {
        ui.icon = "PortalIn";
        // @ts-expect-error swap ports: in node has one unresolved input, no outputs
        blueprint.inputs = [InputBuilder.Unresolved("input", "Input", {
            polymorphicGroupId: "portal"
        })];
        // @ts-expect-error
        blueprint.outputs = [];
    }
    return blueprint;
};
