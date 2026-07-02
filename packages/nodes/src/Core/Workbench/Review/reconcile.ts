import { Foundations } from "@pretzel-graph/shared/domain";
import { InferFieldValues, FieldBuilder, OutputBuilder } from "@pretzel-graph/node-sdk";
import { cloneDeep } from "lodash";

// Variant-specific field ids removed before re-adding the new variant's set.
const VARIANT_FIELD_IDS = [
    "approveLabel", "rejectLabel",   // confirm
    "options", "multiple", "allowCustom",  // choice
    "formFields",  // form
] as Foundations.Field.Id[];

const asField = (b: unknown) => b as unknown as Foundations.Field;

// Swaps fields + output ports when `variant` changes:
//   confirm → approve/reject labels  → approved | rejected ports
//   choice  → options/multiple/custom → value port (the chosen value(s))
//   form    → form field defs         → values port (collected object)
export const reconcile = (
    blueprint: Foundations.Blueprint,
    changedFieldId: keyof InferFieldValues<Foundations.Blueprint>,
    newValue: Foundations.Field.Value,
): Foundations.Blueprint => {
    const next = cloneDeep(blueprint);
    if (changedFieldId !== "variant") return next;

    const fields = new Map(next.fields.map(f => [f.id, f]));
    VARIANT_FIELD_IDS.forEach(id => fields.delete(id));
    const add = (b: unknown) => { const f = asField(b); fields.set(f.id, f); };

    let outputs: unknown[];
    switch (newValue) {
        case "choice":
            add(FieldBuilder.Json({ id: "options", displayName: "Options", initialValue: [{ label: "Option 1", value: "1" }], tooltip: "Array of { label, value }." }));
            add(FieldBuilder.Boolean({ id: "multiple", displayName: "Allow multiple", initialValue: false }));
            add(FieldBuilder.Boolean({ id: "allowCustom", displayName: "Allow custom answer", initialValue: false }));
            outputs = [OutputBuilder.Data({ id: "value", displayName: "Value", tooltip: "The chosen value(s)." })];
            break;
        case "form":
            add(FieldBuilder.Json({ id: "formFields", displayName: "Form fields", initialValue: [], tooltip: "Field definitions to render in the dialog." }));
            outputs = [OutputBuilder.Data({ id: "values", displayName: "Values", tooltip: "The collected form values." })];
            break;
        case "confirm":
        default:
            add(FieldBuilder.String({ id: "approveLabel", displayName: "Approve label", initialValue: "Approve" }));
            add(FieldBuilder.String({ id: "rejectLabel", displayName: "Reject label", initialValue: "Reject" }));
            outputs = [
                OutputBuilder.Unresolved({ id: "approved", displayName: "Approved", polymorphicGroupId: "data" }),
                OutputBuilder.Unresolved({ id: "rejected", displayName: "Rejected", polymorphicGroupId: "data" }),
            ];
            break;
    }

    // @ts-expect-error rebuild the readonly fields tuple from the working map
    next.fields = [...fields.values()];
    // @ts-expect-error swap the output ports for this variant
    next.outputs = outputs;
    return next;
};
