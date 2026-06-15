import { Foundations } from "@pretzel-graph/shared/domain";
import { InferFields, InputBuilder, OutputBuilder } from "@pretzel-graph/node-sdk";
import { cloneDeep } from "lodash";
import { Blueprint } from "./blueprint";

export const reconcile = (
    blueprint: Foundations.Blueprint,
    changedFieldId: keyof InferFields<typeof Blueprint>,
    newValue: Foundations.Field.Value,
): Foundations.Blueprint => {
    const next = cloneDeep(blueprint);
    if (changedFieldId !== "direction") return next;

    if (newValue === "out") {
        // @ts-expect-error swap icon for out direction
        next.icon = "PortalOut";
        // @ts-expect-error no inputs when acting as an out node
        next.inputs = [];
        // @ts-expect-error emit unresolved output
        next.outputs = [
            OutputBuilder.Unresolved({
                id: "output",
                displayName: "Output",
                polymorphicGroupId: "portal",
            }),
        ];
    } else {
        // @ts-expect-error restore icon for in direction
        next.icon = "PortalIn";
        // @ts-expect-error restore singular input
        next.inputs = [
            InputBuilder.Unresolved({
                id: "input",
                displayName: "Input",
                polymorphicGroupId: "portal",
            }),
        ];
        // @ts-expect-error no outputs when acting as an in node
        next.outputs = [];
    }

    return next;
};
