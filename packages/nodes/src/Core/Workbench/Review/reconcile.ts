import { Foundations } from "@pretzel-graph/shared/domain";
import { InferReconcilingFieldValues, FieldBuilder, OutputBuilder } from "@pretzel-graph/node-sdk";
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
    fieldValues: InferReconcilingFieldValues<typeof Blueprint>,
): Foundations.Blueprint => {
    const kept = blueprint.fields.filter(f => !VARIANT_FIELD_IDS.includes(f.id));

    let variantFields: Foundations.Field[];
    let outputs: unknown[];
    switch (fieldValues.variant) {
        case "choice":
            variantFields = [
                asField(FieldBuilder.Json("options", "Options", {
                    initialValue: [{ label: "Option 1", value: "1" }],
                    tooltip: "Array of { label, value }."
                })),
                asField(FieldBuilder.Boolean("multiple", "Allow multiple", {
                    initialValue: false
                })),
                asField(FieldBuilder.Boolean("allowCustom", "Allow custom answer", {
                    initialValue: false
                })),
            ];
            outputs = [OutputBuilder.Data("value", "Value", {
                tooltip: "The chosen value(s)."
            })];
            break;
        case "form":
            variantFields = [asField(FieldBuilder.Json("formFields", "Form fields", {
                initialValue: [],
                tooltip: "Field definitions to render in the dialog."
            }))];
            outputs = [OutputBuilder.Data("values", "Values", {
                tooltip: "The collected form values."
            })];
            break;
        case "confirm":
        default:
            variantFields = [
                asField(FieldBuilder.String("approveLabel", "Approve label", {
                    initialValue: "Approve"
                })),
                asField(FieldBuilder.String("rejectLabel", "Reject label", {
                    initialValue: "Reject"
                })),
            ];
            outputs = [
                OutputBuilder.Unresolved("approved", "Approved", {
                    polymorphicGroupId: "data"
                }),
                OutputBuilder.Unresolved("rejected", "Rejected", {
                    polymorphicGroupId: "data"
                }),
            ];
            break;
    }

    // @ts-expect-error rebuild the readonly fields tuple
    blueprint.fields = [...kept, ...variantFields];
    // @ts-expect-error swap the output ports for this variant
    blueprint.outputs = outputs;
    return blueprint;
};
