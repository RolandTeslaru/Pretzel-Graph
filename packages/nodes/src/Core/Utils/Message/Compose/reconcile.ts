import { Foundations } from "@pretzel-graph/shared/domain";
import { InferReconcilingFieldValues, FieldBuilder } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";

// Tool role reveals `toolCallId`; other roles are the base blueprint.
export const reconcile = (
    blueprint: Foundations.Blueprint,
    fieldValues: InferReconcilingFieldValues<typeof Blueprint>,
): Foundations.Blueprint => {
    if (fieldValues.role === "Tool") {
        // @ts-expect-error append the Tool-only field to the readonly tuple
        blueprint.fields = [...blueprint.fields, FieldBuilder.String("toolCallId", "Tool Call ID", {
            initialValue: "",
            placeholder: "Required for Tool messages"
        })];
    }
    return blueprint;
};
