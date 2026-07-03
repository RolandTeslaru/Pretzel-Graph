import { Foundations } from "@pretzel-graph/shared/domain";
import { InferFieldValues, FieldBuilder, OutputBuilder } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";

const asField = (b: unknown) => b as unknown as Foundations.Field;

// Variant-specific field ids stripped before adding the selected variant's set.
const VARIANT_FIELD_IDS = [
    "approveLabel", "rejectLabel",         // confirm
    "options", "multiple", "allowCustom",  // choice
    "formFields",                          // form
] as Foundations.Field.Id[];

// Swaps fields + output ports by `variant`:
//   confirm → approve/reject labels → approved|rejected ports
//   choice  → options/multiple/custom → value port
//   form    → form field defs → values port
export const reconcile = (
    blueprint: Foundations.Blueprint,
    fieldValues: InferFieldValues<typeof Blueprint>,
): Foundations.Blueprint => {
    const kept = blueprint.fields.filter(f => !VARIANT_FIELD_IDS.includes(f.id));

    let variantFields: Foundations.Field[];
    let outputs: unknown[];
    switch (fieldValues.variant) {
        case "choice":
            variantFields = [
                asField(FieldBuilder.Json({ id: "options", displayName: "Options", initialValue: [{ label: "Option 1", value: "1" }], tooltip: "Array of { label, value }." })),
                asField(FieldBuilder.Boolean({ id: "multiple", displayName: "Allow multiple", initialValue: false })),
                asField(FieldBuilder.Boolean({ id: "allowCustom", displayName: "Allow custom answer", initialValue: false })),
            ];
            outputs = [OutputBuilder.Data({ id: "value", displayName: "Value", tooltip: "The chosen value(s)." })];
            break;
        case "form":
            variantFields = [asField(FieldBuilder.Json({ id: "formFields", displayName: "Form fields", initialValue: [], tooltip: "Field definitions to render in the dialog." }))];
            outputs = [OutputBuilder.Data({ id: "values", displayName: "Values", tooltip: "The collected form values." })];
            break;
        case "confirm":
        default:
            variantFields = [
                asField(FieldBuilder.String({ id: "approveLabel", displayName: "Approve label", initialValue: "Approve" })),
                asField(FieldBuilder.String({ id: "rejectLabel", displayName: "Reject label", initialValue: "Reject" })),
            ];
            outputs = [
                OutputBuilder.Unresolved({ id: "approved", displayName: "Approved", polymorphicGroupId: "data" }),
                OutputBuilder.Unresolved({ id: "rejected", displayName: "Rejected", polymorphicGroupId: "data" }),
            ];
            break;
    }

    // @ts-expect-error rebuild the readonly fields tuple
    blueprint.fields = [...kept, ...variantFields];
    // @ts-expect-error swap the output ports for this variant
    blueprint.outputs = outputs;
    return blueprint;
};
