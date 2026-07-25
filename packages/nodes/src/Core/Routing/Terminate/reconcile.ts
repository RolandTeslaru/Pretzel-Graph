import { Foundations } from "@pretzel-graph/shared/domain";
import { InferReconcilingFieldValues, FieldBuilder } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";

// error mode reveals `message`; stop is field-less (the base blueprint).
// NOTE: `message` is not in InferReconcilingFieldValues (base-derived), so onRun reads it via a cast.
export const reconcile = (
    blueprint: Foundations.Blueprint,
    fieldValues: InferReconcilingFieldValues<typeof Blueprint>,
): Foundations.Blueprint => {
    if (fieldValues.mode === "error") {
        // @ts-expect-error append the error-only field to the readonly tuple
        blueprint.fields = [...blueprint.fields, FieldBuilder.String("message", "Error Message", {
            multiline: true,
            initialValue: "",
            placeholder: "Workflow terminated."
        })];
    }
    return blueprint;
};
